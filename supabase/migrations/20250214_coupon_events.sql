drop view if exists public.hot_coupons;
drop function if exists public.get_hot_coupons();

create table if not exists public.coupon_events (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  event_type text not null check (event_type in ('coupon_view','coupon_open','coupon_copy','store_open')),
  created_at timestamptz not null default now(),
  install_id text,
  device_platform text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists coupon_events_coupon_id_created_at_idx
  on public.coupon_events (coupon_id, created_at desc);

create index if not exists coupon_events_event_type_created_at_idx
  on public.coupon_events (event_type, created_at desc);

create table if not exists public.owners (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.coupon_events enable row level security;

create policy "Allow anon insert" on public.coupon_events
  for insert to anon
  with check (true);

create policy "Allow authenticated insert" on public.coupon_events
  for insert to authenticated
  with check (true);

create policy "Allow owner select" on public.coupon_events
  for select to authenticated
  using (exists (select 1 from public.owners where user_id = auth.uid()));

create policy "Allow owner update" on public.coupon_events
  for update to authenticated
  using (exists (select 1 from public.owners where user_id = auth.uid()))
  with check (exists (select 1 from public.owners where user_id = auth.uid()));

create policy "Allow owner delete" on public.coupon_events
  for delete to authenticated
  using (exists (select 1 from public.owners where user_id = auth.uid()));

create or replace function public.get_hot_coupons(p_limit int default 50, p_hours int default 72)
returns table (
  coupon_id uuid,
  store_id uuid,
  code text,
  expires_at timestamptz,
  created_at timestamptz,
  copies bigint,
  opens bigint,
  views bigint,
  hot_score numeric,
  store_name text
)
language sql
security definer
set search_path = public
set row_security = off
as $$
  select
    ranked.coupon_id,
    ranked.store_id,
    ranked.code,
    ranked.expires_at,
    ranked.created_at,
    ranked.copies,
    ranked.opens,
    ranked.views,
    (ranked.copies * 5 + ranked.opens * 2 + ranked.views * 0.2) as hot_score,
    ranked.store_name
  from (
    select
      c.id as coupon_id,
      c.store_id,
      c.code,
      c.expires_at,
      c.created_at,
      coalesce(sum(case when e.event_type = 'coupon_copy' then 1 else 0 end), 0) as copies,
      coalesce(sum(case when e.event_type = 'coupon_open' then 1 else 0 end), 0) as opens,
      coalesce(sum(case when e.event_type = 'coupon_view' then 1 else 0 end), 0) as views,
      s.name as store_name
    from public.coupons c
    left join public.coupon_events e
      on e.coupon_id = c.id
      and e.created_at > now() - make_interval(hours => p_hours)
    left join public.stores s on s.id = c.store_id
    group by c.id, c.store_id, c.code, c.expires_at, c.created_at, s.name
  ) ranked
  order by hot_score desc
  limit p_limit;
$$;

alter function public.get_hot_coupons(int, int) owner to postgres;
grant execute on function public.get_hot_coupons(int, int) to anon, authenticated;

create or replace function public.get_new_coupons(p_limit int default 50)
returns table (
  coupon_id uuid,
  store_id uuid,
  code text,
  expires_at timestamptz,
  created_at timestamptz,
  store_name text
)
language sql
security definer
set search_path = public
set row_security = off
as $$
  select
    c.id as coupon_id,
    c.store_id,
    c.code,
    c.expires_at,
    c.created_at,
    s.name as store_name
  from public.coupons c
  left join public.stores s on s.id = c.store_id
  order by c.created_at desc
  limit p_limit;
$$;

alter function public.get_new_coupons(int) owner to postgres;
grant execute on function public.get_new_coupons(int) to anon, authenticated;
