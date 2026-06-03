-- In-app notifications (Nest service_role writes; users read via API or future direct client with RLS).

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('chat_message', 'job_application')),
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user_created_desc
  on public.user_notifications (user_id, created_at desc);

create index if not exists idx_user_notifications_user_unread
  on public.user_notifications (user_id)
  where read_at is null;

comment on table public.user_notifications is 'Per-user in-app notifications; created by backend on chat/application events.';

alter table public.user_notifications enable row level security;

drop policy if exists "Users read own notifications" on public.user_notifications;
create policy "Users read own notifications"
  on public.user_notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.user_notifications;
create policy "Users update own notifications"
  on public.user_notifications for update
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_notifications to anon, authenticated, service_role;
