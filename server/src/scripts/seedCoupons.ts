import fs from 'fs/promises';
import path from 'path';
import {
  adaptLegacyCoupon,
  upsertNormalizedCoupon
} from '../services/normalizedCouponRepository';
import { normalizeCoupon } from '../normalization/normalizeCoupon';
import type { StoreSeed } from '../services/storeRepository';

const STORE_SEED_PATH = path.resolve(__dirname, '../../data/stores.seed.json');
const DEAL_TEMPLATES = [
  'Save {percent}% on {store} orders (no code required)',
  'Extra {percent}% off select {category} styles with code {code}',
  'Free shipping on {store} orders over {min} with code {code}',
  'Take {percent}% off clearance {category} pieces',
  'Bundle & save {percent}% on purchase when you use {code}'
];

const formatDeal = (template: string, replacements: Record<string, string>) =>
  Object.entries(replacements).reduce(
    (text, [key, value]) => text.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template
  );

const normalizeCode = (storeId: string, index: number) => {
  const alpha = storeId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const prefix = alpha.slice(0, 3).padEnd(3, 'X');
  const suffix = (100 + index).toString(16).toUpperCase();
  return `${prefix}${suffix}`;
};

const run = async () => {
  try {
    const raw = await fs.readFile(STORE_SEED_PATH, 'utf-8');
    const stores: StoreSeed[] = JSON.parse(raw);
    let created = 0;
    const maxStores = Math.min(stores.length, 20);
    for (let storeIndex = 0; storeIndex < maxStores; storeIndex++) {
      const store = stores[storeIndex];
      const domain = store.website;
      const category = store.categories?.[0] ?? 'fashion';
      for (let dealIndex = 0; dealIndex < 4; dealIndex++) {
        const template = DEAL_TEMPLATES[(storeIndex + dealIndex) % DEAL_TEMPLATES.length];
        const percent = 15 + dealIndex * 5;
        const min = 35 + dealIndex * 10;
        const code = normalizeCode(store.id, storeIndex * 4 + dealIndex);
        const deal = formatDeal(template, {
          percent: percent.toString(),
          store: store.name,
          category,
          min: `$${min}`,
          code
        });
        const createdAt = new Date(Date.now() - (storeIndex * 3 + dealIndex) * 60 * 60 * 1000).toISOString();
        const normalized = normalizeCoupon({
          store: store.name,
          domain,
          deal,
          code,
          source: 'LocalSeed',
          sourceUrl: store.website,
          createdAt,
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          confidence: 78
        });
        if (normalized) {
          await upsertNormalizedCoupon(adaptLegacyCoupon(normalized));
          created++;
        } else {
          console.warn(
            `Skipped coupon for ${store.name} code=${code} domain=${domain} deal="${deal}" `
          );
        }
      }
    }
    console.log(`Seeded ${created} normalized coupons`);
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : JSON.stringify(error);
    console.error('Failed to seed normalized coupons', message);
    process.exit(1);
  }
};

run();
