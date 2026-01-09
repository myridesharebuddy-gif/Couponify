export interface LocalCoupon {
  id: string;
  store: string;
  code: string;
  category?: string;
  expiresAt?: string;
  description?: string;
  createdAt: string;
  score?: number;
}
