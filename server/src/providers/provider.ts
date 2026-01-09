import type { CouponItem } from '../types/coupon';

export interface ProviderOptions {
  maxItems?: number;
}

export interface CouponProvider {
  id: string;
  name: string;
  fetchLatest: (options?: ProviderOptions) => Promise<CouponItem[]>;
}
