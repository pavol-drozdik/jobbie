-- Relax chat-media bucket: allow any MIME type (PDF, Office, etc.) and 15 MB limit to match PWA MAX_CHAT_FILE_BYTES.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  15728640,
  null
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
