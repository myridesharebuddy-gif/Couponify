import crypto from 'crypto';
import { normalizeDomain } from '../utils/url';
import type { NormalizedCoupon } from '../types/normalizedCoupon';

const CODE_MIN_LENGTH = 4;
const DEFAULT_EXPIRY_DAYS = 60;

export const isValidCode = (value?: string | null) => {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < CODE_MIN_LENGTH) return false;
  if (trimmed.includes(' ')) return false;
  if (/https?:\/\//i.test(trimmed)) return false;
  return true;
};

export type NormalizeCouponInput = {
  store: string;
  domain?: string;
  deal: string;
  code?: string | null;
  source: string;
  sourceUrl: string;
  createdAt?: string;
  confidence?: number;
  verified?: boolean;
  expiresAt?: string | null;
  copyCount?: number;
  saveCount?: number;
  reportCount?: number;
  id?: string;
};

export const normalizeCoupon = (input: NormalizeCouponInput): NormalizedCoupon | null => {
  if (!input.deal || !input.deal.trim()) {
    return null;
  }
  if (!isValidCode(input.code)) {
    return null;
  }
  const code = input.code!.trim();
  const domain = normalizeDomain(input.domain ?? input.sourceUrl ?? '');
  if (!domain) {
    return null;
  }
  const createdAt = input.createdAt ?? new Date().toISOString();
  const expiresAt =
    input.expiresAt ??
    new Date(new Date(createdAt).getTime() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: input.id ?? crypto.randomUUID(),
    store: input.store.trim() || 'Unknown store',
    domain,
    deal: input.deal.trim(),
    code,
    source: input.source,
    sourceUrl: input.sourceUrl,
    createdAt,
    expiresAt,
    confidence: Math.max(0, Math.min(100, input.confidence ?? 60)),
    copyCount: input.copyCount ?? 0,
    saveCount: input.saveCount ?? 0,
    reportCount: input.reportCount ?? 0,
    verified: Boolean(input.verified)
  };
};
