import { normalizeDomain } from './url';
import { resolveStoreFromHint, StoreRecord } from '../services/storeRepository';

export type StoreMatch = Pick<StoreRecord, 'id' | 'name' | 'domain'>;

export const matchStoreFromHint = async (hint?: string, link?: string): Promise<StoreMatch | null> => {
  const resolved = await resolveStoreFromHint(hint, link);
  if (!resolved) {
    return null;
  }
  return {
    id: resolved.id,
    name: resolved.name,
    domain: resolved.domain
  };
};
