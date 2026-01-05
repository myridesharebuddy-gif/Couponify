import fs from 'fs/promises';
import path from 'path';
import { request } from 'undici';
import { SourceConnector } from './source';
import { normalizeCoupon } from '../normalization/normalizeCoupon';
import { extractCodeFromText } from './utils';
import { sourcesConfig } from '../config/sourcesConfig';

const PROMO_CONFIG_PATH = path.resolve(__dirname, '../../data/brand-promos.json');

const checkRobotsAllows = async (url: string) => {
  try {
    const robotsUrl = `${new URL('/', url).origin}/robots.txt`;
    const response = await request(robotsUrl, { method: 'GET' });
    const text = await response.body.text();
    const disallowLines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.toLowerCase().startsWith('disallow'));
    if (disallowLines.some((line) => line === 'disallow: /')) {
      return false;
    }
  } catch {
    return true;
  }
  return true;
};

export const brandPromoSource: SourceConnector = {
  id: 'brand-promos',
  displayName: 'Brand Promo Pages',
  fetch: async () => {
    if (!sourcesConfig.enabled['brand_promos'] || !sourcesConfig.brandPromoPages.enabled) {
      return [];
    }
    let promoConfig;
    try {
      const raw = await fs.readFile(PROMO_CONFIG_PATH, 'utf-8');
      promoConfig = JSON.parse(raw);
    } catch (error) {
      console.error('Failed to load brand promo config', error);
      return [];
    }
    const coupons = [];
    const allowedDomains = new Set(
      (sourcesConfig.brandPromoPages.domains ?? []).map((value) => value.toLowerCase())
    );
    for (const entry of promoConfig) {
      const { id, displayName, url } = entry as { id: string; displayName: string; url: string };
      const entryDomain = new URL(url).hostname.toLowerCase();
      if (allowedDomains.size > 0 && !allowedDomains.has(entryDomain)) {
        continue;
      }
      if (!(await checkRobotsAllows(url))) {
        console.warn(`Skipping ${displayName} due to robots.txt blocking ${url}`);
        continue;
      }
      try {
        const response = await request(url, { method: 'GET' });
        const html = await response.body.text();
        const code = extractCodeFromText(html);
        if (!code) {
          continue;
        }
        const normalized = normalizeCoupon({
          store: displayName,
          domain: new URL(url).hostname,
          deal: `${displayName} deals`,
          code,
          source: 'BrandPromo',
          sourceUrl: url,
          confidence: 65
        });
        if (normalized) {
          coupons.push(normalized);
        }
      } catch (error) {
        console.error(`Failed to scrape ${displayName} ${url}:`, error);
      }
    }
    return coupons;
  }
};
