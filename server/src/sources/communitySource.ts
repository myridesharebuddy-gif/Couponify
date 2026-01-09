import type { NormalizedCoupon } from '../types/normalizedCoupon';
import { SourceConnector } from './source';
import { fetchSubmissions } from '../services/submissionRepository';
import { normalizeCoupon } from '../normalization/normalizeCoupon';

export const communitySource: SourceConnector = {
  id: 'community',
  displayName: 'Community submissions',
  fetch: async () => {
    const entries = await fetchSubmissions();
    const normalized: NormalizedCoupon[] = [];
    for (const entry of entries) {
      if (!entry.code) continue;
      const coupon = normalizeCoupon({
        store: entry.store ?? 'Community Deal',
        domain: entry.storeWebsiteSnapshot ?? entry.link,
        deal: entry.description ?? `Promo code for ${entry.store ?? 'community'}`,
        code: entry.code,
        source: 'Community',
        sourceUrl: entry.link,
        createdAt: entry.postedAtISO,
        confidence: 60
      });
      if (coupon) {
        normalized.push(coupon);
      }
    }
    return normalized;
  }
};
