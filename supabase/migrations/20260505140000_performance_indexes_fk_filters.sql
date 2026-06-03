-- Additional B-tree indexes for FK / filter columns used in joins and lookups.

create index if not exists idx_chat_rooms_job_id on public.chat_rooms (job_id);

create index if not exists idx_chat_rooms_application_id on public.chat_rooms (application_id);

create index if not exists idx_chat_messages_sender_id on public.chat_messages (sender_id);

create index if not exists idx_applications_status on public.applications (status)
where coalesce(is_deleted, false) = false;
