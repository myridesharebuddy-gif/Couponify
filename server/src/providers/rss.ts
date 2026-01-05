import Parser from 'rss-parser';
import { ProviderCache } from '../services/providerCache';
import type { CouponProvider } from './provider';
import { generateCouponId } from '../services/couponRepository';
import type { CouponItem } from '../types/coupon';
import { detectCode, detectDiscount, detectStore } from '../utils/extract';
import { env } from '../env';

const parser = new Parser();
const cache = new ProviderCache<CouponItem[]>(120_000);

const parseItem = (sourceId: string, item: Parser.Item): CouponItem | null => {
  if (!item.link || !item.pubDate || !item.title) {
    return null;
  }
  const storeName = detectStore(item.title) ?? detectStore(item.content);
  const store =
    storeName !== undefined
      ? { id: storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: storeName, website: item.link }
      : null;
  const discountText = detectDiscount(item.title) ?? detectDiscount(item.content);
  const code = detectCode(item.title) ?? detectCode(item.content);
  return {
    id: generateCouponId('rss', sourceId, item.link),
    source: 'rss',
    sourceId,
    title: item.title,
    description: item.contentSnippet ?? item.content ?? undefined,
    store,
    storeNameSnapshot: storeName ?? undefined,
    storeWebsiteSnapshot: store?.website ?? undefined,
    storeId: store?.id ?? 'unknown',
    category: item.categories?.[0] ?? undefined,
    discountText,
    code,
    link: item.link,
    postedAtISO: new Date(item.isoDate ?? item.pubDate ?? Date.now()).toISOString(),
    expiresAtISO: item.isoDate ? new Date(item.isoDate).toISOString() : undefined,
    verifiedUp: 0,
    verifiedDown: 0,
    status: 'ACTIVE'
  };
};

export const rssProvider: CouponProvider = {
  id: 'rss',
  name: 'RSS feeds',
  fetchLatest: async () => {
    const collected: CouponItem[] = [];
    await Promise.all(
      env.rssFeeds.map(async (feedUrl) => {
        const cacheKey = `rss:${feedUrl}`;
        const cached = cache.get(cacheKey);
        if (cached) {
          collected.push(...cached);
          return;
        }
        try {
          const feed = await parser.parseURL(feedUrl);
          const items = (feed.items ?? [])
            .map((item, index) => parseItem(`${feedUrl}:${index}`, item))
            .filter((item): item is CouponItem => Boolean(item));
          cache.set(cacheKey, items);
          collected.push(...items);
        } catch {
          // swallow
        }
      })
    );
    return collected;
  }
};
