import type { NormalizedCoupon } from '../types/normalizedCoupon';

export const computeCouponScore = (coupon: NormalizedCoupon, now = Date.now()) => {
  const copyBoost = (coupon.copyCount ?? 0) * 3;
  const saveBoost = (coupon.saveCount ?? 0) * 2;
  const penalty = (coupon.reportCount ?? 0) * 5;
  const verifiedBoost = coupon.verified ? 10 : 0;
  const createdAt = new Date(coupon.createdAt).getTime();
  const hoursSinceCreated = Math.max(0, (now - createdAt) / (1000 * 60 * 60));
  const recencyBoost = Math.max(0, 50 - hoursSinceCreated);
  return copyBoost + saveBoost - penalty + verifiedBoost + recencyBoost;
};
