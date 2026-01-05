import { getDb } from '../db';

export type PreferencesRecord = {
  deviceId: string;
  favoriteStores: string[];
  blockedStores: string[];
  categories: string[];
  watchlist: string[];
  notifyOnStoreDrops: boolean;
  lastDigestSentAt: string | null;
  lastWatchlistCheck: string | null;
  createdAt: string;
  updatedAt: string;
};

const parseJsonArray = (value: string | null | undefined): string[] => {
  if (typeof value !== 'string') {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
  } catch {
    return [];
  }
};

const dedupeList = (items: string[] = []) =>
  Array.from(new Set(items.filter(Boolean).map((entry) => entry.trim().toLowerCase())));

export const getPreferencesForDevice = async (deviceId: string): Promise<PreferencesRecord> => {
  const db = await getDb();
  const row = await db.get<any>('SELECT * FROM preferences WHERE deviceId = ?', deviceId);
  if (row) {
    return {
      deviceId: row.deviceId,
      favoriteStores: parseJsonArray(row.favoriteStoresJson),
      blockedStores: parseJsonArray(row.blockedStoresJson),
      categories: parseJsonArray(row.categoriesJson),
      watchlist: parseJsonArray(row.watchlistJson),
      notifyOnStoreDrops: Boolean(row.notifyOnStoreDrops),
      lastDigestSentAt: row.lastDigestSentAt ?? null,
      lastWatchlistCheck: row.lastWatchlistCheck ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
  const now = new Date().toISOString();
  await db.run(
    `
      INSERT INTO preferences (
        deviceId, favoriteStoresJson, blockedStoresJson, categoriesJson,
        watchlistJson, notifyOnStoreDrops, createdAt, updatedAt
      )
      VALUES (?, '[]', '[]', '[]', '[]', 1, ?, ?)
    `,
    deviceId,
    now,
    now
  );
  return {
    deviceId,
    favoriteStores: [],
    blockedStores: [],
    categories: [],
    watchlist: [],
    notifyOnStoreDrops: true,
    lastDigestSentAt: null,
    lastWatchlistCheck: null,
    createdAt: now,
    updatedAt: now
  };
};

export type PreferencePayload = {
  favoriteStores?: string[];
  blockedStores?: string[];
  categories?: string[];
  watchlist?: string[];
  notifyOnStoreDrops?: boolean;
  lastDigestSentAt?: string | null;
  lastWatchlistCheck?: string | null;
};

export const updatePreferencesForDevice = async (
  deviceId: string,
  payload: PreferencePayload
): Promise<PreferencesRecord> => {
  const existing = await getPreferencesForDevice(deviceId);
  const next: PreferencesRecord = {
    deviceId,
    favoriteStores: payload.favoriteStores ? dedupeList(payload.favoriteStores) : existing.favoriteStores,
    blockedStores: payload.blockedStores ? dedupeList(payload.blockedStores) : existing.blockedStores,
    categories: payload.categories ? dedupeList(payload.categories) : existing.categories,
    watchlist: payload.watchlist ? dedupeList(payload.watchlist) : existing.watchlist,
    notifyOnStoreDrops:
      typeof payload.notifyOnStoreDrops === 'boolean' ? payload.notifyOnStoreDrops : existing.notifyOnStoreDrops,
    lastDigestSentAt: payload.lastDigestSentAt ?? existing.lastDigestSentAt,
    lastWatchlistCheck: payload.lastWatchlistCheck ?? existing.lastWatchlistCheck,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  };
  const db = await getDb();
  await db.run(
    `
      INSERT INTO preferences (
        deviceId, favoriteStoresJson, blockedStoresJson, categoriesJson, watchlistJson,
        notifyOnStoreDrops, lastDigestSentAt, lastWatchlistCheck, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(deviceId) DO UPDATE SET
        favoriteStoresJson = excluded.favoriteStoresJson,
        blockedStoresJson = excluded.blockedStoresJson,
        categoriesJson = excluded.categoriesJson,
        watchlistJson = excluded.watchlistJson,
        notifyOnStoreDrops = excluded.notifyOnStoreDrops,
        lastDigestSentAt = excluded.lastDigestSentAt,
        lastWatchlistCheck = excluded.lastWatchlistCheck,
        updatedAt = excluded.updatedAt
    `,
    next.deviceId,
    JSON.stringify(next.favoriteStores),
    JSON.stringify(next.blockedStores),
    JSON.stringify(next.categories),
    JSON.stringify(next.watchlist),
    next.notifyOnStoreDrops ? 1 : 0,
    next.lastDigestSentAt,
    next.lastWatchlistCheck,
    next.createdAt,
    next.updatedAt
  );
  return next;
};
