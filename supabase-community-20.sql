-- Teil 20: Bild-Uploads via Supabase Storage + Profilbild.
-- Legt einen oeffentlichen Bucket "uploads" an. Jeder eingeloggte Nutzer darf
-- nur in seinen eigenen Ordner (<user_id>/...) schreiben; lesen duerfen alle.

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

drop policy if exists "uploads read" on storage.objects;
create policy "uploads read" on storage.objects
  for select using (bucket_id = 'uploads');

drop policy if exists "uploads insert own" on storage.objects;
create policy "uploads insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "uploads update own" on storage.objects;
create policy "uploads update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "uploads delete own" on storage.objects;
create policy "uploads delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- Profilbild: neue Spalte + kleine oeffentliche Sicht (damit andere den Avatar
-- sehen, ohne die restlichen user_settings offenzulegen).
alter table user_settings add column if not exists avatar_url text;

create or replace view public_avatars as
  select user_id, nullif(trim(avatar_url), '') as avatar_url
  from user_settings;
revoke all on public_avatars from anon;
grant select on public_avatars to authenticated;
