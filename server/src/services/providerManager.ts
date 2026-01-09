import { activeProviders } from '../providers';
import { upsertCoupon } from './couponRepository';
import { env } from '../env';

export const refreshCoupons = async () => {
  for (const provider of activeProviders) {
    try {
      const coupons = await provider.fetchLatest();
      for (const coupon of coupons) {
        await upsertCoupon(coupon);
      }
    } catch (error) {
      console.error(`Provider ${provider.id} refresh failed:`, error);
    }
  }
};

export const startBackgroundRefresh = () => {
  refreshCoupons();
  const intervalMs = env.refreshMinutes * 60 * 1000;
  setInterval(() => {
    refreshCoupons();
  }, intervalMs);
};
