-- E2EE chat: identity public key on profiles, wide text for ciphertext, private chat-media bucket

alter table public.profiles
  add column if not exists chat_identity_public_key text,
  add column if not exists chat_identity_key_updated_at timestamptz;

comment on column public.profiles.chat_identity_public_key is 'P-256 ECDH public key (SPKI DER base64) for chat E2EE';

-- Postgres text is unlimited; explicit widen not required. Optional comment:
comment on column public.chat_messages.content is 'E2EE ciphertext or legacy plaintext';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/octet-stream']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path: {room_id}/{user_id}/{filename}

drop policy if exists "chat-media insert room participants" on storage.objects;
create policy "chat-media insert room participants"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-media'
  and coalesce(cardinality(storage.foldername(name)), 0) >= 3
  and exists (
    select 1 from public.chat_rooms r
    where r.id::text = (storage.foldername(name))[1]
      and (r.company_id = auth.uid() or r.individual_id = auth.uid())
  )
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "chat-media select room participants" on storage.objects;
create policy "chat-media select room participants"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-media'
  and coalesce(cardinality(storage.foldername(name)), 0) >= 2
  and exists (
    select 1 from public.chat_rooms r
    where r.id::text = (storage.foldername(name))[1]
      and (r.company_id = auth.uid() or r.individual_id = auth.uid())
  )
);

drop policy if exists "chat-media delete own prefix" on storage.objects;
create policy "chat-media delete own prefix"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-media'
  and coalesce(cardinality(storage.foldername(name)), 0) >= 3
  and (storage.foldername(name))[2] = auth.uid()::text
);
