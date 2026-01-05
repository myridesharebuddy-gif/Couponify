import type { CouponProvider } from './provider';
import type { CouponItem } from '../types/coupon';

export const manualProvider: CouponProvider = {
  id: 'manual',
  name: 'Manual submissions',
  fetchLatest: async () => [] as CouponItem[]
};
