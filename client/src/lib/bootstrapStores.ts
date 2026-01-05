import storeSeed from '../data/stores.seed.json';
import { supabase } from './supabase';
import { normalizeStoreKey, slugifyStoreKey } from './normalize';

type StoreSeedItem = {
  name: string;
  category: string;
  slug?: string;
};

export const bootstrapStores = async () => {
  if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    return;
  }

  const storePayload = (storeSeed as StoreSeedItem[]).map((store) => {
    const slug = store.slug ?? slugifyStoreKey(store.name);
    return {
      name: store.name,
      category: store.category,
      slug,
      normalized_name: normalizeStoreKey(store.name)
    };
  });

  await supabase
    .from('stores')
    .upsert(storePayload, { onConflict: 'slug' })
    .select('slug');
};
