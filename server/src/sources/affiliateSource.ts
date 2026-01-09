import { request } from 'undici';
import type { NormalizedCoupon } from '../types/normalizedCoupon';
import { SourceConnector } from './source';
import { normalizeCoupon } from '../normalization/normalizeCoupon';
import { normalizeDomain } from '../utils/url';
import { sourcesConfig, AffiliateImportConfig } from '../config/sourcesConfig';

type AffiliateRecord = Record<string, string>;

const parseCsvFeed = (text: string): AffiliateRecord[] => {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((value) => value.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    const record: AffiliateRecord = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });
    return record;
  });
};

const loadAffiliateRecords = async (): Promise<{ config: AffiliateImportConfig; record: AffiliateRecord }[]> => {
  const payload: { config: AffiliateImportConfig; record: AffiliateRecord }[] = [];
  if (!sourcesConfig.affiliateFeeds.enabled) {
    return payload;
  }
  for (const config of sourcesConfig.affiliateFeeds.imports) {
    if (!config.url) {
      console.info(`Skipping affiliate import ${config.id} because URL is not configured`);
      continue;
    }
    if (config.type !== 'url') {
      console.info(`Affiliate import ${config.id} with type ${config.type} is not supported yet`);
      continue;
    }
    try {
      const response = await request(config.url, { method: 'GET' });
      const text = await response.body.text();
      const records = config.format === 'json' ? parseJsonRecords(text) : parseCsvFeed(text);
      for (const record of records) {
        payload.push({ config, record });
      }
    } catch (error) {
      console.error(`Affiliate import ${config.id} failed to load`, error);
    }
  }
  return payload;
};

const parseJsonRecords = (text: string): AffiliateRecord[] => {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase(), String(value ?? '')])) as AffiliateRecord
    );
  } catch {
    return [];
  }
};

export const affiliateSource: SourceConnector = {
  id: 'affiliate',
  displayName: 'Affiliate Feeds',
  fetch: async () => {
    if (!sourcesConfig.enabled['affiliate_feed_import']) {
      return [];
    }
    const normalized: NormalizedCoupon[] = [];
    const entries = await loadAffiliateRecords();
    for (const { config, record } of entries) {
      const mapping = config.mapping;
      const getValue = (key: keyof typeof mapping) => {
        const column = mapping[key];
        return (record[column.toLowerCase()] ?? '').trim();
      };
      const storeValue = getValue('store') || config.label;
      const domainValue = getValue('domain') || getValue('sourceUrl');
      const dealValue = getValue('deal');
      const codeValue = getValue('code');
      const sourceUrl = getValue('sourceUrl');
      if (!domainValue || !dealValue || !codeValue) {
        continue;
      }
      const domain = normalizeDomain(domainValue);
      if (!domain) {
        continue;
      }
      const coupon = normalizeCoupon({
        store: storeValue,
        domain,
        deal: dealValue,
        code: codeValue,
        source: config.label,
        sourceUrl,
        confidence: 70
      });
      if (coupon) {
        normalized.push(coupon);
      }
    }
    return normalized;
  }
};
