import { normalizeDomain } from '../utils/url';
import { getFeedConfig, getStoreRegistry, StoreEntry } from './config';

const storeByDomain = new Map<string, StoreEntry>();
const storeById = new Map<string, StoreEntry>();

const ensureRegistry = () => {
  if (storeById.size > 0) {
    return;
  }
  const stores = getStoreRegistry();
  stores.forEach((store) => {
    storeById.set(store.id, store);
    store.domains.forEach((domain) => {
      storeByDomain.set(domain.toLowerCase(), store);
    });
    store.aliases.forEach((alias) => {
      storeByDomain.set(alias.toLowerCase(), store);
    });
  });
  const feedConfig = getFeedConfig();
  const aliasMap = feedConfig.storeAliases ?? {};
  Object.entries(aliasMap).forEach(([storeId, aliases]) => {
    const target = storeById.get(storeId);
    if (!target) {
      return;
    }
    aliases.forEach((alias) => {
      const normalized = normalizeDomain(alias);
      if (!normalized) {
        return;
      }
      storeByDomain.set(normalized.toLowerCase(), target);
    });
  });
};

export const resolveStoreFromDomain = (value?: string) => {
  if (!value) {
    return null;
  }
  ensureRegistry();
  const domain = normalizeDomain(value);
  if (!domain) {
    return null;
  }
  return storeByDomain.get(domain.toLowerCase()) ?? null;
};

export const getAllStores = () => {
  ensureRegistry();
  return Array.from(storeById.values());
};

export const getStoreById = (id: string) => {
  ensureRegistry();
  return storeById.get(id) ?? null;
};
