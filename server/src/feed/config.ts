import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const CONFIG_PATH = path.resolve(__dirname, '../../config/sources.config.json');
const STORES_PATH = path.resolve(__dirname, '../../config/stores.json');

const sourceSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['rss', 'seeded']),
  url: z.string().url().optional(),
  trust: z.number().min(0).max(1)
});

const feedConfigSchema = z.object({
  popularStores: z.array(z.string()).default([]),
  allowlistedStores: z.array(z.string()).default([]),
  storeAliases: z.record(z.array(z.string())).optional(),
  sources: z.array(sourceSchema)
});

const storeSchema = z.object({
  id: z.string(),
  name: z.string(),
  domains: z.array(z.string()),
  aliases: z.array(z.string()),
  country: z.string(),
  popularityWeight: z.number().int()
});

export type StoreEntry = z.infer<typeof storeSchema>;

const storesFileSchema = z.array(storeSchema);

let cachedFeedConfig: z.infer<typeof feedConfigSchema> | null = null;
let cachedStores: StoreEntry[] | null = null;

export const getFeedConfig = () => {
  if (!cachedFeedConfig) {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    cachedFeedConfig = feedConfigSchema.parse(JSON.parse(raw));
  }
  return cachedFeedConfig;
};

export const getStoreRegistry = () => {
  if (!cachedStores) {
    const raw = fs.readFileSync(STORES_PATH, 'utf-8');
    cachedStores = storesFileSchema.parse(JSON.parse(raw));
  }
  return cachedStores;
};

export const getPublicFeedConfig = () => {
  const config = getFeedConfig();
  return {
    sources: config.sources,
    popularStores: config.popularStores,
    allowlistedStores: config.allowlistedStores
  };
};
