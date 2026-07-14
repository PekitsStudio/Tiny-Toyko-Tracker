-- Teil 19: gemeinsamer Preis-Cache fuer japanische Pokemon-Karten.
-- Die Edge Function "jp-price" schreibt hier (per service_role, umgeht RLS),
-- alle eingeloggten Nutzer lesen daraus. So wird jede Karte nur einmal pro
-- Gueltigkeitsdauer bei PokemonPriceTracker abgefragt (ein Key reicht fuer alle).

create table if not exists jp_price_cache (
  external_id text primary key,
  price       numeric,
  low         numeric,
  currency    text,
  fetched_at  timestamptz not null default now()
);

alter table jp_price_cache enable row level security;

drop policy if exists "jpc read" on jp_price_cache;
create policy "jpc read" on jp_price_cache for select to authenticated using (true);

grant select on jp_price_cache to authenticated;
-- Schreiben erfolgt ausschliesslich ueber die Edge Function (service_role),
-- daher sind bewusst KEINE insert/update-Policies fuer normale Nutzer gesetzt.
