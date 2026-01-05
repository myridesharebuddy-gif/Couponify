import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalCoupon } from '../types/localCoupon';
import { StoreRecord } from '../types/store';

const CLEAN_REGEX = /[^a-z0-9\s]/gi;
const MULTIPLE_SPACE_REGEX = /\s+/g;

export const LOCAL_COUPONS_KEY = 'userCoupons';
const CUSTOM_STORES_KEY = 'customStores';

export const normalizeStoreName = (value?: string) => {
  if (!value) {
    return '';
  }
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/’/g, "'")
    .replace(CLEAN_REGEX, ' ')
    .replace(MULTIPLE_SPACE_REGEX, ' ')
    .trim();
};

export const slugifyStoreId = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 40);

const buildCustomStoreRecord = (name: string, categories: string[]): StoreRecord => {
  const normalized = normalizeStoreName(name);
  const slug = slugifyStoreId(name);
  return {
    id: slug || `custom-${Date.now().toString(36)}`,
    slug,
    category: categories[0],
    name,
    website: '',
    domain: slug || name,
    domains: [],
    country: 'US',
    popularityWeight: 0,
    categories,
    aliases: normalized ? [normalized, name.toLowerCase()] : [],
    createdAt: new Date().toISOString()
  };
};

export const loadCustomStores = async () => {
  try {
    const stored = await AsyncStorage.getItem(CUSTOM_STORES_KEY);
    return stored ? (JSON.parse(stored) as StoreRecord[]) : [];
  } catch (error) {
    console.error('Failed to load custom stores', error);
    return [];
  }
};

export const persistCustomStores = async (stores: StoreRecord[]) => {
  try {
    await AsyncStorage.setItem(CUSTOM_STORES_KEY, JSON.stringify(stores));
  } catch (error) {
    console.error('Failed to save custom stores', error);
  }
};

export const ensureCustomStore = async (name: string, category: string) => {
  const normalized = normalizeStoreName(name);
  if (!normalized) {
    return null;
  }
  const existing = await loadCustomStores();
  const match = existing.find((store) => normalizeStoreName(store.name) === normalized);
  if (match) {
    if (!match.categories?.includes(category)) {
      match.categories = [...(match.categories ?? []), category];
      await persistCustomStores(existing);
    }
    return match;
  }
  const record = buildCustomStoreRecord(name, [category]);
  const updated = [...existing, record];
  await persistCustomStores(updated);
  return record;
};

export const filterCouponsByStore = (coupons: LocalCoupon[], storeName?: string) => {
  const target = normalizeStoreName(storeName);
  if (!target) {
    return [];
  }
  return coupons.filter((coupon) => normalizeStoreName(coupon.store) === target);
};

export const dedupeStores = (stores: StoreRecord[] = []) => {
  const seen = new Map<string, StoreRecord>();
  stores.forEach((store) => {
    const key = normalizeStoreName(store.name);
    if (!key || seen.has(key)) {
      return;
    }
    seen.set(key, store);
  });
  return Array.from(seen.values());
};

export const loadLocalCoupons = async () => {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_COUPONS_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored) as LocalCoupon[];
  } catch (error) {
    console.error('Failed to load local coupons', error);
    return [];
  }
};
