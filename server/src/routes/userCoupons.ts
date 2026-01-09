import { Router } from 'express';
import { normalizeCoupon } from '../normalization/normalizeCoupon';
import { matchStoreFromHint } from '../utils/storeMatch';
import { normalizeDomain, normalizeWebsite } from '../utils/url';
import { adaptLegacyCoupon, upsertNormalizedCoupon } from '../services/normalizedCouponRepository';
import { addCommunitySubmission } from '../services/submissionRepository';

const router = Router();

router.post('/', async (req, res) => {
  const { website, code, deal } = req.body || {};
  if (!website || typeof website !== 'string') {
    return res.status(400).json({ error: 'Website is required' });
  }
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code is required' });
  }
  let normalizedWebsite: string;
  try {
    normalizedWebsite = normalizeWebsite(website);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
  const storeMatch = await matchStoreFromHint(undefined, normalizedWebsite);
  const storeName = storeMatch?.name ?? 'Community';
  const domain = storeMatch?.domain ?? normalizeDomain(normalizedWebsite);
  const dealText =
    typeof deal === 'string' && deal.trim() ? deal.trim() : `Promo code for ${storeName}`;

  const coupon = normalizeCoupon({
    store: storeName,
    domain,
    deal: dealText,
    code,
    source: 'community',
    sourceUrl: normalizedWebsite,
    confidence: 60
  });
  if (!coupon) {
    return res.status(400).json({ error: 'Invalid code or deal' });
  }
  await upsertNormalizedCoupon(adaptLegacyCoupon(coupon));
  await addCommunitySubmission({
    store: storeName,
    code: coupon.code,
    deal: coupon.deal,
    sourceUrl: coupon.sourceUrl
  });
  res.status(201).json({ ok: true, coupon });
});

export default router;
