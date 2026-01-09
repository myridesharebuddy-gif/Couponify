import crypto from 'crypto';
import { getDb } from '../db';
import { getStoreById, resolveStoreFromHint, UNKNOWN_STORE_ID } from './storeRepository';
import type { CouponItem } from '../types/coupon';

const mapStoreReference = async (options: {
  hint?: string;
  link?: string;
  storeId?: string;
  storeNameSnapshot?: string;
  storeWebsiteSnapshot?: string;
}) => {
  if (options.storeId) {
    const store = await getStoreById(options.storeId);
    if (store) {
      return {
        storeId: store.id,
        storeNameSnapshot: options.storeNameSnapshot ?? store.name,
        storeWebsiteSnapshot: options.storeWebsiteSnapshot ?? store.website
      };
    }
  }
  const resolved = await resolveStoreFromHint(options.hint, options.link);
  if (resolved) {
    return {
      storeId: resolved.id,
      storeNameSnapshot: resolved.name,
      storeWebsiteSnapshot: resolved.website
    };
  }
  const fallback =
    (await getStoreById(UNKNOWN_STORE_ID)) ?? {
      id: UNKNOWN_STORE_ID,
      name: 'Unknown store',
      website: 'https://couponify.com',
      domain: 'couponify.com',
      country: 'US',
      popularityWeight: 1,
      categories: ['Home'],
      aliases: ['unknown'],
      createdAt: new Date().toISOString()
    };
  return {
    storeId: fallback.id,
    storeNameSnapshot: options.hint?.trim() || fallback.name,
    storeWebsiteSnapshot: options.link || fallback.website
  };
};

export const generateCouponId = (source: string, sourceId: string | undefined, link: string): string => {
  const sourceKey = `${source}:${sourceId ?? link}`;
  return crypto.createHash('sha256').update(sourceKey).digest('hex');
};

export const upsertCoupon = async (item: CouponItem) => {
  const db = await getDb();
  const storeMapping = await mapStoreReference({
    hint: item.storeNameSnapshot ?? item.store?.name,
    link: item.link,
    storeId: item.storeId,
    storeNameSnapshot: item.storeNameSnapshot,
    storeWebsiteSnapshot: item.storeWebsiteSnapshot
  });
  await db.run(
    `
    INSERT INTO coupons (
      id, source, sourceId, title, description, store, storeId,
      storeNameSnapshot, storeWebsiteSnapshot, category, discountText, code, link,
      postedAtISO, expiresAtISO, verifiedUp, verifiedDown, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      description=excluded.description,
      store=excluded.store,
      storeId=excluded.storeId,
      storeNameSnapshot=excluded.storeNameSnapshot,
      storeWebsiteSnapshot=excluded.storeWebsiteSnapshot,
      category=excluded.category,
      discountText=excluded.discountText,
      code=excluded.code,
      link=excluded.link,
      postedAtISO=excluded.postedAtISO,
      expiresAtISO=excluded.expiresAtISO,
      status=excluded.status;
  `,
    item.id,
    item.source,
    item.sourceId,
    item.title,
    item.description,
    storeMapping.storeNameSnapshot,
    storeMapping.storeId,
    storeMapping.storeNameSnapshot,
    storeMapping.storeWebsiteSnapshot,
    item.category,
    item.discountText,
    item.code,
    item.link,
    item.postedAtISO,
    item.expiresAtISO,
    item.verifiedUp,
    item.verifiedDown,
    item.status
  );
};

const buildStoreObject = (row: any) => {
  if (!row.storeId) return null;
  return {
    id: row.storeId,
    name: row.canonicalStoreName ?? row.storeNameSnapshot ?? 'Unknown store',
    website: row.canonicalStoreWebsite ?? row.storeWebsiteSnapshot ?? ''
  };
};

