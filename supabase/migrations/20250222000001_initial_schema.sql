-- JOBBIE: profiles (extends auth.users), job_offers, applications, chat_rooms, chat_messages
-- Run in Supabase SQL editor or via supabase db push
-- Tables: profiles (role=company|individual), job_offers (is_active after payment), applications, chat_rooms, chat_messages
-- RLS: users see own profile; active jobs public; applications/chat by role. Realtime enabled on chat_messages.

-- Enable UUID extension if not already
create extension if not exists "uuid-ossp";

-- Profiles: role (company | individual), display name
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('company', 'individual')),
  display_name text,
  company_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_is_deleted on public.profiles(is_deleted);

-- Job offers (companies post after paying)
create table if not exists public.job_offers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  location text,
  contract_type text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false
);

create index if not exists idx_job_offers_company_id on public.job_offers(company_id);
create index if not exists idx_job_offers_is_active_created_at on public.job_offers(is_active, created_at desc);
create index if not exists idx_job_offers_is_deleted on public.job_offers(is_deleted);

-- Applications (users apply to jobs; individual_id = applicant)
create table if not exists public.applications (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.job_offers(id) on delete cascade,
  individual_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  unique(job_id, individual_id)
);

create index if not exists idx_applications_job_id on public.applications(job_id);
create index if not exists idx_applications_individual_id on public.applications(individual_id);
create index if not exists idx_applications_created_at on public.applications(created_at desc);

-- Chat rooms (one per application)
create table if not exists public.chat_rooms (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.job_offers(id) on delete cascade,
  company_id uuid not null references public.profiles(id) on delete cascade,
  individual_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(application_id)
);

create index if not exists idx_chat_rooms_company_id on public.chat_rooms(company_id);
create index if not exists idx_chat_rooms_individual_id on public.chat_rooms(individual_id);

-- Chat messages (Realtime subscription for live chat)
create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_room_id_created_at on public.chat_messages(room_id, created_at);

-- Trigger: set updated_at on profiles, job_offers, applications
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger job_offers_updated_at
  before update on public.job_offers
  for each row execute function public.set_updated_at();
create trigger applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.job_offers enable row level security;
alter table public.applications enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

-- Profiles: users can read/update own
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Job offers: anyone authenticated can read active; company can crud own
create policy "Anyone can read active job offers" on public.job_offers
  for select using (is_active = true and is_deleted = false);
create policy "Company can read own job offers" on public.job_offers
  for select using (company_id = auth.uid());
create policy "Company can insert job offers" on public.job_offers
  for insert with check (company_id = auth.uid());
create policy "Company can update own job offers" on public.job_offers
  for update using (company_id = auth.uid());

-- Applications: any user can create (applicant); can read own applications or applications for own jobs
create policy "User can insert own application" on public.applications
  for insert with check (individual_id = auth.uid());
create policy "User can read own applications" on public.applications
  for select using (individual_id = auth.uid());
create policy "Job owner can read applications for own jobs" on public.applications
  for select using (
    exists (
      select 1 from public.job_offers j
      where j.id = applications.job_id and j.company_id = auth.uid()
    )
  );
create policy "Company can update application status for own jobs" on public.applications
  for update using (
    exists (
      select 1 from public.job_offers j
      where j.id = applications.job_id and j.company_id = auth.uid()
    )
  );

-- Chat rooms: participants only
create policy "Participants can read chat rooms" on public.chat_rooms
  for select using (company_id = auth.uid() or individual_id = auth.uid());
create policy "Participants can insert chat room (via app logic)" on public.chat_rooms
  for insert with check (company_id = auth.uid() or individual_id = auth.uid());

-- Chat messages: room participants can read and insert
create policy "Room participants can read messages" on public.chat_messages
  for select using (
    exists (
      select 1 from public.chat_rooms r
      where r.id = chat_messages.room_id
        and (r.company_id = auth.uid() or r.individual_id = auth.uid())
    )
  );
create policy "Room participants can send messages" on public.chat_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_rooms r
      where r.id = chat_messages.room_id
        and (r.company_id = auth.uid() or r.individual_id = auth.uid())
    )
  );

-- Realtime: enable for chat_messages so Flutter can subscribe
alter publication supabase_realtime add table public.chat_messages;
