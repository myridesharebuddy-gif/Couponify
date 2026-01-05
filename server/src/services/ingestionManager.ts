import { sourcesConfig } from '../config/sourcesConfig';
import { sources } from '../sources';
import {
  adaptLegacyCoupon,
  deleteExpiredNormalizedCoupons,
  upsertNormalizedCoupon
} from './normalizedCouponRepository';

const lastFetchTimes = new Map<string, string>();
const isRunning = { value: false };

export const runIngestion = async () => {
  if (isRunning.value) {
    return;
  }
  isRunning.value = true;
  try {
    for (const source of sources) {
      try {
        const coupons = await source.fetch();
        for (const coupon of coupons) {
          await upsertNormalizedCoupon(adaptLegacyCoupon(coupon));
        }
        lastFetchTimes.set(source.id, new Date().toISOString());
      } catch (error) {
        console.error(`Failed to fetch source ${source.id}:`, error);
      }
    }
    await deleteExpiredNormalizedCoupons();
  } finally {
    isRunning.value = false;
  }
};

export const startIngestionScheduler = () => {
  runIngestion();
  const intervalMs = Math.max(1, sourcesConfig.refreshMinutes) * 60 * 1000;
  console.log(`Ingestion scheduler running every ${intervalMs / 60000} minutes`);
  setInterval(runIngestion, intervalMs);
};

export const getSourceStatuses = () =>
  sources.map((source) => ({
    id: source.id,
    displayName: source.displayName,
    lastFetchedAt: lastFetchTimes.get(source.id) ?? null
  }));
