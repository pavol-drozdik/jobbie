-- =============================================================================
-- JOBBIE: Full schema for an EMPTY Supabase project
-- Run this entire file in Supabase SQL Editor (e.g. after "Reset database" or
-- on a new project). Do not run on an existing DB that already has migrations.
-- =============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Initial schema: profiles, job_offers, applications, chat_rooms, chat_messages
-- -----------------------------------------------------------------------------

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

create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  reply_to_message_id uuid null
);

create index if not exists idx_chat_messages_room_id_created_at on public.chat_messages(room_id, created_at);

create index if not exists idx_chat_messages_reply_to_message_id on public.chat_messages (reply_to_message_id)
  where reply_to_message_id is not null;

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

alter table public.profiles enable row level security;
alter table public.job_offers enable row level security;
alter table public.applications enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Anyone can read active job offers" on public.job_offers for select using (is_active = true and is_deleted = false);
create policy "Company can read own job offers" on public.job_offers for select using (company_id = auth.uid());
create policy "Company can insert job offers" on public.job_offers for insert with check (company_id = auth.uid());
create policy "Company can update own job offers" on public.job_offers for update using (company_id = auth.uid());

create policy "User can insert own application" on public.applications for insert with check (individual_id = auth.uid());
create policy "User can read own applications" on public.applications for select using (individual_id = auth.uid());
create policy "Job owner can read applications for own jobs" on public.applications for select using (
  exists (select 1 from public.job_offers j where j.id = applications.job_id and j.company_id = auth.uid())
);
create policy "Company can update application status for own jobs" on public.applications for update using (
  exists (select 1 from public.job_offers j where j.id = applications.job_id and j.company_id = auth.uid())
);

create policy "Participants can read chat rooms" on public.chat_rooms for select using (company_id = auth.uid() or individual_id = auth.uid());
create policy "Participants can insert chat room (via app logic)" on public.chat_rooms for insert with check (company_id = auth.uid() or individual_id = auth.uid());

create policy "Room participants can read messages" on public.chat_messages for select using (
  exists (select 1 from public.chat_rooms r where r.id = chat_messages.room_id and (r.company_id = auth.uid() or r.individual_id = auth.uid()))
);
create policy "Room participants can send messages" on public.chat_messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from public.chat_rooms r where r.id = chat_messages.room_id and (r.company_id = auth.uid() or r.individual_id = auth.uid()))
);

alter publication supabase_realtime add table public.chat_messages;

-- -----------------------------------------------------------------------------
-- 2. Profile on signup trigger
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
begin
  set local row_security = off;
  user_role := coalesce(new.raw_user_meta_data->>'role', 'individual');
  if user_role not in ('company', 'individual') then
    user_role := 'individual';
  end if;
  insert into public.profiles (id, role, display_name)
  values (new.id, user_role, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 3. Profile extended (bio, education, skills, job_interests, location, etc.)
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists bio text,
  add column if not exists education text,
  add column if not exists skills text,
  add column if not exists job_interests text,
  add column if not exists location text,
  add column if not exists description text,
  add column if not exists sector text;

-- -----------------------------------------------------------------------------
-- 4. Job offers extended (requirements, salary, job_type, expires_at, is_draft)
-- -----------------------------------------------------------------------------

alter table public.job_offers
  add column if not exists requirements text,
  add column if not exists salary text,
  add column if not exists job_type text,
  add column if not exists expires_at timestamptz,
  add column if not exists is_draft boolean not null default false;

create index if not exists idx_job_offers_is_draft on public.job_offers(is_draft);
create index if not exists idx_job_offers_expires_at on public.job_offers(expires_at);
create index if not exists idx_job_offers_job_type on public.job_offers(job_type);

-- -----------------------------------------------------------------------------
-- 5. Subscription plans and user_subscriptions
-- -----------------------------------------------------------------------------

create table if not exists public.subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name_sk text not null,
  price_monthly_cents int not null default 0,
  stripe_price_id text,
  max_active_jobs int not null default 1,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'unpaid')),
  stripe_subscription_id text,
  stripe_customer_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
create index if not exists idx_user_subscriptions_status on public.user_subscriptions(status);

alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;

create policy "Anyone can read subscription_plans" on public.subscription_plans for select using (true);
create policy "Users can read own user_subscriptions" on public.user_subscriptions for select using (auth.uid() = user_id);
create policy "Service role can manage user_subscriptions" on public.user_subscriptions for all using (false) with check (false);

