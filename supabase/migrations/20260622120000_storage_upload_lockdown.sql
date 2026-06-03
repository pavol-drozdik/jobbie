-- Storage upload lockdown: bucket MIME allowlists and API-only writes for public image buckets.
--
-- Path conventions (Nest service_role uploads):
--   job-photos:        {user_id}/{kind}-{uuid}.jpg
--   profile-avatars:   {user_id}/avatar.jpg  OR  {user_id}/cv/{cv_id}/{uuid}.ext
--   chat-media:        {room_id}/{user_id}/{uuid}.ext  (private; signed URLs)

-- chat-media: enforce MIME allowlist at bucket level (was null = any type).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  15728640,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- job-photos / profile-avatars: writes only via Nest (service_role). Clients may still read public objects.
drop policy if exists "job-photos: authenticated upload" on storage.objects;
drop policy if exists "job-photos: owner update" on storage.objects;

drop policy if exists "profile-avatars: authenticated upload" on storage.objects;
drop policy if exists "profile-avatars: owner update" on storage.objects;
drop policy if exists "profile-avatars: owner delete" on storage.objects;

-- Keep owner delete on job-photos so users can remove their listing photos if needed.
-- (Upload path is API-only; delete may still be used for account cleanup flows.)
