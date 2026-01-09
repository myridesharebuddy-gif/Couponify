import { fetch } from 'undici';
import { env } from '../env';
import { detectCode, detectDiscount, detectStore } from '../utils/extract';
import { ProviderCache } from '../services/providerCache';
import type { CouponProvider } from './provider';
import { generateCouponId } from '../services/couponRepository';
import type { CouponItem } from '../types/coupon';

const cache = new ProviderCache<CouponItem[]>(60_000);

const parsePost = (subreddit: string, child: any): CouponItem | null => {
  const data = child.data;
  if (!data) return null;
  const link = typeof data.url === 'string' ? data.url : undefined;
  if (!link) return null;
  const title = data.title ?? 'Untitled deal';
  const description = data.selftext || data.body || undefined;
  const sourceId = data.id;
  const postedAtISO = new Date((data.created_utc ?? data.created) * 1000).toISOString();
  const storeName = detectStore(title) ?? detectStore(description);
  const store =
    storeName !== undefined
      ? { id: storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: storeName, website: link }
      : null;
  const discountText = detectDiscount(title) ?? detectDiscount(description);
  const code = detectCode(title) ?? detectCode(description);

  return {
    id: generateCouponId('reddit', `${subreddit}:${sourceId}`, link),
    source: 'reddit',
    sourceId,
    title,
    description,
    store,
    storeNameSnapshot: storeName ?? undefined,
    storeWebsiteSnapshot: store?.website ?? undefined,
    storeId: store?.id ?? 'unknown',
    category: data.link_flair_text ?? undefined,
    discountText,
    code,
    link,
    postedAtISO,
    expiresAtISO: undefined,
    verifiedUp: data.ups ?? 0,
    verifiedDown: data.downs ?? 0,
    status: 'ACTIVE'
  };
};

export const redditProvider: CouponProvider = {
  id: 'reddit',
  name: 'Reddit communities',
  fetchLatest: async () => {
    const collected: CouponItem[] = [];
    await Promise.all(
      env.redditSubreddits.map(async (subreddit) => {
        const cacheKey = `reddit:${subreddit}`;
        const cached = cache.get(cacheKey);
        if (cached) {
          collected.push(...cached);
          return;
        }
        const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=100`;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Couponify/1.0 (https://couponify.dev)' }
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as any;
        const children = (payload?.data?.children ?? []) as any[];
        const items = children
          .map((child) => parsePost(subreddit, child))
          .filter((item): item is CouponItem => Boolean(item));
        cache.set(cacheKey, items);
        collected.push(...items);
      })
    );
    return collected;
  }
};