create trigger subscription_plans_updated_at
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

insert into public.subscription_plans (slug, name_sk, price_monthly_cents, max_active_jobs, sort_order)
values
  ('zadarmo', 'Zadarmo', 0, 1, 0),
  ('basic', '4,99 €/mesiac', 499, 3, 1),
  ('standard', '9,99 €/mesiac', 999, 5, 2),
  ('premium', '14,99 €/mesiac', 1499, 10, 3)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- 6. Job offers base44-style fields
-- -----------------------------------------------------------------------------

alter table public.job_offers
  add column if not exists category text,
  add column if not exists is_urgent boolean not null default false,
  add column if not exists is_featured boolean not null default false,
  add column if not exists compensation_type text,
  add column if not exists compensation_amount numeric,
  add column if not exists workers_needed integer not null default 1,
  add column if not exists location_address text,
  add column if not exists location_lat numeric,
  add column if not exists location_lng numeric,
  add column if not exists application_deadline timestamptz,
  add column if not exists completion_deadline text,
  add column if not exists employer_email text,
  add column if not exists employer_name text,
  add column if not exists photos jsonb default '[]',
  add column if not exists applications_count integer not null default 0;

create index if not exists idx_job_offers_category on public.job_offers(category);
create index if not exists idx_job_offers_is_urgent on public.job_offers(is_urgent) where is_urgent = true;
create index if not exists idx_job_offers_employer_email on public.job_offers(employer_email);

create or replace function public.increment_job_applications_count()
returns trigger as $$
begin
  update public.job_offers set applications_count = applications_count + 1 where id = new.job_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists applications_increment_count on public.applications;
create trigger applications_increment_count
  after insert on public.applications
  for each row execute function public.increment_job_applications_count();

-- -----------------------------------------------------------------------------
-- 7. Job views, impressions, saved_jobs (personalized feed)
-- -----------------------------------------------------------------------------

create table if not exists public.job_views (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.job_offers(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique(user_id, job_id)
);

create index if not exists idx_job_views_user_id_job_id on public.job_views(user_id, job_id);
create index if not exists idx_job_views_user_id_viewed_at on public.job_views(user_id, viewed_at desc);

alter table public.job_views enable row level security;
create policy "Users can insert own job_views" on public.job_views for insert with check (auth.uid() = user_id);
create policy "Users can read own job_views" on public.job_views for select using (auth.uid() = user_id);
create policy "Users can update own job_views" on public.job_views for update using (auth.uid() = user_id);

create table if not exists public.job_impressions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.job_offers(id) on delete cascade,
  shown_at timestamptz not null default now(),
  list_session_id uuid
);

create index if not exists idx_job_impressions_user_id_job_id on public.job_impressions(user_id, job_id);
create index if not exists idx_job_impressions_user_id_shown_at on public.job_impressions(user_id, shown_at desc);

alter table public.job_impressions enable row level security;
create policy "Users can insert own job_impressions" on public.job_impressions for insert with check (auth.uid() = user_id);
create policy "Users can read own job_impressions" on public.job_impressions for select using (auth.uid() = user_id);

create table if not exists public.saved_jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.job_offers(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique(user_id, job_id)
);

create index if not exists idx_saved_jobs_user_id on public.saved_jobs(user_id);
create index if not exists idx_saved_jobs_user_id_job_id on public.saved_jobs(user_id, job_id);

alter table public.saved_jobs enable row level security;
create policy "Users can insert own saved_jobs" on public.saved_jobs for insert with check (auth.uid() = user_id);
create policy "Users can read own saved_jobs" on public.saved_jobs for select using (auth.uid() = user_id);
create policy "Users can delete own saved_jobs" on public.saved_jobs for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 8. Profile roles and company fields (looking_for_work, offering_work, etc.)
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists looking_for_work boolean not null default false,
  add column if not exists offering_work boolean not null default false,
  add column if not exists experience text,
  add column if not exists registration_number text,
  add column if not exists website text,
  add column if not exists logo_url text;

create index if not exists idx_profiles_looking_for_work on public.profiles(looking_for_work) where looking_for_work = true;
create index if not exists idx_profiles_offering_work on public.profiles(offering_work) where offering_work = true;

-- -----------------------------------------------------------------------------
-- 9. Refined registration (first_name, last_name, registered_office, tax_id, vat_id)
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists registered_office text,
  add column if not exists tax_id text,
  add column if not exists vat_id text;
