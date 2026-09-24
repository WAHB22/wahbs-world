-- Private buckets. Photos: each object lives under the owner's user id folder.
-- Backups: written only by the daily server job with the service role; no user access.
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('backups', 'backups', false) on conflict (id) do nothing;

drop policy if exists "photos owner read" on storage.objects;
create policy "photos owner read" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "photos owner write" on storage.objects;
create policy "photos owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "photos owner update" on storage.objects;
create policy "photos owner update" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "photos owner delete" on storage.objects;
create policy "photos owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
