-- Teil 23: Freigeschaltete Avatare (Avatar-Shop).
-- Nutzer geben Collector Points (cp) aus, um Avatare freizuschalten. Der Pfad in
-- Supabase Storage ("<Kollektion>/<Set>/<seltenheit>-<name>.jpg") wird hier
-- gespeichert. Das Ausruesten setzt weiterhin user_settings.avatar_url.

alter table user_settings add column if not exists owned_avatars text[] not null default '{}';

-- Der Bucket "avatars" ist public (Download ueber die oeffentliche URL). Zum
-- AUFLISTEN der Dateien im Shop braucht es zusaetzlich eine SELECT-Policy auf
-- storage.objects, sonst liefert .list() eine leere Liste.
drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select to public
  using ( bucket_id = 'avatars' );
