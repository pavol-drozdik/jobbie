-- Public bucket for profile avatars (path: {user_id}/avatar.jpg). RLS: users may only write under their uid.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile-avatars: owner insert" on storage.objects;
create policy "profile-avatars: owner insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (auth.uid())::text
);

drop policy if exists "profile-avatars: owner update" on storage.objects;
create policy "profile-avatars: owner update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (auth.uid())::text
);

drop policy if exists "profile-avatars: owner delete" on storage.objects;
create policy "profile-avatars: owner delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (auth.uid())::text
);

drop policy if exists "profile-avatars: public read" on storage.objects;
create policy "profile-avatars: public read"
on storage.objects
for select
to public
using (bucket_id = 'profile-avatars');
