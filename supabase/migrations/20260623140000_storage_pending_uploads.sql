-- Pending direct-to-storage uploads (init → client upload → finalize).
-- Nest service_role only; clients never DML this table.

create table public.storage_pending_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bucket_id text not null,
  object_path text not null,
  purpose text not null,
  entity_id uuid,
  original_filename text not null,
  sanitized_filename text not null,
  declared_mime text not null,
  extension text not null,
  expected_size_bytes bigint not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (bucket_id, object_path)
);

create index storage_pending_uploads_user_status_created_idx
  on public.storage_pending_uploads (user_id, status, created_at desc);

alter table public.storage_pending_uploads enable row level security;

create policy "storage_pending_uploads: deny all"
  on public.storage_pending_uploads
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.storage_pending_uploads from anon, authenticated;
grant select, insert, update, delete on public.storage_pending_uploads to service_role;
