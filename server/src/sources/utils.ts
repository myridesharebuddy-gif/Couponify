import { normalizeDomain } from '../utils/url';

const CODE_PATTERN = /\b(?:code|promo code|coupon code|use code|enter code|apply code)\s*[:\-]?\s*([A-Za-z0-9]{4,})\b/i;

export const extractCodeFromText = (text?: string) => {
  if (!text) return null;
  const matches = text.match(CODE_PATTERN);
  return matches ? matches[1].toUpperCase() : null;
};

export const buildDealFromItem = (title?: string, description?: string) => {
  const pieces = [title, description].filter(Boolean) as string[];
  return pieces.join(' - ').trim();
};

export const ensureDomain = (hintDomain: string | undefined, fallbackUrl: string | undefined) => {
  if (hintDomain) {
    const normalized = normalizeDomain(hintDomain);
    if (normalized) return normalized;
  }
  if (fallbackUrl) {
    const normalized = normalizeDomain(fallbackUrl);
    if (normalized) return normalized;
  }
  return '';
};
