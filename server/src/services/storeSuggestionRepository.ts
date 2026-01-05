import { randomUUID } from 'crypto';
import { getDb } from '../db';
import { createStoreFromSuggestion, getStoreByDomain } from './storeRepository';
import { isLikelyValidDomain, normalizeDomain, normalizeWebsite } from '../utils/url';

export type StoreSuggestionStatus = 'pending' | 'approved';

export interface StoreSuggestionRecord {
  id: string;
  name: string;
  website: string;
  domain: string;
  keyword?: string | null;
  status: StoreSuggestionStatus;
  votes: number;
  deviceHash?: string | null;
  createdAt: string;
}

const SUGGESTION_LIMIT_PER_DEVICE = 5;
const VOTE_LIMIT_PER_DEVICE = 10;
const WINDOW_MS = 24 * 60 * 60 * 1000;

const mapRowToSuggestion = (row: any): StoreSuggestionRecord => ({
  id: row.id,
  name: row.name,
  website: row.website,
  domain: row.domain,
  keyword: row.keyword ?? null,
  status: row.status as StoreSuggestionStatus,
  votes: row.votes,
  deviceHash: row.deviceHash ?? null,
  createdAt: row.createdAt
});

const buildSinceTimestamp = () => new Date(Date.now() - WINDOW_MS).toISOString();

export const createStoreSuggestion = async (params: {
  name: string;
  website: string;
  keyword?: string | undefined;
  deviceHash: string;
}) => {
  const trimmedName = params.name.trim();
  if (trimmedName.length < 2) {
    throw new Error('Store name must be at least 2 characters');
  }
  if (!params.deviceHash?.trim()) {
    throw new Error('Device identifier required');
  }
  const normalizedWebsite = normalizeWebsite(params.website);
  const domain = normalizeDomain(normalizedWebsite);
  if (!domain || !isLikelyValidDomain(domain) || domain === 'localhost') {
    throw new Error('Invalid store domain');
  }
  const db = await getDb();
  const existingStore = await getStoreByDomain(domain);
  if (existingStore) {
    return { exists: true, storeId: existingStore.id };
  }
  const duplicate = await db.get('SELECT id FROM store_suggestions WHERE domain = ? AND status = ?', domain, 'pending');
  if (duplicate) {
    throw new Error('A suggestion for this domain is already pending');
  }
  const since = buildSinceTimestamp();
  const recentCountRow = await db.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM store_suggestions WHERE deviceHash = ? AND createdAt >= ?',
    params.deviceHash,
    since
  );
  if ((recentCountRow?.count ?? 0) >= SUGGESTION_LIMIT_PER_DEVICE) {
    throw new Error('Suggestion limit reached for today');
  }
  const id = randomUUID();
  const safeKeyword = params.keyword?.trim();
  await db.run(
    `
    INSERT INTO store_suggestions (id, name, website, domain, keyword, status, votes, deviceHash, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    id,
    trimmedName,
    normalizedWebsite,
    domain,
    safeKeyword ?? null,
    'pending',
    1,
    params.deviceHash,
    new Date().toISOString()
  );
  const inserted = await db.get('SELECT * FROM store_suggestions WHERE id = ? LIMIT 1', id);
  return { suggestion: inserted ? mapRowToSuggestion(inserted) : null };
};

export const getStoreSuggestionById = async (id: string) => {
  const db = await getDb();
  const row = await db.get('SELECT * FROM store_suggestions WHERE id = ? LIMIT 1', id);
  if (!row) return null;
  return mapRowToSuggestion(row);
};

export const listStoreSuggestions = async (status: StoreSuggestionStatus, sort: 'votes' | 'newest' = 'votes') => {
  const db = await getDb();
  const orderClause = sort === 'newest' ? 'ORDER BY createdAt DESC' : 'ORDER BY votes DESC, createdAt DESC';
  const rows = await db.all(`SELECT * FROM store_suggestions WHERE status = ? ${orderClause} LIMIT 100`, status);
  return rows.map(mapRowToSuggestion);
};

export const voteOnStoreSuggestion = async (params: {
  id: string;
  deviceHash: string;
  direction: 'up' | 'down';
}) => {
  if (!params.deviceHash?.trim()) {
    throw new Error('Device identifier required');
  }
  const db = await getDb();
  const suggestion = await getStoreSuggestionById(params.id);
  if (!suggestion) {
    throw new Error('Suggestion not found');
  }
  if (suggestion.status !== 'pending') {
    throw new Error('Can only vote on pending suggestions');
  }
  const since = buildSinceTimestamp();
  const voteCount = await db.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM store_suggestion_votes WHERE deviceHash = ? AND createdAt >= ?',
    params.deviceHash,
    since
  );
  if ((voteCount?.count ?? 0) >= VOTE_LIMIT_PER_DEVICE) {
    throw new Error('Vote limit reached');
  }
  const delta = params.direction === 'up' ? 1 : -1;
  await db.run(
    `
    INSERT INTO store_suggestion_votes (suggestionId, deviceHash, direction, createdAt)
    VALUES (?, ?, ?, ?)
  `,
    params.id,
    params.deviceHash,
    params.direction,
    new Date().toISOString()
  );
  await db.run('UPDATE store_suggestions SET votes = votes + ? WHERE id = ?', delta, params.id);
  const updated = await getStoreSuggestionById(params.id);
  return updated;
};

export const approveStoreSuggestion = async (id: string) => {
  const db = await getDb();
  const suggestion = await getStoreSuggestionById(id);
  if (!suggestion) {
    throw new Error('Suggestion not found');
  }
  if (suggestion.status === 'approved') {
    throw new Error('Suggestion already approved');
  }
  const store = await createStoreFromSuggestion({
    name: suggestion.name,
    website: suggestion.website,
    keyword: suggestion.keyword ?? undefined
  });
  await db.run('UPDATE store_suggestions SET status = ? WHERE id = ?', 'approved', id);
  return store;
};
