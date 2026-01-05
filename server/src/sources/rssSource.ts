import type { SourceConnector } from './source';
import { fetchRssFeed } from '../utils/rss';
import { normalizeCoupon } from '../normalization/normalizeCoupon';
import { extractCodeFromText, buildDealFromItem } from './utils';
import { matchStoreFromHint } from '../utils/storeMatch';

type RssSourceConfig = {
  id: string;
  displayName: string;
  urls: string[];
  confidence?: number;
};

export const createRssSource = (config: RssSourceConfig): SourceConnector => ({
  id: config.id,
  displayName: config.displayName,
  fetch: async () => {
    const coupons = [];
    for (const url of config.urls) {
      const feed = await fetchRssFeed(url);
      const items = feed.items ?? [];
      for (const item of items) {
        const text = [item.title, item.contentSnippet, item.content, item.summary].filter(Boolean).join(' ');
        const code = extractCodeFromText(text);
        if (!code) continue;
        const deal = buildDealFromItem(item.title, item.summary ?? item.contentSnippet);
        if (!deal) continue;
        const storeMatch = await matchStoreFromHint(item.title, item.link);
        const storeName = storeMatch?.name ?? storeMatch?.domain ?? 'Unknown store';
        const domain = storeMatch?.domain ?? item.link ?? feed.link ?? '';
        const normalized = normalizeCoupon({
          store: storeName,
          domain,
          deal,
          code,
          source: config.displayName,
          sourceUrl: item.link ?? url,
          createdAt: item.isoDate,
          confidence: config.confidence
        });
        if (normalized) {
          coupons.push(normalized);
        }
      }
    }
    return coupons;
  }
});
