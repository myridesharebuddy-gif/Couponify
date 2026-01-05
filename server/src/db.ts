import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let dbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>>;

const ensureColumnExists = async (db: Database, table: string, column: string, definition: string) => {
  const info = await db.all<{ name: string }[]>(`PRAGMA table_info(${table})`);
  if (!info.some((row) => row.name === column)) {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
};

export const getDb = () => {
  if (!dbPromise) {
    dbPromise = open({
      filename: path.resolve(__dirname, '../data/coupons.sqlite'),
      driver: sqlite3.Database
    }).then(async (db) => {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS stores (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          website TEXT NOT NULL,
          domain TEXT NOT NULL,
          country TEXT NOT NULL,
          popularityWeight INTEGER NOT NULL,
          categoriesJson TEXT NOT NULL,
          aliasesJson TEXT NOT NULL,
          createdAt TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS store_suggestions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          website TEXT NOT NULL,
          domain TEXT NOT NULL,
          keyword TEXT,
          aliasesJson TEXT NOT NULL DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'pending',
          votes INTEGER NOT NULL DEFAULT 1,
          deviceHash TEXT,
          createdAt TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_store_suggestions_domain ON store_suggestions(domain);
        CREATE TABLE IF NOT EXISTS store_suggestion_votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          suggestionId TEXT NOT NULL,
          deviceHash TEXT NOT NULL,
          direction TEXT NOT NULL,
          createdAt TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS coupons (
          id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          sourceId TEXT,
          title TEXT NOT NULL,
          description TEXT,
          store TEXT,
          storeId TEXT NOT NULL DEFAULT 'unknown',
          storeNameSnapshot TEXT,
          storeWebsiteSnapshot TEXT,
          category TEXT,
          discountText TEXT,
          code TEXT,
          link TEXT NOT NULL,
          postedAtISO TEXT NOT NULL,
          expiresAtISO TEXT,
          verifiedUp INTEGER NOT NULL DEFAULT 0,
          verifiedDown INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'ACTIVE'
        );
        CREATE TABLE IF NOT EXISTS submissions (
          id TEXT PRIMARY KEY,
          store TEXT,
          storeId TEXT,
          storeNameSnapshot TEXT,
          storeWebsiteSnapshot TEXT,
          category TEXT,
          description TEXT,
          code TEXT,
          link TEXT NOT NULL,
          expiresAtISO TEXT,
          postedAtISO TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          couponId TEXT NOT NULL,
          vote TEXT NOT NULL,
          createdAt TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          couponId TEXT NOT NULL,
          reason TEXT NOT NULL,
          createdAt TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS preferences (
          deviceId TEXT PRIMARY KEY,
          favoriteStoresJson TEXT NOT NULL DEFAULT '[]',
          blockedStoresJson TEXT NOT NULL DEFAULT '[]',
          categoriesJson TEXT NOT NULL DEFAULT '[]',
          watchlistJson TEXT NOT NULL DEFAULT '[]',
          notifyOnStoreDrops INTEGER NOT NULL DEFAULT 1,
          lastDigestSentAt TEXT,
          lastWatchlistCheck TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ingestion_history (
          id TEXT PRIMARY KEY,
          runAt TEXT NOT NULL,
          sourceId TEXT NOT NULL,
          fetched INTEGER NOT NULL,
          inserted INTEGER NOT NULL,
          duplicates INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS normalized_coupons (
          id TEXT PRIMARY KEY,
          store TEXT NOT NULL,
          storeId TEXT NOT NULL,
          domain TEXT NOT NULL,
          deal TEXT NOT NULL,
          title TEXT NOT NULL,
          code TEXT NOT NULL,
          source TEXT NOT NULL,
          sourceUrl TEXT NOT NULL,
          canonicalUrl TEXT NOT NULL,
          dedupeKey TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          expiresAt TEXT,
          trustWeight REAL NOT NULL DEFAULT 0,
          confidenceScore REAL NOT NULL DEFAULT 0,
          hotScore REAL NOT NULL DEFAULT 0,
          verifiedScore REAL NOT NULL DEFAULT 0,
          consensus INTEGER NOT NULL DEFAULT 1,
          votesWorked INTEGER NOT NULL DEFAULT 0,
          votesFailed INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'needs_review',
        copyCount INTEGER NOT NULL DEFAULT 0,
        saveCount INTEGER NOT NULL DEFAULT 0,
        reportCount INTEGER NOT NULL DEFAULT 0,
        verified INTEGER NOT NULL DEFAULT 0,
        confidenceReasons TEXT NOT NULL DEFAULT '[]',
        views INTEGER NOT NULL DEFAULT 0,
        verifiedCount INTEGER NOT NULL DEFAULT 0,
        lastVerifiedAt TEXT,
        flagCount INTEGER NOT NULL DEFAULT 0
      );
        CREATE VIEW IF NOT EXISTS store_categories AS
          SELECT stores.id AS storeId, json_each.value AS category
          FROM stores, json_each(stores.categoriesJson);
        CREATE INDEX IF NOT EXISTS idx_normalized_coupons_created_at ON normalized_coupons(createdAt);
        CREATE INDEX IF NOT EXISTS idx_normalized_coupons_store_id ON normalized_coupons(storeId);
        CREATE INDEX IF NOT EXISTS idx_normalized_coupons_confidence ON normalized_coupons(confidenceScore);
        CREATE INDEX IF NOT EXISTS idx_normalized_coupons_status ON normalized_coupons(status);
      `);
      await ensureColumnExists(db, 'stores', 'domain', "domain TEXT NOT NULL DEFAULT ''");
      await ensureColumnExists(db, 'stores', 'country', "country TEXT NOT NULL DEFAULT 'US'");
      await ensureColumnExists(db, 'stores', 'popularityWeight', 'popularityWeight INTEGER NOT NULL DEFAULT 1');
      await ensureColumnExists(db, 'stores', 'categoriesJson', "categoriesJson TEXT NOT NULL DEFAULT '[]'");
      await ensureColumnExists(db, 'stores', 'aliasesJson', "aliasesJson TEXT NOT NULL DEFAULT '[]'");
      await ensureColumnExists(db, 'stores', 'createdAt', "createdAt TEXT NOT NULL DEFAULT ''");
      await ensureColumnExists(db, 'coupons', 'storeId', "storeId TEXT NOT NULL DEFAULT 'unknown'");
      await ensureColumnExists(db, 'coupons', 'storeNameSnapshot', 'storeNameSnapshot TEXT');
      await ensureColumnExists(db, 'coupons', 'storeWebsiteSnapshot', 'storeWebsiteSnapshot TEXT');
      await ensureColumnExists(db, 'submissions', 'storeId', 'storeId TEXT');
      await ensureColumnExists(db, 'submissions', 'storeNameSnapshot', 'storeNameSnapshot TEXT');
      await ensureColumnExists(db, 'submissions', 'storeWebsiteSnapshot', 'storeWebsiteSnapshot TEXT');
      await ensureColumnExists(db, 'submissions', 'category', 'category TEXT');
      await ensureColumnExists(db, 'normalized_coupons', 'storeId', 'storeId TEXT NOT NULL DEFAULT \'unknown\'');
      await ensureColumnExists(db, 'normalized_coupons', 'title', 'title TEXT NOT NULL DEFAULT \'\'');
      await ensureColumnExists(db, 'normalized_coupons', 'canonicalUrl', 'canonicalUrl TEXT NOT NULL DEFAULT \'\'');
      await ensureColumnExists(db, 'normalized_coupons', 'dedupeKey', 'dedupeKey TEXT NOT NULL DEFAULT \'\'');
      await ensureColumnExists(db, 'normalized_coupons', 'updatedAt', 'updatedAt TEXT NOT NULL DEFAULT \'\'');
      await ensureColumnExists(db, 'normalized_coupons', 'expiresAt', 'expiresAt TEXT');
      await ensureColumnExists(db, 'normalized_coupons', 'trustWeight', 'trustWeight REAL NOT NULL DEFAULT 0');
      await ensureColumnExists(db, 'normalized_coupons', 'confidenceScore', 'confidenceScore REAL NOT NULL DEFAULT 0');
      await ensureColumnExists(db, 'normalized_coupons', 'confidenceReasons', "confidenceReasons TEXT NOT NULL DEFAULT '[]'");
      await ensureColumnExists(db, 'normalized_coupons', 'hotScore', 'hotScore REAL NOT NULL DEFAULT 0');
      await ensureColumnExists(db, 'normalized_coupons', 'verifiedScore', 'verifiedScore REAL NOT NULL DEFAULT 0');
      await ensureColumnExists(db, 'normalized_coupons', 'consensus', 'consensus INTEGER NOT NULL DEFAULT 1');
      await ensureColumnExists(db, 'normalized_coupons', 'votesWorked', 'votesWorked INTEGER NOT NULL DEFAULT 0');
      await ensureColumnExists(db, 'normalized_coupons', 'votesFailed', 'votesFailed INTEGER NOT NULL DEFAULT 0');
      await ensureColumnExists(db, 'normalized_coupons', 'status', 'status TEXT NOT NULL DEFAULT \'needs_review\'');
      await ensureColumnExists(db, 'normalized_coupons', 'copyCount', 'copyCount INTEGER NOT NULL DEFAULT 0');
      await ensureColumnExists(db, 'normalized_coupons', 'saveCount', 'saveCount INTEGER NOT NULL DEFAULT 0');
      await ensureColumnExists(db, 'normalized_coupons', 'reportCount', 'reportCount INTEGER NOT NULL DEFAULT 0');
      await ensureColumnExists(db, 'normalized_coupons', 'verified', 'verified INTEGER NOT NULL DEFAULT 0');
      await ensureColumnExists(db, 'normalized_coupons', 'views', 'views INTEGER NOT NULL DEFAULT 0');
      await ensureColumnExists(db, 'normalized_coupons', 'verifiedCount', 'verifiedCount INTEGER NOT NULL DEFAULT 0');
      await ensureColumnExists(db, 'normalized_coupons', 'lastVerifiedAt', 'lastVerifiedAt TEXT');
      await ensureColumnExists(db, 'normalized_coupons', 'flagCount', 'flagCount INTEGER NOT NULL DEFAULT 0');
      await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_normalized_coupons_dedupe ON normalized_coupons(dedupeKey);');
      return db;
    });
  }
  return dbPromise;
};
