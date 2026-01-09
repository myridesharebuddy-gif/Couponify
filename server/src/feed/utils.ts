import crypto from 'crypto';
import { URL } from 'url';

export const canonicalizeUrl = (value?: string) => {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    parsed.hash = '';
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    return value.trim();
  }
};

export const extractDomain = (value?: string) => {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return value.trim().toLowerCase();
  }
};

export const extractCode = (text?: string) => {
  if (!text) return '';
  const candidate = text.toUpperCase().match(/\b[A-Z0-9]{4,12}\b/);
  return candidate ? candidate[0] : '';
};

export const summarizeText = (text?: string, limit = 80) => {
  if (!text) return '';
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, limit).trim()}…`;
};

export const normalizeText = (value?: string) => {
  if (!value) {
    return '';
  }
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
};

export const dedupeKey = (storeId: string, code: string, canonicalUrl: string, title: string) => {
  const normalizedTitle = normalizeText(title);
  const normalizedCode = code ? code.toUpperCase() : 'NO_CODE';
  const normalized = `${storeId}|${normalizedCode}|${canonicalUrl}|${normalizedTitle}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
};
