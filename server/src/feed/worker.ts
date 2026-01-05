import cron from 'node-cron';
import { ingestSources, IngestionStats } from './ingest';
import { env } from '../env';

let isRunning = false;
let lastRunAt: string | null = null;
let lastSuccessAt: string | null = null;
const sourceStats = new Map<
  string,
  { lastFetchedAt: string | null; itemsFetched: number; inserted: number; duplicates: number }
>();

export const runFeedCycle = async () => {
  if (isRunning) {
    return;
  }
  isRunning = true;
  const now = new Date().toISOString();
  lastRunAt = now;
  try {
    console.log('[feed] starting ingestion cycle');
    const stats: IngestionStats[] = await ingestSources();
    if (stats.length) {
      lastSuccessAt = now;
      stats.forEach((stat) => {
        sourceStats.set(stat.sourceId, {
          lastFetchedAt: now,
          itemsFetched: stat.fetched,
          inserted: stat.inserted,
          duplicates: stat.duplicates
        });
      });
    }
    console.log('[feed] ingestion cycle complete');
  } catch (error) {
    console.error('[feed] ingestion failed', error);
  } finally {
    isRunning = false;
  }
};

export const getFeedStatus = () => ({
  lastRunAt,
  lastSuccessAt,
  sources: Array.from(sourceStats.entries()).map(([id, stats]) => ({
    id,
    lastFetchedAt: stats.lastFetchedAt,
    itemsFetched: stats.itemsFetched,
    inserted: stats.inserted,
    duplicates: stats.duplicates
  }))
});

export const startFeedWorker = () => {
  runFeedCycle();
  cron.schedule(env.ingestCron, () => {
    runFeedCycle();
  });
};
