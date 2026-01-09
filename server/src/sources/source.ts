import type { NormalizedCoupon } from '../types/normalizedCoupon';

export interface SourceConnector {
  id: string;
  displayName: string;
  fetch: () => Promise<NormalizedCoupon[]>;
}
