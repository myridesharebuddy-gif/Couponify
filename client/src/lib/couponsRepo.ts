import { supabase } from './supabase';
import { slugifyStoreKey } from './normalize';

export type StoreRecord = {
  id: string;
  name: string;
  slug: string;
  category: string;
};

export type CouponRecord = {
  id: string;
  code: string;
  expires_at: string | null;
  created_at: string;
  upvotes: number;
  downvotes: number;
  store: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export type HotCouponRecord = {
  coupon_id: string;
  store_id: string;
  code: string;
  expires_at: string | null;
  created_at: string;
  copies: number;
  opens: number;
  views: number;
  hot_score: number;
  store_name: string | null;
};

type CouponQueryOptions = {
  sort: 'new';
  limit?: number;
  offset?: number;
  storeSlug?: string;
};

export const getStores = async () => {
  const { data, error } = await supabase
    .from<StoreRecord>('stores')
    .select('id,name,slug,category')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }
  const grouped: Record<string, StoreRecord[]> = {};
  data.forEach((store) => {
    const category = store.category || 'Others';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(store);
  });
  return Object.entries(grouped).map(([title, stores]) => ({ title, stores }));
};

export const getCoupons = async ({ sort, limit = 20, offset = 0, storeSlug }: CouponQueryOptions) => {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from<CouponRecord>('coupons')
    .select('id,code,expires_at,created_at,upvotes,downvotes,status,store_id,stores(id,name,slug)')
    .eq('status', 'active')
    .gte('created_at', sixtyDaysAgo);
  if (storeSlug) {
    query = query.eq('stores.slug', storeSlug);
  }

  query = query.order('created_at', { ascending: false });

  const safeOffset = Math.max(0, offset);
  const rangeEnd = safeOffset + limit - 1;
  query = query.range(safeOffset, Math.max(safeOffset, rangeEnd));

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  const validCoupons = (data ?? []).filter(
    (coupon) => !coupon.expires_at || new Date(coupon.expires_at) >= now
  );
  return validCoupons;
};

type HotCouponQueryOptions = {
  limit?: number;
  hours?: number;
};

type NewCouponRecord = {
  coupon_id: string;
  store_id: string;
  code: string;
  expires_at: string | null;
  created_at: string;
  store_name: string | null;
};

export const getHotCoupons = async ({ limit = 50, hours = 72 }: HotCouponQueryOptions) => {
  const { data, error } = await supabase
    .rpc<HotCouponRecord>('get_hot_coupons', { p_limit: limit, p_hours: hours });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.coupon_id,
    code: item.code,
    expires_at: item.expires_at,
    created_at: item.created_at,
    upvotes: 0,
    downvotes: 0,
    store: item.store_id
      ? {
          id: item.store_id,
          name: item.store_name ?? 'Store',
          slug: ''
        }
      : null
  }));
};

type NewCouponQueryOptions = {
  limit?: number;
};

export const getNewCoupons = async ({ limit = 50 }: NewCouponQueryOptions) => {
  const { data, error } = await supabase
    .rpc<NewCouponRecord>('get_new_coupons', { p_limit: limit });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.coupon_id,
    code: item.code,
    expires_at: item.expires_at,
    created_at: item.created_at,
    upvotes: 0,
    downvotes: 0,
    store: item.store_id
      ? {
          id: item.store_id,
          name: item.store_name ?? 'Store',
          slug: ''
        }
      : null
  }));
};

const ensureStore = async (name: string, category = 'Other') => {
  const slug = slugifyStoreKey(name);
  const { data: bySlug } = await supabase
    .from<StoreRecord>('stores')
    .select('id,name,slug,category')
    .eq('slug', slug)
    .maybeSingle();
  if (bySlug?.id) {
    return bySlug;
  }

  const { data: inserted } = await supabase
    .from<StoreRecord>('stores')
    .insert({
      name,
      category,
      slug
    })
    .select('id,name,slug,category')
    .maybeSingle();

  if (!inserted) {
    throw new Error('Failed to create store');
  }
  return inserted;
};

type SubmitCouponProps = {
  storeName: string;
  code: string;
  expiresAt?: string;
};

export const submitCoupon = async ({ storeName, code, expiresAt }: SubmitCouponProps) => {
  const store = await ensureStore(storeName);
  const { data, error } = await supabase
    .from('coupons')
    .insert({
      store_id: store.id,
      code,
      expires_at: expiresAt ?? null,
      status: 'active'
    })
    .select('id,code,expires_at,created_at,upvotes,downvotes,status,stores(id,name,slug)')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

type VoteCouponProps = {
  couponId: string;
  vote: 'upvote' | 'downvote';
  installId: string;
};

export const voteCoupon = async ({ couponId, vote, installId }: VoteCouponProps) => {
  await supabase
    .from('coupon_votes')
    .upsert(
      {
        coupon_id: couponId,
        install_id: installId,
        vote
      },
      { onConflict: 'coupon_id,install_id' }
    );

  const field = vote === 'upvote' ? 'upvotes' : 'downvotes';
  const { data: existing } = await supabase
    .from('coupons')
    .select(field)
    .eq('id', couponId)
    .maybeSingle();

  if (!existing) {
    return;
  }

  const updatedValue = (existing[field] ?? 0) + 1;
  await supabase.from('coupons').update({ [field]: updatedValue }).eq('id', couponId);
};
