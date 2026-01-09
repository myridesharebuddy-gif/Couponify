import Parser from 'rss-parser';
import { fetch } from 'undici';
import pLimit from 'p-limit';
import { getFeedConfig } from './config';
import {
  canonicalizeUrl,
  dedupeKey,
  extractCode,
  extractDomain,
  normalizeText,
  summarizeText
} from './utils';
import { getDb } from '../db';
import { resolveStoreFromDomain } from './storeRegistry';
import { computeScores } from './scorer';
import { NormalizedCouponRecord, upsertNormalizedCoupon } from '../services/normalizedCouponRepository';
import crypto from 'crypto';

const parser = new Parser();

const fetchFeed = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return parser.parseString(await response.text());
};

const normalizeFeedItem = (item: Parser.Item, sourceId: string, trustWeight: number): NormalizedCouponRecord => {
  const canonical = canonicalizeUrl(item.link ?? '');
  const domain = extractDomain(canonical);
  const store = resolveStoreFromDomain(domain);
  const rawTitle = item.title ?? item.contentSnippet ?? '';
  const normalizedTitle = normalizeText(rawTitle);
  const code =
    extractCode(rawTitle) || extractCode(item.contentSnippet ?? '') || extractCode(item.content ?? '');
  const dedupe = dedupeKey(store?.id ?? 'unknown', code, canonical, normalizedTitle);
  const storeId = store?.id ?? 'unknown';
  const status = store ? 'active' : 'needs_review';
  const summary = summarizeText(rawTitle);
  const createdAt = item.pubDate ?? new Date().toISOString();
  const expiresAt = item.isoDate ?? item.pubDate ?? null;
  const scores = computeScores({
    trustWeight,
    createdAt,
    expiresAt,
    code,
    consensus: 1,
    storePopularity: store?.popularityWeight,
    isUnknownStore: !Boolean(store)
  });
  return {
    id: `${sourceId}:${item.guid ?? canonical}`,
    store: store?.name ?? 'Unknown store',
    storeId,
    domain,
    deal: summary,
    title: rawTitle || summary,
    code,
    source: sourceId,
    sourceUrl: canonical,
    canonicalUrl: canonical,
    createdAt,
    expiresAt,
    trustWeight,
    status,
    confidenceScore: scores.confidenceScore,
    hotScore: scores.hotScore,
    verifiedScore: scores.verifiedScore,
    dedupeKey: dedupe,
    consensus: 1,
    votesWorked: 0,
    votesFailed: 0,
    confidenceReasons: scores.confidenceReasons,
    views: 0,
    saveCount: 0,
    copyCount: 0,
    verifiedCount: 0,
    reportCount: 0
  };
};

export type IngestionStats = {
  sourceId: string;
  fetched: number;
  inserted: number;
  duplicates: number;
};

export const ingestSources = async () => {
  const config = getFeedConfig();
  type FeedSource = (typeof config.sources)[number];
  const rssSources = config.sources.filter(
    (source): source is FeedSource & { url: string } => source.type === 'rss' && !!source.url
  );
  const limit = pLimit(3);
  const summaries = await Promise.all(
    rssSources.map((source) =>
      limit(async (): Promise<IngestionStats> => {
        let fetchedCount = 0;
        let insertedCount = 0;
        let duplicateCount = 0;
        try {
          const feed = await fetchFeed(source.url);
          const items = feed.items ?? [];
          for (const item of items) {
            const record = normalizeFeedItem(item, source.id, source.trust);
            const result = await upsertNormalizedCoupon(record);
            if (result.inserted) {
              insertedCount += 1;
            }
            if (result.duplicate) {
              duplicateCount += 1;
            }
            fetchedCount += 1;
          }
        } catch (error) {
          console.error(`Ingestion failed for ${source.id}`, error);
        }
        await recordIngestionHistory({
          sourceId: source.id,
          fetched: fetchedCount,
          inserted: insertedCount,
          duplicates: duplicateCount
        });
        return { sourceId: source.id, fetched: fetchedCount, inserted: insertedCount, duplicates: duplicateCount };
      })
    )
  );
  return summaries;
};

const recordIngestionHistory = async (entry: {
  sourceId: string;
  fetched: number;
  inserted: number;
  duplicates: number;
}) => {
  const db = await getDb();
  await db.run(
    `
      INSERT INTO ingestion_history (
        id, runAt, sourceId, fetched, inserted, duplicates
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    crypto.randomUUID(),
    new Date().toISOString(),
    entry.sourceId,
    entry.fetched,
    entry.inserted,
    entry.duplicates
  );
};
