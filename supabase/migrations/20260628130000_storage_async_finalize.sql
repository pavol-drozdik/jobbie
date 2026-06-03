-- Async storage finalize: processing_status on pending uploads.

alter table public.storage_pending_uploads
  add column if not exists processing_status text not null default 'pending';

alter table public.storage_pending_uploads
  drop constraint if exists storage_pending_uploads_processing_status_check;

alter table public.storage_pending_uploads
  add constraint storage_pending_uploads_processing_status_check
  check (processing_status in ('pending', 'processing', 'ready', 'failed'));

alter table public.storage_pending_uploads
  add column if not exists processed_at timestamptz;

create index if not exists idx_storage_pending_processing
  on public.storage_pending_uploads (processing_status, created_at)
  where status = 'pending';
