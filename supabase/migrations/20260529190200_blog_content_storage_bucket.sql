-- Inline blog article images (public read; writes via jobbie-admin API service_role only).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-content',
  'blog-content',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "blog-content: public read" on storage.objects;
create policy "blog-content: public read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'blog-content');

-- No authenticated insert/update — Nest admin API uses service_role signed uploads.
