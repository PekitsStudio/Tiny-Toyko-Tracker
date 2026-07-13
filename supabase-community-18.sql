create table if not exists price_alerts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  game text not null,
  external_id text,
  name text not null,
  set_name text,
  image_url text,
  language text,
  currency text default 'EUR',
  target_price numeric not null,
  direction text not null default 'below' check (direction in ('below','above')),
  last_price numeric,
  triggered boolean not null default false,
  created_at timestamptz not null default now()
);
alter table price_alerts enable row level security;
drop policy if exists "pa read" on price_alerts;
drop policy if exists "pa insert" on price_alerts;
drop policy if exists "pa update" on price_alerts;
drop policy if exists "pa delete" on price_alerts;
create policy "pa read"   on price_alerts for select to authenticated using (user_id = auth.uid());
create policy "pa insert" on price_alerts for insert to authenticated with check (user_id = auth.uid());
create policy "pa update" on price_alerts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pa delete" on price_alerts for delete to authenticated using (user_id = auth.uid());
create index if not exists price_alerts_user_idx on price_alerts (user_id, created_at desc);
