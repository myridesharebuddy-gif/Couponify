export interface NormalizedCoupon {
  id: string;
  store: string;
  domain: string;
  deal: string;
  code: string;
  source: string;
  sourceUrl: string;
  createdAt: string;
  expiresAt: string | null;
  confidence: number;
  copyCount: number;
  saveCount: number;
  reportCount: number;
  verified: boolean;
}
