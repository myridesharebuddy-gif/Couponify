export interface DealItem {
  id: string;
  store: string;
  storeId: string;
  domain: string;
  title: string;
  deal: string;
  code: string;
  source: string;
  sourceUrl: string;
  canonicalUrl: string;
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  trustWeight: number;
  confidenceScore: number;
  hotScore: number;
  verifiedScore: number;
  consensus: number;
  votesWorked: number;
  votesFailed: number;
  status: string;
  copyCount: number;
  saveCount: number;
  reportCount: number;
  confidenceReasons: string[];
  views: number;
  verifiedCount: number;
  lastVerifiedAt: string | null;
  verified: boolean;
}

export type CouponItem = DealItem;
