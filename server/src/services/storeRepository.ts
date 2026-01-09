import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { getDb } from '../db';
import { normalizeDomain, normalizeWebsite } from '../utils/url';

const CATEGORY_LIST = [
  'Apparel',
  'Shoes',
  'Beauty',
  'Electronics',
  'Grocery',
  'Home',
  'Tools',
  'Auto',
  'Baby',
  'Pet',
  'Travel',
  'Dining',
  'Pharmacy',
  'Office',
  'Outdoors',
  'Fitness'
] as const;

const storeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  website: z.string().url().regex(/^https:\/\//),
  categories: z.array(z.enum(CATEGORY_LIST)).min(1),
  aliases: z.array(z.string().min(1)).min(1),
  country: z.string().min(1),
  popularityWeight: z.number().int().min(1).max(100)
});
const storeListSchema = z.array(storeSchema);

const STORE_SEED_PATH = path.resolve(__dirname, '../../data/stores.seed.json');
export const UNKNOWN_STORE_ID = 'unknown';

export type StoreSeed = z.infer<typeof storeSchema>;

export interface StoreRecord {
  id: string;
  name: string;
  website: string;
  domain: string;
  country: string;
  popularityWeight: number;
  categories: string[];
  aliases: string[];
  createdAt: string;
}

const safeParseJson = <T>(value: string | undefined | null, fallback: T): T => {
  if (typeof value !== 'string') {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const mapRowToStore = (row: any): StoreRecord => ({
  id: row.id,
  name: row.name,
  website: row.website,
  domain: row.domain,
  country: row.country,
  popularityWeight: row.popularityWeight,
  categories: safeParseJson<string[]>(row.categoriesJson, []),
  aliases: safeParseJson<string[]>(row.aliasesJson, []),
  createdAt: row.createdAt
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const NATURAL_HAIR_STORE_IDS = [
  'sally-beauty',
  'sheamoisture',
  'cantu',
  'mielle-organics',
  'camille-rose',
  'tgin',
  'as-i-am',
  'carol-s-daughter',
  'pattern-beauty',
  'design-essentials',
  'the-doux',
  'kinky-curly',
  'eden-bodyworks'
];

const SKINCARE_STORE_IDS = [
  'cvs-pharmacy',
  'walgreens',
  'target',
  'walmart',
  'rite-aid',
  'cerave',
  'cetaphil',
  'the-ordinary',
  'la-roche-posay',
  'neutrogena',
  'olay',
  'paulas-choice',
  'kiehls'
];

const keywordIntentBoosts = [
  {
    keywords: ['makeup', 'cosmetics', 'mascara', 'lipstick', 'eyeliner', 'foundation', 'blush', 'concealer'],
    targetIds: ['ulta-beauty', 'sephora'],
    boost: 45
  },
  {
    keywords: ['natural hair', 'naturalhair', '4c', 'leave in', 'leave-in', 'twist out', 'kinky', 'curly', 'co wash', 'wash and go'],
    targetIds: NATURAL_HAIR_STORE_IDS,
    boost: 40
  },
  {
    keywords: ['skincare', 'moisture', 'hydrating', 'hydration', 'cerave', 'cetaphil', 'ordinary', 'spf', 'serum', 'cleanser'],
    targetIds: SKINCARE_STORE_IDS,
    boost: 35
  }
];

const normalizeQuery = (value?: string) => (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const applyKeywordBoost = (storeId: string, normalizedHint?: string) => {
  if (!normalizedHint) return 0;
  let boost = 0;
  for (const intent of keywordIntentBoosts) {
    if (!intent.targetIds.includes(storeId)) continue;
    const found = intent.keywords.some((keyword) => normalizedHint.includes(keyword));
    if (found) {
      boost += intent.boost;
    }
  }
  return boost;
};

export const seedStores = async ({ force = false } = {}) => {
  const raw = await fs.readFile(STORE_SEED_PATH, 'utf-8');
  const stores = storeListSchema.parse(JSON.parse(raw));
  const db = await getDb();
  const countRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM stores');
  if (!force && countRow?.count && countRow.count >= stores.length) {
    await ensureUnknownStore(db);
    return stores;
  }
  await db.run('BEGIN TRANSACTION');
  if (force) {
    await db.run('DELETE FROM stores');
  }
  for (const store of stores) {
    await db.run(
      `
      INSERT OR REPLACE INTO stores (id, name, website, domain, country, popularityWeight, categoriesJson, aliasesJson, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      store.id,
      store.name,
      store.website,
      normalizeDomain(store.website),
      store.country,
      store.popularityWeight,
      JSON.stringify(store.categories),
      JSON.stringify(store.aliases),
      new Date().toISOString()
    );
  }
  await ensureUnknownStore(db);
  await db.run('COMMIT');
  return stores;
};

export const searchStores = async (options: {
  query?: string;
  category?: string;
  page?: number;
  pageSize?: number;
  sort?: 'popularity' | 'name' | 'newest';
}) => {
  const db = await getDb();
  const conditions: string[] = [];
  const params: Record<string, any> = {};
  if (options.query) {
    const search = `%${options.query.toLowerCase()}%`;
    conditions.push('(LOWER(name) LIKE $search OR LOWER(aliasesJson) LIKE $search OR LOWER(domain) LIKE $search)');
    params.$search = search;
  }
  if (options.category && CATEGORY_LIST.includes(options.category as typeof CATEGORY_LIST[number])) {
    conditions.push('categoriesJson LIKE $category');
    params.$category = `%${options.category}%`;
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  let orderClause = 'ORDER BY popularityWeight DESC';
  if (options.sort === 'name') {
    orderClause = 'ORDER BY name COLLATE NOCASE ASC';
  } else if (options.sort === 'newest') {
    orderClause = 'ORDER BY createdAt DESC';
  }
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 24));
  const offset = (page - 1) * pageSize;
  const totalRow = await db.get<{ count: number }>(`SELECT COUNT(*) as count FROM stores ${whereClause}`, params);
  const items = await db.all(
    `
      SELECT * FROM stores
      ${whereClause}
      ${orderClause}
      LIMIT $limit OFFSET $offset
    `,
    {
      ...params,
      $limit: pageSize,
      $offset: offset
    }
  );
  return {
    items: (items ?? []).map(mapRowToStore),
    total: totalRow?.count ?? 0
  };
};

export const getStoreById = async (id: string) => {
  const db = await getDb();
  const row = await db.get('SELECT * FROM stores WHERE id = ? LIMIT 1', id);
  if (!row) return null;
  return mapRowToStore(row);
};

export const getCategories = async () => {
  const db = await getDb();
  const rows = await db.all<{ categoriesJson: string }[]>('SELECT categoriesJson FROM stores');
  const set = new Set<string>();
  for (const row of rows) {
    const values: string[] = JSON.parse(row.categoriesJson);
    values.forEach((value) => {
      if (CATEGORY_LIST.includes(value as typeof CATEGORY_LIST[number])) {
        set.add(value);
      }
    });
  }
  return Array.from(set).sort();
};

const ensureUniqueStoreId = async (database: Awaited<ReturnType<typeof getDb>>, baseId: string) => {
  const normalizedBase = baseId || `suggested-store-${Date.now().toString(36)}`;
  let suffix = 0;
  let candidate = normalizedBase;
  while (await database.get('SELECT id FROM stores WHERE id = ? LIMIT 1', candidate)) {
    suffix += 1;
    candidate = `${normalizedBase}-${suffix}`;
  }
  return candidate;
};

export const getStoreByDomain = async (domain: string) => {
  if (!domain) return null;
  const normalized = domain.toLowerCase();
  const db = await getDb();
  const row = await db.get('SELECT * FROM stores WHERE LOWER(domain) = ? LIMIT 1', normalized);
  if (!row) return null;
  return mapRowToStore(row);
};

export const createStoreFromSuggestion = async (params: {
  name: string;
  website: string;
  keyword?: string;
}) => {
  const db = await getDb();
  const normalizedWebsite = normalizeWebsite(params.website);
  const domain = normalizeDomain(normalizedWebsite);
  if (!domain) {
    throw new Error('Unable to resolve store domain');
  }
  const safeName = params.name.trim();
  if (!safeName) {
    throw new Error('Store name is required');
  }
  const baseId = slugify(safeName);
  const storeId = await ensureUniqueStoreId(db, baseId);
  const aliases = [safeName];
  if (params.keyword) {
    const safeKeyword = params.keyword.trim();
    if (safeKeyword) {
      aliases.push(safeKeyword);
    }
  }
  await db.run(
    `
    INSERT INTO stores (id, name, website, domain, country, popularityWeight, categoriesJson, aliasesJson, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    storeId,
    safeName,
    normalizedWebsite,
    domain,
    'US',
    1,
    JSON.stringify([]),
    JSON.stringify(Array.from(new Set(aliases.filter(Boolean)))),
    new Date().toISOString()
  );
  const inserted = await db.get('SELECT * FROM stores WHERE id = ? LIMIT 1', storeId);
  if (!inserted) {
    throw new Error('Failed to insert store record');
  }
  return mapRowToStore(inserted);
};

const normalizeMatchingText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const resolveStoreFromHint = async (hint?: string, link?: string) => {
  if (!hint && !link) return null;
  const normalizedHint = normalizeQuery(hint);
  const domainHint = link ? normalizeDomain(link) : undefined;
  const db = await getDb();
  const rows = await db.all('SELECT * FROM stores');
  const storeRecords = rows.map(mapRowToStore).filter((store) => store.id !== UNKNOWN_STORE_ID);

  if (normalizedHint) {
    const directMatch = storeRecords.find((store) => {
      const aliasMatches = store.aliases.map((alias) => normalizeMatchingText(alias));
      const nameNormalized = normalizeMatchingText(store.name);
      return (
        aliasMatches.includes(normalizedHint) ||
        nameNormalized === normalizedHint ||
        nameNormalized.includes(normalizedHint) ||
        normalizedHint.includes(nameNormalized)
      );
    });
    if (directMatch) {
      return directMatch;
    }
  }

  if (domainHint) {
    const domainMatch = storeRecords.find(
      (store) => store.domain.toLowerCase() === domainHint || store.domain.toLowerCase().endsWith(domainHint)
    );
    if (domainMatch) {
      return domainMatch;
    }
  }

  const scored = storeRecords
    .map((store) => {
      let score = store.popularityWeight;
      let matched = false;
      const nameNormalized = normalizeMatchingText(store.name);
      const aliasNormalized = store.aliases.map((alias) => normalizeMatchingText(alias));
      if (normalizedHint) {
        if (aliasNormalized.includes(normalizedHint)) {
          score += 70;
          matched = true;
        }
        if (nameNormalized === normalizedHint) {
          score += 70;
          matched = true;
        }
        if (nameNormalized.includes(normalizedHint) || normalizedHint.includes(nameNormalized)) {
          score += 30;
          matched = true;
        }
        if (aliasNormalized.some((alias) => normalizedHint.includes(alias))) {
          score += 25;
          matched = true;
        }
      }
      if (domainHint) {
        if (store.domain.toLowerCase() === domainHint || store.domain.toLowerCase().endsWith(domainHint)) {
          score += 80;
          matched = true;
        }
      }
      const boost = applyKeywordBoost(store.id, normalizedHint);
      if (boost > 0) {
        score += boost;
        matched = true;
      }
      return { store, score, matched };
    })
    .filter(({ matched }) => matched);
  if (!scored.length) {
    return null;
  }
  scored.sort((a, b) => b.score - a.score);
  return scored[0].store;
};

export const ensureUnknownStore = async (db?: Awaited<ReturnType<typeof getDb>>) => {
  const database = db ?? (await getDb());
  const existing = await database.get('SELECT id FROM stores WHERE id = ?', UNKNOWN_STORE_ID);
  if (existing) {
    return mapRowToStore(existing);
  }
  const now = new Date().toISOString();
  await database.run(
    `
    INSERT INTO stores (id, name, website, domain, country, popularityWeight, categoriesJson, aliasesJson, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    UNKNOWN_STORE_ID,
    'Unknown store',
    'https://couponify.com',
    'couponify.com',
    'US',
    1,
    JSON.stringify(['Home']),
    JSON.stringify(['unknown']),
    now
  );
  return mapRowToStore({
    id: UNKNOWN_STORE_ID,
    name: 'Unknown store',
    website: 'https://couponify.com',
    domain: 'couponify.com',
    country: 'US',
    popularityWeight: 1,
    categoriesJson: JSON.stringify(['Home']),
    aliasesJson: JSON.stringify(['unknown']),
    createdAt: now
  });
};
