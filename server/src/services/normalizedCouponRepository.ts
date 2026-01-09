import { getDb } from '../db';
import { canonicalizeUrl, dedupeKey, extractDomain } from '../feed/utils';
import { getStoreRegistry } from '../feed/config';
import type { NormalizedCoupon } from '../types/normalizedCoupon';
import type { NormalizedFeedCoupon } from '../types/normalizedFeedCoupon';
import { computeScores } from '../feed/scorer';

type DatabaseClient = Awaited<ReturnType<typeof getDb>>;

const storePopularityCache = new Map<string, number>();

const getStorePopularity = (storeId: string) => {
  if (!storePopularityCache.size) {
    for (const store of getStoreRegistry()) {
      storePopularityCache.set(store.id, store.popularityWeight ?? 0);
    }
  }
  return storePopularityCache.get(storeId) ?? 0;
};

const parseJsonArray = <T>(value: unknown, fallback: T[]): T[] => {
  if (typeof value !== 'string') {
    return fallback;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export type NormalizedCouponRecord = {
  id: string;
  store: string;
  storeId: string;
  domain: string;
  title: string;
  deal: string;
  code: string;
  source: string;
  sourceUrl: string;
  canonicalUrl: string;
  dedupeKey: string;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string | null;
  trustWeight: number;
  confidenceScore: number;
  hotScore: number;
  verifiedScore: number;
  consensus: number;
  votesWorked?: number;
  votesFailed?: number;
  status: 'active' | 'needs_review' | string;
  copyCount?: number;
  saveCount?: number;
  reportCount?: number;
  views?: number;
  verifiedCount?: number;
  confidenceReasons?: string[];
  lastVerifiedAt?: string | null;
  verified?: boolean;
  flagCount?: number;
};

export const adaptLegacyCoupon = (coupon: NormalizedCoupon): NormalizedCouponRecord => {
  const canonicalUrl = canonicalizeUrl(coupon.sourceUrl);
  const domain = extractDomain(canonicalUrl);
  const storeId =
    coupon.store && coupon.store.toLowerCase() !== 'unknown store'
      ? coupon.store.toLowerCase().replace(/[^a-z0-9]+/gi, '-')
      : 'unknown';
  const status = coupon.store && coupon.store.toLowerCase() !== 'unknown store' ? 'active' : 'needs_review';
  const trustWeight = Math.max(0, Math.min(1, (coupon.confidence ?? 60) / 100));
  const scores = computeScores({
    trustWeight,
    createdAt: coupon.createdAt,
    expiresAt: coupon.expiresAt,
    code: coupon.code,
    consensus: 1,
    copyCount: coupon.copyCount ?? 0,
    saveCount: coupon.saveCount ?? 0,
    reportedCount: coupon.reportCount ?? 0,
    storePopularity: getStorePopularity(storeId),
    isUnknownStore: storeId === 'unknown'
  });
  const dedupe = dedupeKey(storeId, coupon.code, canonicalUrl, coupon.deal);
  return {
    id: coupon.id,
    store: coupon.store,
    storeId,
    domain,
    title: coupon.deal,
    deal: coupon.deal,
    code: coupon.code,
    source: coupon.source,
    sourceUrl: coupon.sourceUrl,
    canonicalUrl,
    dedupeKey: dedupe,
    createdAt: coupon.createdAt,
    updatedAt: coupon.createdAt,
    expiresAt: coupon.expiresAt,
    trustWeight,
    confidenceScore: scores.confidenceScore,
    hotScore: scores.hotScore,
    verifiedScore: scores.verifiedScore,
    consensus: 1,
    votesWorked: 0,
    votesFailed: 0,
    status,
    copyCount: coupon.copyCount ?? 0,
    saveCount: coupon.saveCount ?? 0,
    reportCount: coupon.reportCount ?? 0,
    views: 0,
    verifiedCount: coupon.verified ? 1 : 0,
    confidenceReasons: scores.confidenceReasons ?? []
  };
};
export type FetchNormalizedCouponsOptions = {
  query?: string;
  store?: string;
  sort?: 'hot' | 'new' | 'expiring' | 'verified';
  limit?: number;
  cursor?: string;
  onlyKnownStores?: boolean;
  excludeStores?: string[];
  priorityStoreIds?: string[];
};

type CursorDefinition = {
  expression: string;
  direction: 'ASC' | 'DESC';
  accessor: (row: any) => unknown;
  parser?: (value: string) => unknown;
};

type CursorConfig = {
  order: string;
  definitions: CursorDefinition[];
  priorityPlaceholders?: string[];
};

const mapRowToCoupon = (row: any): NormalizedFeedCoupon => ({
  id: row.id,
  store: row.store,
  storeId: row.storeId,
  domain: row.domain,
  title: row.title,
  deal: row.deal,
  code: row.code,
  source: row.source,
  sourceUrl: row.sourceUrl,
  canonicalUrl: row.canonicalUrl,
  dedupeKey: row.dedupeKey,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  expiresAt: row.expiresAt,
  trustWeight: row.trustWeight,
  confidenceScore: row.confidenceScore,
  hotScore: row.hotScore,
  verifiedScore: row.verifiedScore,
  consensus: row.consensus,
  votesWorked: row.votesWorked,
  votesFailed: row.votesFailed,
  status: row.status,
  copyCount: row.copyCount ?? 0,
  saveCount: row.saveCount ?? 0,
  reportCount: row.reportCount ?? 0,
  confidenceReasons: parseJsonArray<string>(row.confidenceReasons, []),
  views: row.views ?? 0,
  verifiedCount: row.verifiedCount ?? 0,
  lastVerifiedAt: row.lastVerifiedAt ?? null,
  verified: Boolean(row.verified)
});

const baseCursorDefinitions: Record<
  'hot' | 'new' | 'expiring' | 'verified',
  { order: string; definitions: CursorDefinition[] }
> = {
  hot: {
    order: 'hotScore DESC, createdAt DESC, id DESC',
    definitions: [
      { expression: 'hotScore', direction: 'DESC', accessor: (row) => row.hotScore, parser: (value) => Number(value) },
      { expression: 'createdAt', direction: 'DESC', accessor: (row) => row.createdAt },
      { expression: 'id', direction: 'DESC', accessor: (row) => row.id }
    ]
  },
  new: {
    order: 'createdAt DESC, id DESC',
    definitions: [
      { expression: 'createdAt', direction: 'DESC', accessor: (row) => row.createdAt },
      { expression: 'id', direction: 'DESC', accessor: (row) => row.id }
    ]
  },
  expiring: {
    order: "COALESCE(expiresAt,'9999-12-31T23:59:59Z') ASC, createdAt DESC, id DESC",
    definitions: [
      {
        expression: "COALESCE(expiresAt,'9999-12-31T23:59:59Z')",
        direction: 'ASC',
        accessor: (row) => row.expiresAt ?? '9999-12-31T23:59:59Z'
      },
      { expression: 'createdAt', direction: 'DESC', accessor: (row) => row.createdAt },
      { expression: 'id', direction: 'DESC', accessor: (row) => row.id }
    ]
  },
  verified: {
    order: 'verifiedScore DESC, createdAt DESC, id DESC',
    definitions: [
      {
        expression: 'verifiedScore',
        direction: 'DESC',
        accessor: (row) => row.verifiedScore,
        parser: (value) => Number(value)
      },
      { expression: 'createdAt', direction: 'DESC', accessor: (row) => row.createdAt },
      { expression: 'id', direction: 'DESC', accessor: (row) => row.id }
    ]
  }
};

const createPriorityExpression = (storeIds: string[]): { config: CursorConfig; set: Set<string> } => {
  const unique = Array.from(new Set(storeIds));
  const placeholders = unique.map((_, index) => `$priority${index}`);
  const expression = `CASE WHEN storeId IN (${placeholders.join(', ')}) THEN 0 ELSE 1 END`;
  const prioritySet = new Set(unique);
  return {
    config: {
      order: `${expression} ASC, hotScore DESC, createdAt DESC, id DESC`,
      definitions: [
        {
          expression,
          direction: 'ASC',
          accessor: (row) => (prioritySet.has(row.storeId) ? 0 : 1),
          parser: (value) => Number(value)
        },
        ...baseCursorDefinitions.hot.definitions.map((definition) => ({ ...definition }))
      ],
      priorityPlaceholders: placeholders
    },
    set: prioritySet
  };
};

const getCursorConfig = (sort: 'hot' | 'new' | 'expiring' | 'verified', priorityStoreIds?: string[]): CursorConfig => {
  if (sort === 'hot' && priorityStoreIds && priorityStoreIds.length > 0) {
    return createPriorityExpression(priorityStoreIds).config;
  }
  return baseCursorDefinitions[sort];
};

export const upsertNormalizedCoupon = async (coupon: NormalizedCouponRecord) => {
  const db = await getDb();
  const existing = await db.get<{ id: string }>(
    'SELECT id FROM normalized_coupons WHERE dedupeKey = ?',
    coupon.dedupeKey
  );
  const isDuplicate = Boolean(existing);
  const now = new Date().toISOString();
  await db.run(
    `
      INSERT INTO normalized_coupons (
        id, store, storeId, domain, deal, title, code, source, sourceUrl,
        canonicalUrl, dedupeKey, createdAt, updatedAt, expiresAt, trustWeight,
        confidenceScore, hotScore, verifiedScore, consensus, votesWorked, votesFailed,
        status, copyCount, saveCount, reportCount, verified, confidenceReasons, views, verifiedCount,
        lastVerifiedAt, flagCount
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(dedupeKey) DO UPDATE SET
        store=excluded.store,
        storeId=excluded.storeId,
        domain=excluded.domain,
        deal=excluded.deal,
        title=excluded.title,
        code=excluded.code,
        source=excluded.source,
        sourceUrl=excluded.sourceUrl,
        canonicalUrl=excluded.canonicalUrl,
        createdAt=excluded.createdAt,
        updatedAt=excluded.updatedAt,
        expiresAt=excluded.expiresAt,
        trustWeight=excluded.trustWeight,
        confidenceScore=excluded.confidenceScore,
        hotScore=excluded.hotScore,
        verifiedScore=excluded.verifiedScore,
        consensus=excluded.consensus,
        votesWorked=excluded.votesWorked,
        votesFailed=excluded.votesFailed,
        status=excluded.status,
        copyCount=excluded.copyCount,
        saveCount=excluded.saveCount,
        reportCount=excluded.reportCount,
        verified=excluded.verified,
        confidenceReasons=excluded.confidenceReasons,
        views=excluded.views,
        verifiedCount=excluded.verifiedCount,
        lastVerifiedAt=excluded.lastVerifiedAt,
        flagCount=excluded.flagCount
    `,
    coupon.id,
    coupon.store,
    coupon.storeId,
    coupon.domain,
    coupon.deal,
    coupon.title,
    coupon.code,
    coupon.source,
    coupon.sourceUrl,
    coupon.canonicalUrl,
    coupon.dedupeKey,
    coupon.createdAt,
    coupon.updatedAt ?? now,
    coupon.expiresAt ?? null,
    coupon.trustWeight,
    coupon.confidenceScore,
    coupon.hotScore,
    coupon.verifiedScore,
    coupon.consensus,
    coupon.votesWorked ?? 0,
    coupon.votesFailed ?? 0,
    coupon.status,
    coupon.copyCount ?? 0,
    coupon.saveCount ?? 0,
    coupon.reportCount ?? 0,
    coupon.verified ? 1 : 0,
    JSON.stringify(coupon.confidenceReasons ?? []),
    coupon.views ?? 0,
    coupon.verifiedCount ?? 0,
    coupon.lastVerifiedAt ?? null,
    coupon.flagCount ?? 0
  );
  return { inserted: !isDuplicate, duplicate: isDuplicate };
};

export const deleteExpiredNormalizedCoupons = async () => {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.run("DELETE FROM normalized_coupons WHERE expiresAt < ? AND expiresAt != ''", now);
};

const bumpMetric = async (id: string, column: 'copyCount' | 'saveCount' | 'views') => {
  const db = await getDb();
  await db.run(`UPDATE normalized_coupons SET ${column} = ${column} + 1 WHERE id = ?`, id);
  const row = await db.get<any>('SELECT * FROM normalized_coupons WHERE id = ?', id);
  if (!row) {
    throw new Error('Coupon not found');
  }
  return recomputeDealScores(db, row);
};

export const incrementDealCopy = (id: string) => bumpMetric(id, 'copyCount');
export const incrementDealSave = (id: string) => bumpMetric(id, 'saveCount');
export const incrementDealView = (id: string) => bumpMetric(id, 'views');

export const reportDeal = async (id: string) => {
  const db = await getDb();
  await db.run('UPDATE normalized_coupons SET reportCount = reportCount + 1 WHERE id = ?', id);
  const row = await db.get<any>('SELECT * FROM normalized_coupons WHERE id = ?', id);
  if (!row) {
    throw new Error('Coupon not found');
  }
  if ((row.reportCount ?? 0) >= 3 && row.status !== 'reported') {
    await db.run("UPDATE normalized_coupons SET status = 'reported' WHERE id = ?", id);
  }
  return recomputeDealScores(db, row);
};

export const verifyDeal = async (id: string) => {
  const db = await getDb();
  await db.run('UPDATE normalized_coupons SET verifiedCount = verifiedCount + 1, verified = 1 WHERE id = ?', id);
  const row = await db.get<any>('SELECT * FROM normalized_coupons WHERE id = ?', id);
  if (!row) {
    throw new Error('Coupon not found');
  }
  if ((row.verifiedCount ?? 0) >= 2 && row.status !== 'community_verified') {
    await db.run("UPDATE normalized_coupons SET status = 'community_verified' WHERE id = ?", id);
  }
  return recomputeDealScores(db, row);
};

const recomputeDealScores = async (db: DatabaseClient, row: any) => {
  const scores = computeScores({
    trustWeight: row.trustWeight,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    code: row.code,
    consensus: row.consensus,
    votesWorked: row.votesWorked ?? 0,
    votesFailed: row.votesFailed ?? 0,
    copyCount: row.copyCount ?? 0,
    saveCount: row.saveCount ?? 0,
    reportedCount: row.reportCount ?? 0,
    storePopularity: getStorePopularity(row.storeId),
    isUnknownStore: row.storeId === 'unknown'
  });
  await db.run(
    `
      UPDATE normalized_coupons
      SET confidenceScore = ?,
          hotScore = ?,
          verifiedScore = ?,
          confidenceReasons = ?,
          updatedAt = ?
      WHERE id = ?
    `,
    scores.confidenceScore,
    scores.hotScore,
    scores.verifiedScore,
    JSON.stringify(scores.confidenceReasons ?? []),
    new Date().toISOString(),
    row.id
  );
  const updated = await db.get<any>('SELECT * FROM normalized_coupons WHERE id = ?', row.id);
  if (!updated) {
    throw new Error('Coupon not found');
  }
  return mapRowToCoupon(updated);
};

export const fetchNormalizedCoupons = async (options: FetchNormalizedCouponsOptions = {}) => {
  const db = await getDb();
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const sort = options.sort ?? 'hot';
  const priorityStoreIds = Array.from(
    new Set((options.priorityStoreIds ?? []).filter((value): value is string => Boolean(value)))
  );
  const config = getCursorConfig(sort, priorityStoreIds);
  const onlyKnownStores = options.onlyKnownStores ?? true;
  const where: string[] = ["status = 'active'", 'confidenceScore >= 70'];
  if (onlyKnownStores) {
    where.push("storeId != 'unknown'");
  }
  const params: Record<string, unknown> = {};

  const addListParams = (items: string[] | undefined, prefix: string) => {
    if (!items || !items.length) {
      return [];
    }
    return items.map((value, idx) => {
      const placeholder = `$${prefix}${idx}`;
      params[placeholder] = value;
      return placeholder;
    });
  };

  const buildCursorClause = (index: number): string => {
    const definition = config.definitions[index];
    const operator = definition.direction === 'DESC' ? '<' : '>';
    const placeholder = `$cursor${index}`;
    if (index === config.definitions.length - 1) {
      return `(${definition.expression} ${operator} ${placeholder})`;
    }
    return `(${definition.expression} ${operator} ${placeholder} OR (${definition.expression} = ${placeholder} AND ${buildCursorClause(
      index + 1
    )}))`;
  };

  const nextCursor = (items: any[]) => {
    if (items.length !== limit) {
      return null;
    }
    const last = items[items.length - 1];
    const values = config.definitions.map((definition) => definition.accessor(last));
    return values.map((value) => String(value ?? '')).join('|');
  };

  if (options.query) {
    where.push('(LOWER(deal) LIKE $query OR LOWER(store) LIKE $query OR LOWER(title) LIKE $query)');
    params.$query = `%${options.query.trim().toLowerCase()}%`;
  }
  if (options.store) {
    where.push('storeId = $store');
    params.$store = options.store;
  }
  if (options.excludeStores && options.excludeStores.length) {
    const placeholders = addListParams(options.excludeStores, 'exclude');
    if (placeholders.length) {
      where.push(`storeId NOT IN (${placeholders.join(', ')})`);
    }
  }
  if (config.priorityPlaceholders && priorityStoreIds.length) {
    config.priorityPlaceholders.forEach((placeholder, idx) => {
      params[placeholder] = priorityStoreIds[idx];
    });
  }
  if (options.cursor) {
    const cursorParts = options.cursor.split('|');
    if (cursorParts.length === config.definitions.length) {
      where.push(buildCursorClause(0));
      cursorParts.forEach((value, idx) => {
        const definition = config.definitions[idx];
        const parsed = definition.parser ? definition.parser(value) : value;
        params[`$cursor${idx}`] = parsed;
      });
    }
  }
  where.push("(expiresAt IS NULL OR expiresAt >= $now)");
  params.$now = new Date().toISOString();
  const rows = await db.all<any[]>(
    `
      SELECT *
      FROM normalized_coupons
      WHERE ${where.join(' AND ')}
      ORDER BY ${config.order}
      LIMIT $limit
    `,
    { ...params, $limit: limit }
  );
  const items = rows.map(mapRowToCoupon);
  return { items, nextCursor: nextCursor(rows) };
};

export type DigestOptions = {
  limit?: number;
  stores?: string[];
  minConfidence?: number;
};

export const fetchDigestCoupons = async (options: DigestOptions = {}) => {
  const db = await getDb();
  const limit = Math.min(Math.max(options.limit ?? 5, 1), 30);
  const minConfidence = Math.max(Math.min(options.minConfidence ?? 75, 100), 50);
  const where: string[] = ["status = 'active'", "storeId != 'unknown'", 'confidenceScore >= $minConfidence'];
  const params: Record<string, unknown> = {
    $now: new Date().toISOString(),
    $minConfidence: minConfidence,
    $limit: limit
  };
  if (options.stores && options.stores.length) {
    const placeholders = options.stores.map((_, idx) => `$digestStore${idx}`);
    options.stores.forEach((storeId, idx) => {
      params[`$digestStore${idx}`] = storeId;
    });
    where.push(`storeId IN (${placeholders.join(', ')})`);
  }
  where.push("(expiresAt IS NULL OR expiresAt >= $now)");
  const rows = await db.all<any[]>(
    `
      SELECT *
      FROM normalized_coupons
      WHERE ${where.join(' AND ')}
      ORDER BY confidenceScore DESC, hotScore DESC, createdAt DESC, id DESC
      LIMIT $limit
    `,
    params
  );
  return rows.map(mapRowToCoupon);
};

export const recordCouponVote = async (id: string, vote: 'worked' | 'failed') => {
  const db = await getDb();
  const column = vote === 'worked' ? 'votesWorked' : 'votesFailed';
  await db.run(`UPDATE normalized_coupons SET ${column} = ${column} + 1 WHERE id = ?`, id);
  const row = await db.get<any>('SELECT * FROM normalized_coupons WHERE id = ?', id);
  if (!row) {
    throw new Error('Coupon not found');
  }
  return recomputeDealScores(db, row);
};
