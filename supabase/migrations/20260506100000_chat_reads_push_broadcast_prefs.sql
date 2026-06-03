-- Chat read timestamps (two-party rooms), push subscriptions, extended notification types

alter table public.chat_rooms
  add column if not exists company_last_read_at timestamptz,
  add column if not exists individual_last_read_at timestamptz;

comment on column public.chat_rooms.company_last_read_at is 'Last time the employer (company_id) viewed the thread; used for unread counts and read receipts.';
comment on column public.chat_rooms.individual_last_read_at is 'Last time the applicant (individual_id) viewed the thread.';

-- Web Push subscriptions (written by Nest API using service role)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "deny all push_subscriptions" on public.push_subscriptions;
create policy "deny all push_subscriptions"
  on public.push_subscriptions for all
  using (false)
  with check (false);

grant select, insert, update, delete on public.push_subscriptions to service_role;

-- Extend in-app notification types
alter table public.user_notifications drop constraint if exists user_notifications_type_check;

alter table public.user_notifications
  add constraint user_notifications_type_check
  check (
    type in (
      'chat_message',
      'job_application',
      'security_alert',
      'application_status',
      'payment_received',
      'job_status',
      'admin_broadcast',
      'weekly_digest',
      'reengagement'
    )
  );