export const fetchCoupons = async (filters: {
  query?: string;
  storeId?: string;
  category?: string;
  source?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}) => {
  const db = await getDb();
  const conditions: string[] = [];
  const params: Record<string, any> = {};

  if (filters.query) {
    conditions.push('(title LIKE $query OR description LIKE $query)');
    params.$query = `%${filters.query}%`;
  }
  if (filters.storeId) {
    conditions.push('storeId = $storeId');
    params.$storeId = filters.storeId;
  }
  if (filters.category) {
    conditions.push('category = $category');
    params.$category = filters.category;
  }
  if (filters.source) {
    conditions.push('source = $source');
    params.$source = filters.source;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  let orderClause = 'ORDER BY postedAtISO DESC';
  if (filters.sort === 'expiring') {
    orderClause = 'ORDER BY expiresAtISO IS NULL, expiresAtISO ASC';
  } else if (filters.sort === 'verified') {
    orderClause = 'ORDER BY (verifiedUp - verifiedDown) DESC';
  }

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const totalRow = await db.get<{ count: number }>(`SELECT COUNT(*) as count FROM coupons ${whereClause}`, params);
  const total = totalRow?.count ?? 0;

  const rows = (await db.all<any[]>(
    `
    SELECT coupons.*, stores.name as canonicalStoreName, stores.website as canonicalStoreWebsite
    FROM coupons
    LEFT JOIN stores ON coupons.storeId = stores.id
    ${whereClause}
    ${orderClause}
    LIMIT $limit OFFSET $offset
    `,
    {
      ...params,
      $limit: pageSize,
      $offset: offset
    }
  ) ?? []);

  const items = rows.map((row) => ({
    id: row.id,
    source: row.source,
    sourceId: row.sourceId,
    title: row.title,
    description: row.description,
    storeId: row.storeId,
    store: buildStoreObject(row),
    storeNameSnapshot: row.storeNameSnapshot,
    storeWebsiteSnapshot: row.storeWebsiteSnapshot,
    category: row.category,
    discountText: row.discountText,
    code: row.code,
    link: row.link,
    postedAtISO: row.postedAtISO,
    expiresAtISO: row.expiresAtISO,
    verifiedUp: row.verifiedUp,
    verifiedDown: row.verifiedDown,
    status: row.status
  }));

  return { items, total };
};

export const fetchCouponById = async (id: string): Promise<CouponItem | null> => {
  const db = await getDb();
  const row = await db.get<any>(
    `
    SELECT coupons.*, stores.name as canonicalStoreName, stores.website as canonicalStoreWebsite
    FROM coupons
    LEFT JOIN stores ON coupons.storeId = stores.id
    WHERE coupons.id = ?
    LIMIT 1
    `,
    id
  );
  if (!row) return null;
  return {
    id: row.id,
    source: row.source,
    sourceId: row.sourceId,
    title: row.title,
    description: row.description,
    storeId: row.storeId,
    store: buildStoreObject(row),
    storeNameSnapshot: row.storeNameSnapshot,
    storeWebsiteSnapshot: row.storeWebsiteSnapshot,
    category: row.category,
    discountText: row.discountText,
    code: row.code,
    link: row.link,
    postedAtISO: row.postedAtISO,
    expiresAtISO: row.expiresAtISO,
    verifiedUp: row.verifiedUp,
    verifiedDown: row.verifiedDown,
    status: row.status
  };
};

export const syncLegacyStoreMappings = async () => {
  const db = await getDb();
  const rows = await db.all<{ id: string; store: string | null; link: string }[]>(
    "SELECT id, store, link FROM coupons WHERE storeId IS NULL OR storeId = 'unknown'"
  );
  for (const row of rows) {
    const mapping = await mapStoreReference({ hint: row.store ?? undefined, link: row.link });
    await db.run(
      'UPDATE coupons SET store = ?, storeId = ?, storeNameSnapshot = ?, storeWebsiteSnapshot = ? WHERE id = ?',
      mapping.storeNameSnapshot,
      mapping.storeId,
      mapping.storeNameSnapshot,
      mapping.storeWebsiteSnapshot,
      row.id
    );
  }
};

export const addVote = async (couponId: string, vote: 'up' | 'down') => {
  const db = await getDb();
  await db.run('INSERT INTO votes (couponId, vote, createdAt) VALUES (?, ?, ?)', couponId, vote, new Date().toISOString());
  if (vote === 'up') {
    await db.run('UPDATE coupons SET verifiedUp = verifiedUp + 1 WHERE id = ?', couponId);
  } else {
    await db.run('UPDATE coupons SET verifiedDown = verifiedDown + 1 WHERE id = ?', couponId);
  }
};

export const addReport = async (couponId: string, reason: string) => {
  const db = await getDb();
  await db.run('INSERT INTO reports (couponId, reason, createdAt) VALUES (?, ?, ?)', couponId, reason, new Date().toISOString());
  await db.run('UPDATE coupons SET status = ? WHERE id = ?', 'REPORTED', couponId);
};

export const addSubmission = async (item: {
  storeId: string;
  storeNameSnapshot: string;
  storeWebsiteSnapshot: string;
  category?: string;
  description?: string;
  code?: string;
  link: string;
  expiresAtISO?: string;
}) => {
  const db = await getDb();
  const submissionId = crypto.randomUUID();
  const postedAtISO = new Date().toISOString();
  await db.run(
    `
    INSERT INTO submissions (
      id, store, storeId, storeNameSnapshot, storeWebsiteSnapshot, category,
      description, code, link, expiresAtISO, postedAtISO
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    submissionId,
    item.storeNameSnapshot,
    item.storeId,
    item.storeNameSnapshot,
    item.storeWebsiteSnapshot,
    item.category ?? 'Community',
    item.description,
    item.code,
    item.link,
    item.expiresAtISO,
    postedAtISO
  );

  const couponId = generateCouponId('manual', submissionId, item.link);
  await upsertCoupon({
    id: couponId,
    source: 'manual',
    sourceId: submissionId,
    title: item.description ?? 'User submission',
    description: item.description,
    storeId: item.storeId,
    storeNameSnapshot: item.storeNameSnapshot,
    storeWebsiteSnapshot: item.storeWebsiteSnapshot,
    category: item.category ?? 'Community',
    discountText: item.code ? `Code ${item.code}` : undefined,
    code: item.code,
    link: item.link,
    postedAtISO,
    expiresAtISO: item.expiresAtISO,
    verifiedUp: 0,
    verifiedDown: 0,
    status: 'UNKNOWN'
  });
};

export const getSources = () => [
  { id: 'reddit', name: 'Reddit communities' },
  { id: 'rss', name: 'Public RSS feeds' },
  { id: 'manual', name: 'User submissions' }
];
