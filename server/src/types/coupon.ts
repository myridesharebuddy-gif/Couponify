export type CouponStatus = 'ACTIVE' | 'EXPIRED' | 'REPORTED' | 'UNKNOWN';

export interface CouponStoreSnapshot {
  id: string;
  name: string;
  website: string;
}

export interface CouponItem {
  id: string;
  source: string;
  sourceId?: string;
  title: string;
  description?: string;
  storeId: string;
  store?: CouponStoreSnapshot | null;
  storeNameSnapshot?: string;
  storeWebsiteSnapshot?: string;
  category?: string;
  discountText?: string;
  code?: string;
  link: string;
  postedAtISO: string;
  expiresAtISO?: string;
  verifiedUp: number;
  verifiedDown: number;
  status: CouponStatus;
}
