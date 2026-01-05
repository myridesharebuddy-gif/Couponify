import { getDb } from '../db';
import { getFeedStatus } from '../feed/worker';

export type AdminStats = {
  dealsIngestedToday: number;
  duplicatesDropped: number;
  sourceHealth: ReturnType<typeof getFeedStatus>;
  topStores: Array<{ storeId: string; store: string; count: number }>;
  topCodes: Array<{ code: string; store: string; copies: number }>;
};

export const getAdminStats = async (): Promise<AdminStats> => {
  const db = await getDb();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const startOfDay = today.toISOString();

  const dealsRow = await db.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM normalized_coupons WHERE updatedAt >= ?",
    startOfDay
  );
  const duplicatesRow = await db.get<{ duplicates: number }>(
    "SELECT COALESCE(SUM(duplicates), 0) as duplicates FROM ingestion_history WHERE runAt >= ?",
    startOfDay
  );
  const topStores = (await db.all(
    `
      SELECT storeId, store, COUNT(*) as count
      FROM normalized_coupons
      WHERE status = 'active' AND storeId != 'unknown'
      GROUP BY storeId, store
      ORDER BY count DESC
      LIMIT 8
    `
  )) as Array<{ storeId: string; store: string; count: number }>;
  const topCodes = (await db.all(
    `
      SELECT code, store, SUM(copyCount) as copies
      FROM normalized_coupons
      WHERE code != ''
      GROUP BY code, store
      ORDER BY copies DESC
      LIMIT 8
    `
  )) as Array<{ code: string; store: string; copies: number }>;

  return {
    dealsIngestedToday: dealsRow?.count ?? 0,
    duplicatesDropped: duplicatesRow?.duplicates ?? 0,
    sourceHealth: getFeedStatus(),
    topStores,
    topCodes
  };
};
