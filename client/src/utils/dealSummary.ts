import type { DealItem } from '../types/coupon';

const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const CODE_PATTERN = /\b(?:code|promo code|coupon code|use code|enter code|apply code)\s*[:\-]?\s*([A-Za-z0-9]+)/i;
const BRACKET_PATTERN = /\[[^\]]*\]/g;
const WHITESPACE_PATTERN = /\s+/g;

const sanitizeText = (value: string) => value.replace(WHITESPACE_PATTERN, ' ').trim();
const sanitizeCode = (value: string) => value.replace(/[^A-Za-z0-9]/g, '').trim();

export const extractStore = (deal: DealItem): string => {
  if (deal.store) {
    return deal.store;
  }
  if (deal.domain) {
    return deal.domain.replace(/^www\./i, '');
  }
  const fallback = deal.deal
    .split(/[-•—]/)
    .map((segment) => segment.trim())
    .find(Boolean);
  return fallback || 'Coupon';
};

export const extractSavings = (deal: DealItem): string | null => {
  const text = [deal.deal, deal.source].filter(Boolean).join(' ');
  const patterns: RegExp[] = [
    /\b\d{1,3}%\s*off\b/i,
    /(?:save|savings)\s*\$?\d{1,4}/i,
    /\$\d{1,4}\s*off\b/i,
    /\bfree\b/i,
    /\bbogo\b/i,
    /\bbuy\s+1\s+get\s+1\b/i,
    /\bbuy\s+one\s+get\s+one\b/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return sanitizeText(match[0]);
    }
  }
  return null;
};

export const extractCode = (deal: DealItem): string | null => {
  const explicit = deal.code ? sanitizeCode(deal.code) : '';
  if (explicit) {
    return explicit;
  }
  const text = [deal.deal, deal.source].filter(Boolean).join(' ');
  const matches = text.match(CODE_PATTERN);
  if (matches && matches[1]) {
    const code = sanitizeCode(matches[1]);
    return code || null;
  }
  return null;
};

export const buildShortTitle = (deal: DealItem): string => {
  const rawText = deal.deal || '';
  const cleaned = rawText.replace(URL_PATTERN, '').replace(BRACKET_PATTERN, '');
  const normalized = sanitizeText(cleaned);
  if (!normalized) {
    return 'Deal';
  }
  const sentences = normalized.split(/(?<=[.!?])\s+/).map((segment) => sanitizeText(segment));
  const candidate = sentences.find(Boolean) || normalized;
  const maxLength = 90;
  if (candidate.length > maxLength) {
    return `${candidate.slice(0, maxLength).trim()}…`;
  }
  return candidate;
};
