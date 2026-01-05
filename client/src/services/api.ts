import type { DealItem } from '../types/coupon';
import type { StoreRecord } from '../types/store';
import { getDeviceId } from './deviceId';
import { apiClient, ApiResult } from '../lib/apiClient';
import { getApiBaseUrl } from '../config/apiBase';
import { getStores } from '../lib/couponsRepo';
import type { StoreRecord as SupabaseStoreRecord } from '../lib/couponsRepo';
import { slugifyStoreId } from '../utils/storeHelpers';

const buildQueryString = (params: Record<string, any>) => {
  const entries: string[] = [];
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    if (Array.isArray(value)) {
      if (!value.length) {
        return;
      }
      entries.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.join(','))}`);
      return;
    }
    entries.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  });
  return entries.join('&');
};

const getApiBase = () => {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(
      'API base URL is not configured. Run `npm run set:dev-ip` or set EXPO_PUBLIC_API_BASE_URL in client/.env (e.g. http://192.168.4.27:4000).'
    );
  }
  return base.replace(/\/+$/, '');
};

const buildUrl = (path: string, params?: Record<string, any>) => {
  const base = getApiBase();
  const endpoint = `${base}/api/${path.replace(/^\/+/, '')}`;
  const query = params ? buildQueryString(params) : '';
  return query ? `${endpoint}?${query}` : endpoint;
};

const assertResult = <T>(result: ApiResult<T>, fallback: string) => {
  if (!result.ok) {
    throw new Error(result.message ?? fallback);
  }
  return result.data;
};

export type DealsResponse = {
  items: DealItem[];
  nextCursor: string | null;
};

type FetchDealsParams = {
  q?: string;
  storeId?: string;
  sort?: 'hot' | 'new' | 'expiring' | 'verified';
  limit?: number;
  cursor?: string;
};

export const fetchDeals = async (params?: FetchDealsParams) => {
  const url = buildUrl('deals', params ?? {});
  const result = await apiClient<DealsResponse>(url);
  return assertResult(result, 'Unable to load deals');
};

export const fetchRecommendedDeals = async (params?: FetchDealsParams) => {
  const url = buildUrl('deals/recommended', params ?? {});
  const deviceId = await getDeviceId();
  const result = await apiClient<DealsResponse>(
    url,
    {
      headers: {
        'x-device-id': deviceId
      }
    }
  );
  return assertResult(result, 'Unable to load personalized deals');
};

type DigestParams = {
  limit?: number;
  stores?: string[];
};

export const fetchDigestDeals = async (params?: DigestParams) => {
  const url = buildUrl('deals/digest', params ?? {});
  const result = await apiClient<{ items: DealItem[] }>(url);
  return assertResult(result, 'Unable to load digest');
};

export type PreferencePayload = {
  favoriteStores?: string[];
  blockedStores?: string[];
  watchlist?: string[];
  notifyOnStoreDrops?: boolean;
};

const withDeviceHeaders = async (options: RequestInit = {}) => {
  const deviceId = await getDeviceId();
  const headers = {
    ...(options.headers ?? {}),
    'x-device-id': deviceId
  };
  return { ...options, headers };
};

export const fetchPreferences = async () => {
  const options = await withDeviceHeaders();
  const result = await apiClient<PreferencePayload>(buildUrl('me/preferences'), options);
  return assertResult(result, 'Unable to load preferences');
};

export const updatePreferences = async (payload: PreferencePayload) => {
  const options = await withDeviceHeaders({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await apiClient<PreferencePayload>(buildUrl('me/preferences'), options);
  return assertResult(result, 'Unable to update preferences');
};

export const recordDealCopy = async (id: string) => {
  const result = await apiClient<{ ok: true }>(buildUrl(`deals/${id}/copy`), { method: 'POST' });
  return assertResult(result, 'Unable to record copy');
};

export const reportDeal = async (id: string) => {
  const result = await apiClient<{ ok: true }>(buildUrl(`deals/${id}/report`), { method: 'POST' });
  return assertResult(result, 'Unable to report deal');
};

export const verifyDeal = async (id: string) => {
  const result = await apiClient<{ ok: true }>(buildUrl(`deals/${id}/verify`), { method: 'POST' });
  return assertResult(result, 'Unable to verify deal');
};

export type SourceStatus = {
  id: string;
  displayName: string;
  lastFetchedAt: string | null;
  itemsFetched: number;
  inserted: number;
  duplicates: number;
};

export const fetchSources = async () => {
  const result = await apiClient<SourceStatus[]>(buildUrl('sources'));
  return assertResult(result, 'Unable to load source health');
};

const toLegacyStoreRecord = (store: SupabaseStoreRecord): StoreRecord => {
  const slug = store.slug || slugifyStoreId(store.name);
  const domain = slug || store.name;
  return {
    id: store.id,
    name: store.name,
    slug,
    category: store.category,
    website: '',
    domain,
    domains: [],
    country: 'US',
    popularityWeight: 0,
    categories: store.category ? [store.category] : [],
    aliases: slug ? [slug] : [],
    createdAt: new Date().toISOString()
  };
};

export const fetchStores = async () => {
  const groups = await getStores();
  const stores = groups.flatMap((group) =>
    group.stores.map((store) => toLegacyStoreRecord(store))
  );
  const sorted = [...stores].sort((a, b) => a.name.localeCompare(b.name));
  return {
    items: sorted,
    total: sorted.length,
    page: 1,
    pageSize: sorted.length
  };
};

export const fetchStoreDetail = async (id: string) => {
  const result = await apiClient<{ data: StoreRecord }>(buildUrl(`stores/${id}`));
  const payload = assertResult(result, 'Store not found');
  return payload.data;
};

export const submitUserCoupon = async (payload: {
  website: string;
  code: string;
  deal?: string;
  notes?: string;
}) => {
  const result = await apiClient<{ ok: true }>(
    buildUrl('submissions'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );
  return assertResult(result, 'Submission failed');
};

export type CommunityCouponsResponse = {
  items: DealItem[];
  nextCursor: string | null;
};

export const fetchCommunityCoupons = async (
  sort: 'new' | 'hot',
  cursor?: string
) => {
  const query: Record<string, any> = {
    sort,
    limit: 20
  };
  if (cursor) {
    query.cursor = cursor;
  }
  const result = await apiClient<CommunityCouponsResponse>(buildUrl('coupons', query));
  return assertResult(result, 'Unable to load community coupons');
};

export const submitCommunityCoupon = async (payload: {
  store: string;
  code: string;
  expiresAt?: string;
}) => {
  const result = await apiClient<{ ok: true; coupon: DealItem }>(
    buildUrl('coupons'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );
  return assertResult(result, 'Unable to share coupon');
};
