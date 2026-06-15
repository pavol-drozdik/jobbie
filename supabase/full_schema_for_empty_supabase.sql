-- =============================================================================
-- JOBBIE: Full baseline schema for a clean Supabase project
-- Generated: 2026-06-14 from 130 incremental migrations
--
-- Usage (pick one):
--   A) Supabase CLI: copy this file to supabase/migrations/ on a new project, then supabase db push
--   B) SQL Editor: paste/run the entire file on an empty project (no prior JOBBIE schema)
--
-- Do NOT run on a database that already applied the incremental migrations.
-- Includes reference seeds (SK municipalities, education institutions, CV skill catalog).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Source: 20250222000001_initial_schema.sql
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Source: 20250222000002_profile_on_signup.sql
-- -----------------------------------------------------------------------------

-- Create profile row when a new user signs up (auth.users insert).
-- Role comes from raw_user_meta_data.role (Flutter sends this on signUp); default 'individual'.
-- RLS is disabled for this insert because auth.uid() is not set yet during signup.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
begin
  set local row_security = off;
  user_role := coalesce(
    new.raw_user_meta_data->>'role',
    'individual'
  );
  if user_role not in ('company', 'individual') then
    user_role := 'individual';
  end if;
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    user_role,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Source: 20250222000003_rename_student_role_to_individual.sql
-- -----------------------------------------------------------------------------

-- Run this only if you already applied the initial schema with role 'student'.
-- It updates the role check to 'individual' and renames existing student rows.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('company', 'individual'));

update public.profiles set role = 'individual' where role = 'student';

-- -----------------------------------------------------------------------------
-- Source: 20250222000004_rename_student_id_to_individual_id.sql
-- -----------------------------------------------------------------------------

-- Run this only if you already have applications and chat_rooms with student_id column.
-- Renames student_id to individual_id and updates indexes.
-- No-op on fresh installs where initial_schema already uses individual_id.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applications'
      and column_name = 'student_id'
  ) then
    alter table public.applications rename column student_id to individual_id;
    drop index if exists public.idx_applications_student_id;
    create index if not exists idx_applications_individual_id on public.applications (individual_id);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'chat_rooms'
      and column_name = 'student_id'
  ) then
    alter table public.chat_rooms rename column student_id to individual_id;
    drop index if exists public.idx_chat_rooms_student_id;
    create index if not exists idx_chat_rooms_individual_id on public.chat_rooms (individual_id);
  end if;
end
$$;

-- Recreate RLS policies that reference the old column name (drop and recreate)
drop policy if exists "User can insert own application" on public.applications;
drop policy if exists "User can read own applications" on public.applications;
create policy "User can insert own application" on public.applications
  for insert with check (individual_id = auth.uid());
create policy "User can read own applications" on public.applications
  for select using (individual_id = auth.uid());

drop policy if exists "Participants can read chat rooms" on public.chat_rooms;
drop policy if exists "Participants can insert chat room (via app logic)" on public.chat_rooms;
create policy "Participants can read chat rooms" on public.chat_rooms
  for select using (company_id = auth.uid() or individual_id = auth.uid());
create policy "Participants can insert chat room (via app logic)" on public.chat_rooms
  for insert with check (company_id = auth.uid() or individual_id = auth.uid());

drop policy if exists "Room participants can read messages" on public.chat_messages;
drop policy if exists "Room participants can send messages" on public.chat_messages;
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

-- -----------------------------------------------------------------------------
-- Source: 20250222000005_profile_extended.sql
-- -----------------------------------------------------------------------------

-- Add extended profile fields for seekers and suppliers (Slovak app).
-- display_name = Celé meno; company_name = Názov firmy (supplier).
-- New: bio, education, skills, job_interests, location, description, sector.

alter table public.profiles
  add column if not exists bio text,
  add column if not exists education text,
  add column if not exists skills text,
  add column if not exists job_interests text,
  add column if not exists location text,
  add column if not exists description text,
  add column if not exists sector text;

comment on column public.profiles.bio is 'Bio (seeker).';
comment on column public.profiles.education is 'Vzdelanie (seeker).';
comment on column public.profiles.skills is 'Skills (seeker).';
comment on column public.profiles.job_interests is 'O aký druh práce má záujem (seeker).';
comment on column public.profiles.location is 'Lokácia.';
comment on column public.profiles.description is 'Popis firmy alebo krátky popis (supplier).';
comment on column public.profiles.sector is 'Sektor / oblasť pôsobenia (supplier).';

-- -----------------------------------------------------------------------------
-- Source: 20250222000006_job_offers_extended.sql
-- -----------------------------------------------------------------------------

-- Add fields to job_offers: requirements, salary, job_type, expires_at, is_draft.
alter table public.job_offers
  add column if not exists requirements text,
  add column if not exists salary text,
  add column if not exists job_type text,
  add column if not exists expires_at timestamptz,
  add column if not exists is_draft boolean not null default false;

comment on column public.job_offers.requirements is 'Požiadavky.';
comment on column public.job_offers.salary is 'Plat (text, e.g. 10€/h or 500€).';
comment on column public.job_offers.job_type is 'Druh práce.';
comment on column public.job_offers.expires_at is 'Expiračná doba.';
comment on column public.job_offers.is_draft is 'Koncept (draft).';

create index if not exists idx_job_offers_is_draft on public.job_offers(is_draft);
create index if not exists idx_job_offers_expires_at on public.job_offers(expires_at);
create index if not exists idx_job_offers_job_type on public.job_offers(job_type);

-- -----------------------------------------------------------------------------
-- Source: 20250222000007_subscription_plans.sql
-- -----------------------------------------------------------------------------

-- Subscription plans and user subscriptions for JOBBIE.
-- Plans: free + paid tiers. user_subscriptions links user to plan (Stripe subscription).

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

create policy "Anyone can read subscription_plans"
  on public.subscription_plans for select using (true);

create policy "Users can read own user_subscriptions"
  on public.user_subscriptions for select using (auth.uid() = user_id);

create policy "Service role can manage user_subscriptions"
  on public.user_subscriptions for all using (false)
  with check (false);

-- Trigger updated_at for subscription_plans
create trigger subscription_plans_updated_at
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

-- Insert default plans (Slovak). stripe_price_id filled in after creating Stripe Products/Prices.
insert into public.subscription_plans (slug, name_sk, price_monthly_cents, max_active_jobs, sort_order)
values
  ('zadarmo', 'Zadarmo', 0, 1, 0),
  ('basic', '4,99 €/mesiac', 499, 3, 1),
  ('standard', '9,99 €/mesiac', 999, 5, 2),
  ('premium', '14,99 €/mesiac', 1499, 10, 3)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Source: 20250222100000_job_offers_base44.sql
-- -----------------------------------------------------------------------------

-- Base44-style fields on job_offers for 1:1 replication (Supabase + TypeScript backend).
-- category, is_urgent, is_featured, compensation_type, compensation_amount, workers_needed,
-- location_address (alias/sync with location), location_lat/lng, application_deadline, completion_deadline,
-- employer_email, employer_name, photos, applications_count.

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

comment on column public.job_offers.category is 'base44: construction, moving, cleaning, etc.';
comment on column public.job_offers.compensation_type is 'hourly, fixed, on_request, auction';
comment on column public.job_offers.location_address is 'Display address (base44).';
comment on column public.job_offers.photos is 'Array of image URLs.';

create index if not exists idx_job_offers_category on public.job_offers(category);
create index if not exists idx_job_offers_is_urgent on public.job_offers(is_urgent) where is_urgent = true;
create index if not exists idx_job_offers_employer_email on public.job_offers(employer_email);

-- Increment job_offers.applications_count when an application is inserted
create or replace function public.increment_job_applications_count()
returns trigger as $$
begin
  update public.job_offers
  set applications_count = applications_count + 1
  where id = new.job_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists applications_increment_count on public.applications;
create trigger applications_increment_count
  after insert on public.applications
  for each row execute function public.increment_job_applications_count();

-- -----------------------------------------------------------------------------
-- Source: 20250228100000_job_views_impressions_saved_jobs.sql
-- -----------------------------------------------------------------------------

-- Personalized feed: job_views (clicked), job_impressions (shown), saved_jobs.
-- No vector/embedding columns. Used for rule-based scoring only.
-- Scrolled past = has impression for user/job but no view for that user/job.

-- job_views: one row per (user_id, job_id); viewed_at updated on each view (for recency decay).
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

create policy "Users can insert own job_views"
  on public.job_views for insert
  with check (auth.uid() = user_id);

create policy "Users can read own job_views"
  on public.job_views for select
  using (auth.uid() = user_id);

create policy "Users can update own job_views"
  on public.job_views for update
  using (auth.uid() = user_id);

-- job_impressions: jobs shown in list; one row per (user_id, job_id) per batch (optional list_session_id).
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

create policy "Users can insert own job_impressions"
  on public.job_impressions for insert
  with check (auth.uid() = user_id);

create policy "Users can read own job_impressions"
  on public.job_impressions for select
  using (auth.uid() = user_id);

-- saved_jobs: user saved job for later.
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

create policy "Users can insert own saved_jobs"
  on public.saved_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can read own saved_jobs"
  on public.saved_jobs for select
  using (auth.uid() = user_id);

create policy "Users can delete own saved_jobs"
  on public.saved_jobs for delete
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Source: 20250228110000_profile_roles_and_company_fields.sql
-- -----------------------------------------------------------------------------

-- User schema: role flags (looking_for_work, offering_work) and company/individual profile fields.
-- role = account type (individual | company). Step 3 sets looking_for_work/offering_work via PATCH.

alter table public.profiles
  add column if not exists looking_for_work boolean not null default false,
  add column if not exists offering_work boolean not null default false,
  add column if not exists experience text,
  add column if not exists registration_number text,
  add column if not exists website text,
  add column if not exists logo_url text;

comment on column public.profiles.looking_for_work is 'User is looking for work (can apply to jobs).';
comment on column public.profiles.offering_work is 'User offers work (can post job offers).';
comment on column public.profiles.experience is 'Experience description (individual, seeking work).';
comment on column public.profiles.registration_number is 'Company registration number (optional).';
comment on column public.profiles.website is 'Company or user website.';
comment on column public.profiles.logo_url is 'Company logo URL (or avatar for individual).';

create index if not exists idx_profiles_looking_for_work on public.profiles(looking_for_work) where looking_for_work = true;
create index if not exists idx_profiles_offering_work on public.profiles(offering_work) where offering_work = true;

-- -----------------------------------------------------------------------------
-- Source: 20250229100000_profile_refined_registration.sql
-- -----------------------------------------------------------------------------

-- Refined registration: first_name, last_name (individual); registered_office, tax_id, vat_id (company).
-- registration_number = ICO; tax_id = DIC; vat_id = IC DPH.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists registered_office text,
  add column if not exists tax_id text,
  add column if not exists vat_id text;

comment on column public.profiles.first_name is 'Meno (individual).';
comment on column public.profiles.last_name is 'Priezvisko (individual).';
comment on column public.profiles.registered_office is 'Sídlo firmy / adresa (company).';
comment on column public.profiles.tax_id is 'DIČ (company).';
comment on column public.profiles.vat_id is 'IČ DPH (company, optional).';

-- -----------------------------------------------------------------------------
-- Source: 20250301000000_handle_new_user_full_metadata.sql
-- -----------------------------------------------------------------------------

-- Extend handle_new_user to set full profile from raw_user_meta_data
-- (deferred signUp: app sends role, names/company, looking_for_work, offering_work, preferences in one signUp).
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
  meta jsonb;
  v_display_name text;
  v_company_name text;
  v_first_name text;
  v_last_name text;
  v_registered_office text;
  v_registration_number text;
  v_tax_id text;
  v_vat_id text;
  v_looking_for_work boolean;
  v_offering_work boolean;
  v_job_interests text;
  v_location text;
  v_sector text;
begin
  set local row_security = off;
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role := coalesce(meta->>'role', 'individual');
  if user_role not in ('company', 'individual') then
    user_role := 'individual';
  end if;

  v_display_name := coalesce(
    meta->>'display_name',
    meta->>'name',
    trim(coalesce(meta->>'first_name', '') || ' ' || coalesce(meta->>'last_name', ''))
  );
  v_company_name := nullif(trim(meta->>'company_name'), '');
  v_first_name := nullif(trim(meta->>'first_name'), '');
  v_last_name := nullif(trim(meta->>'last_name'), '');
  v_registered_office := nullif(trim(meta->>'registered_office'), '');
  v_registration_number := nullif(trim(meta->>'ico'), '');
  v_tax_id := nullif(trim(meta->>'dic'), '');
  v_vat_id := nullif(trim(meta->>'ic_dph'), '');
  v_looking_for_work := coalesce((meta->>'looking_for_work') = 'true', true);
  v_offering_work := coalesce((meta->>'offering_work') = 'true', true);
  v_job_interests := nullif(trim(meta->>'job_interests'), '');
  v_location := nullif(trim(meta->>'location'), '');
  v_sector := nullif(trim(meta->>'sector'), '');

  insert into public.profiles (
    id,
    role,
    display_name,
    company_name,
    first_name,
    last_name,
    registered_office,
    registration_number,
    tax_id,
    vat_id,
    looking_for_work,
    offering_work,
    job_interests,
    location,
    sector
  )
  values (
    new.id,
    user_role,
    nullif(trim(v_display_name), ''),
    v_company_name,
    v_first_name,
    v_last_name,
    v_registered_office,
    v_registration_number,
    v_tax_id,
    v_vat_id,
    v_looking_for_work,
    v_offering_work,
    v_job_interests,
    v_location,
    v_sector
  )
  on conflict (id) do update set
    role = excluded.role,
    display_name = coalesce(excluded.display_name, profiles.display_name),
    company_name = coalesce(excluded.company_name, profiles.company_name),
    first_name = coalesce(excluded.first_name, profiles.first_name),
    last_name = coalesce(excluded.last_name, profiles.last_name),
    registered_office = coalesce(excluded.registered_office, profiles.registered_office),
    registration_number = coalesce(excluded.registration_number, profiles.registration_number),
    tax_id = coalesce(excluded.tax_id, profiles.tax_id),
    vat_id = coalesce(excluded.vat_id, profiles.vat_id),
    looking_for_work = excluded.looking_for_work,
    offering_work = excluded.offering_work,
    job_interests = coalesce(excluded.job_interests, profiles.job_interests),
    location = coalesce(excluded.location, profiles.location),
    sector = coalesce(excluded.sector, profiles.sector),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- -----------------------------------------------------------------------------
-- Source: 20250302000000_grant_api_roles_public_tables.sql
-- -----------------------------------------------------------------------------

-- Grant table-level permissions so the Data API (anon, authenticated, service_role) can access tables.
-- RLS still applies for anon/authenticated; service_role bypasses RLS. Without these grants you get "permission denied for table".

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on public.profiles to anon, authenticated, service_role;
grant select, insert, update, delete on public.job_offers to anon, authenticated, service_role;
grant select, insert, update, delete on public.applications to anon, authenticated, service_role;
grant select, insert, update, delete on public.chat_rooms to anon, authenticated, service_role;
grant select, insert, update, delete on public.chat_messages to anon, authenticated, service_role;
grant select, insert, update, delete on public.subscription_plans to anon, authenticated, service_role;
grant select, insert, update, delete on public.user_subscriptions to anon, authenticated, service_role;
grant select, insert, update, delete on public.job_views to anon, authenticated, service_role;
grant select, insert, update, delete on public.job_impressions to anon, authenticated, service_role;
grant select, insert, update, delete on public.saved_jobs to anon, authenticated, service_role;

-- Allow service_role to use sequences (for insert default uuid_generate_v4() etc.)
grant usage on all sequences in schema public to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Source: 20250303000000_add_profile_credits.sql
-- -----------------------------------------------------------------------------

-- Add credits to user profiles (purchased via Stripe, spent e.g. per job post).
alter table public.profiles
  add column if not exists credits integer not null default 0;

comment on column public.profiles.credits is 'User credits (bought via Stripe, can be spent on actions).';

-- -----------------------------------------------------------------------------
-- Source: 20250304000000_handle_new_user_drop_looking_offering.sql
-- -----------------------------------------------------------------------------

-- Update handle_new_user to stop using looking_for_work and offering_work
-- (columns dropped in next migration).
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
  meta jsonb;
  v_display_name text;
  v_company_name text;
  v_first_name text;
  v_last_name text;
  v_registered_office text;
  v_registration_number text;
  v_tax_id text;
  v_vat_id text;
  v_job_interests text;
  v_location text;
  v_sector text;
begin
  set local row_security = off;
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role := coalesce(meta->>'role', 'individual');
  if user_role not in ('company', 'individual') then
    user_role := 'individual';
  end if;

  v_display_name := coalesce(
    meta->>'display_name',
    meta->>'name',
    trim(coalesce(meta->>'first_name', '') || ' ' || coalesce(meta->>'last_name', ''))
  );
  v_company_name := nullif(trim(meta->>'company_name'), '');
  v_first_name := nullif(trim(meta->>'first_name'), '');
  v_last_name := nullif(trim(meta->>'last_name'), '');
  v_registered_office := nullif(trim(meta->>'registered_office'), '');
  v_registration_number := nullif(trim(meta->>'ico'), '');
  v_tax_id := nullif(trim(meta->>'dic'), '');
  v_vat_id := nullif(trim(meta->>'ic_dph'), '');
  v_job_interests := nullif(trim(meta->>'job_interests'), '');
  v_location := nullif(trim(meta->>'location'), '');
  v_sector := nullif(trim(meta->>'sector'), '');

  insert into public.profiles (
    id,
    role,
    display_name,
    company_name,
    first_name,
    last_name,
    registered_office,
    registration_number,
    tax_id,
    vat_id,
    job_interests,
    location,
    sector
  )
  values (
    new.id,
    user_role,
    nullif(trim(v_display_name), ''),
    v_company_name,
    v_first_name,
    v_last_name,
    v_registered_office,
    v_registration_number,
    v_tax_id,
    v_vat_id,
    v_job_interests,
    v_location,
    v_sector
  )
  on conflict (id) do update set
    role = excluded.role,
    display_name = coalesce(excluded.display_name, profiles.display_name),
    company_name = coalesce(excluded.company_name, profiles.company_name),
    first_name = coalesce(excluded.first_name, profiles.first_name),
    last_name = coalesce(excluded.last_name, profiles.last_name),
    registered_office = coalesce(excluded.registered_office, profiles.registered_office),
    registration_number = coalesce(excluded.registration_number, profiles.registration_number),
    tax_id = coalesce(excluded.tax_id, profiles.tax_id),
    vat_id = coalesce(excluded.vat_id, profiles.vat_id),
    job_interests = coalesce(excluded.job_interests, profiles.job_interests),
    location = coalesce(excluded.location, profiles.location),
    sector = coalesce(excluded.sector, profiles.sector),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- -----------------------------------------------------------------------------
-- Source: 20250304000001_remove_looking_offering_work_columns.sql
-- -----------------------------------------------------------------------------

-- Remove looking_for_work and offering_work from profiles.
drop index if exists idx_profiles_looking_for_work;
drop index if exists idx_profiles_offering_work;
alter table public.profiles drop column if exists looking_for_work;
alter table public.profiles drop column if exists offering_work;

-- -----------------------------------------------------------------------------
-- Source: 20250316000000_job_photos_storage_bucket.sql
-- -----------------------------------------------------------------------------

-- Storage bucket for job offer photos (used by app-rn Add Job uploads).
-- Public bucket so getPublicUrl() works for display; RLS allows authenticated uploads.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-photos',
  'job-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Allow authenticated users to upload to job-photos (path: {owner_id}/...)
drop policy if exists "job-photos: authenticated upload" on storage.objects;
create policy "job-photos: authenticated upload"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'job-photos');

-- Allow users to update/delete their own objects (folder name = auth.uid())
drop policy if exists "job-photos: owner update" on storage.objects;
create policy "job-photos: owner update"
on storage.objects
for update
to authenticated
using (bucket_id = 'job-photos' and (storage.foldername(name))[1] = (auth.uid())::text);

drop policy if exists "job-photos: owner delete" on storage.objects;
create policy "job-photos: owner delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'job-photos' and (storage.foldername(name))[1] = (auth.uid())::text);

-- Explicit read for all (public bucket)
drop policy if exists "job-photos: public read" on storage.objects;
create policy "job-photos: public read"
on storage.objects
for select
to public
using (bucket_id = 'job-photos');

-- -----------------------------------------------------------------------------
-- Source: 20250317000000_profile_customer_worker_provider_roles.sql
-- -----------------------------------------------------------------------------

-- Add explicit marketplace role flags to profiles.
-- Safe migration: only adds missing columns.

alter table public.profiles
  add column if not exists customer_role boolean not null default false,
  add column if not exists worker_role boolean not null default false,
  add column if not exists provider_role boolean not null default false;

comment on column public.profiles.customer_role is 'User wants to post jobs as customer.';
comment on column public.profiles.worker_role is 'User wants to browse/apply as worker.';
comment on column public.profiles.provider_role is 'User wants to be discoverable as provider.';

-- -----------------------------------------------------------------------------
-- Source: 20260127000000_company_ads.sql
-- -----------------------------------------------------------------------------

-- Company / promo ads (Firmy): browsable listings; credits charged on publish (NestJS enforces business rules).

create table if not exists public.company_ads (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  thumbnail_url text,
  title text not null,
  body text not null,
  category text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'expired')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_ads_owner_id on public.company_ads(owner_id);
create index if not exists idx_company_ads_category on public.company_ads(category);
create index if not exists idx_company_ads_status_ends_at on public.company_ads(status, ends_at desc);

create trigger company_ads_updated_at
  before update on public.company_ads
  for each row execute function public.set_updated_at();

alter table public.company_ads enable row level security;

-- Browse: active, non-expired ads for everyone; owners see all their rows (drafts, expired).
create policy "company_ads_select_public_and_owner"
  on public.company_ads
  for select
  using (
    (status = 'active' and ends_at is not null and ends_at > now())
    or (auth.uid() is not null and owner_id = auth.uid())
  );

create policy "company_ads_insert_owner"
  on public.company_ads
  for insert
  with check (auth.uid() is not null and owner_id = auth.uid());

create policy "company_ads_update_owner"
  on public.company_ads
  for update
  using (auth.uid() is not null and owner_id = auth.uid());

create policy "company_ads_delete_owner"
  on public.company_ads
  for delete
  using (auth.uid() is not null and owner_id = auth.uid());

comment on table public.company_ads is 'Promotional company ads (Firmy); visibility periods and credits handled by API.';

-- -----------------------------------------------------------------------------
-- Source: 20260201000000_profile_reviews_and_notification_prefs.sql
-- -----------------------------------------------------------------------------

-- profile_reviews: writes only via Nest API (Supabase service role). RLS on; no policies for authenticated/anon.
-- notification_preferences: JSON flags for in-app notification preferences (push deferred).

create table if not exists public.profile_reviews (
  id uuid primary key default gen_random_uuid(),
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint profile_reviews_reviewer_reviewee_unique unique (reviewer_id, reviewee_id),
  constraint profile_reviews_no_self check (reviewer_id <> reviewee_id)
);

create index if not exists idx_profile_reviews_reviewee on public.profile_reviews(reviewee_id);
create index if not exists idx_profile_reviews_reviewer on public.profile_reviews(reviewer_id);

alter table public.profile_reviews enable row level security;

comment on table public.profile_reviews is 'User-to-user profile reviews; backend-only writes via service role.';

alter table public.profiles
  add column if not exists notification_preferences jsonb not null default '{"new_applications": true, "messages": true, "reviews": true}'::jsonb;

comment on column public.profiles.notification_preferences is 'Boolean flags: new_applications, messages, reviews (in-app; push not implemented yet).';

-- -----------------------------------------------------------------------------
-- Source: 20260327000000_profile_views.sql
-- -----------------------------------------------------------------------------

-- Profile view events for provider analytics; inserts only via Nest (service role). RLS on; no policies for authenticated/anon.

create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  viewed_profile_id uuid not null references public.profiles(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_profile_views_viewed_profile_viewed_at
  on public.profile_views (viewed_profile_id, viewed_at desc);

create index if not exists idx_profile_views_viewer_viewed_profile_viewed_at
  on public.profile_views (viewer_id, viewed_profile_id, viewed_at desc);

alter table public.profile_views enable row level security;

comment on table public.profile_views is 'Profile page views; backend-only writes via service role. Used for provider dashboard metrics.';

-- -----------------------------------------------------------------------------
-- Source: 20260329180000_grant_profile_reviews_profile_views.sql
-- -----------------------------------------------------------------------------

-- Tables created after 20250302000000_grant_api_roles_public_tables.sql did not receive GRANTs.
-- Without them, Postgres returns "permission denied for table" even for service_role-based server clients.
-- RLS on profile_reviews / profile_views: no policies for anon/authenticated → they still cannot access rows;
-- service_role bypasses RLS in Supabase and can read/write as granted below.

grant select, insert, update, delete on public.profile_reviews to anon, authenticated, service_role;
grant select, insert, update, delete on public.profile_views to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260330100000_grant_company_ads.sql
-- -----------------------------------------------------------------------------

-- company_ads was added in 20260127000000_company_ads.sql after 20250302000000_grant_api_roles_public_tables.sql.
-- Without GRANT, Postgres returns "permission denied for table company_ads" (42501) for the Nest client.

grant select, insert, update, delete on public.company_ads to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260331120000_stripe_credit_fulfillments.sql
-- -----------------------------------------------------------------------------

-- Idempotent application of credit purchases from Stripe (webhook + client confirm).
CREATE TABLE IF NOT EXISTS public.stripe_credit_fulfillments (
  payment_intent_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  credits integer NOT NULL CHECK (credits > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_credit_fulfillments_user_id ON public.stripe_credit_fulfillments (user_id);

ALTER TABLE public.stripe_credit_fulfillments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.stripe_credit_fulfillments IS 'One row per succeeded PaymentIntent for credit packs; prevents double-crediting.';

-- -----------------------------------------------------------------------------
-- Source: 20260331121000_grant_stripe_credit_fulfillments.sql
-- -----------------------------------------------------------------------------

-- Grant access so NestJS backend (service_role) can insert fulfillment rows.
-- Without these grants Postgres returns: "permission denied for table stripe_credit_fulfillments".
grant select, insert, update, delete on public.stripe_credit_fulfillments to anon, authenticated, service_role;

-- Keep RLS enabled, but allow authenticated users to see/insert only their own rows.
-- service_role bypasses RLS anyway.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stripe_credit_fulfillments'
      and policyname = 'authenticated_own_credit_fulfillments'
  ) then
    create policy authenticated_own_credit_fulfillments
      on public.stripe_credit_fulfillments
      for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stripe_credit_fulfillments'
      and policyname = 'service_role_full_credit_fulfillments'
  ) then
    create policy service_role_full_credit_fulfillments
      on public.stripe_credit_fulfillments
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Source: 20260403100000_user_notifications.sql
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Source: 20260407140000_hybrid_search_fts_trgm.sql
-- -----------------------------------------------------------------------------

-- Hybrid search fallback (Postgres FTS + trigram) for jobs and profiles.
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- `unaccent(text)` is STABLE, so it can't be used directly in an index
-- expression. Wrap the dictionary-qualified overload in an IMMUTABLE SQL
-- function (the classic Postgres pattern for this). The wrapper is also
-- used inside the search functions below so predicates match the GIN index
-- expression exactly (otherwise the planner would fall back to seq scans).
create or replace function public.jobbie_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$ select public.unaccent('public.unaccent'::regdictionary, $1) $$;

create index if not exists idx_job_offers_search_tsv
  on public.job_offers
  using gin (
    to_tsvector(
      'simple',
      public.jobbie_unaccent(
        coalesce(title, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(location, '') || ' ' ||
        coalesce(location_address, '')
      )
    )
  );

create index if not exists idx_job_offers_title_trgm
  on public.job_offers using gin (title gin_trgm_ops);
create index if not exists idx_job_offers_description_trgm
  on public.job_offers using gin (description gin_trgm_ops);
create index if not exists idx_job_offers_location_trgm
  on public.job_offers using gin (location gin_trgm_ops);
create index if not exists idx_job_offers_location_address_trgm
  on public.job_offers using gin (location_address gin_trgm_ops);

create index if not exists idx_profiles_search_tsv
  on public.profiles
  using gin (
    to_tsvector(
      'simple',
      public.jobbie_unaccent(
        coalesce(display_name, '') || ' ' ||
        coalesce(company_name, '') || ' ' ||
        coalesce(bio, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(skills, '') || ' ' ||
        coalesce(sector, '') || ' ' ||
        coalesce(location, '')
      )
    )
  );

create index if not exists idx_profiles_display_name_trgm
  on public.profiles using gin (display_name gin_trgm_ops);
create index if not exists idx_profiles_company_name_trgm
  on public.profiles using gin (company_name gin_trgm_ops);
create index if not exists idx_profiles_location_trgm
  on public.profiles using gin (location gin_trgm_ops);

create or replace function public.search_jobs_hybrid(
  p_q text default '',
  p_category text default null,
  p_job_type text default null,
  p_location text default null,
  p_urgent_only boolean default false,
  p_limit int default 20,
  p_offset int default 0
)
returns setof public.job_offers
language sql
stable
as $$
  with base as (
    select j.*
    from public.job_offers j
    where j.is_deleted = false
      and j.is_active = true
      and coalesce(j.is_draft, false) = false
      and (p_category is null or j.category = p_category)
      and (p_job_type is null or j.job_type = p_job_type)
      and (not p_urgent_only or j.is_urgent = true)
      and (
        p_location is null
        or public.jobbie_unaccent(coalesce(j.location, '')) ilike '%' || public.jobbie_unaccent(p_location) || '%'
        or public.jobbie_unaccent(coalesce(j.location_address, '')) ilike '%' || public.jobbie_unaccent(p_location) || '%'
      )
  ),
  ranked as (
    select
      b.*,
      case
        when trim(coalesce(p_q, '')) = '' then 0::float
        else ts_rank_cd(
          to_tsvector(
            'simple',
            public.jobbie_unaccent(
              coalesce(b.title, '') || ' ' ||
              coalesce(b.description, '') || ' ' ||
              coalesce(b.location, '') || ' ' ||
              coalesce(b.location_address, '')
            )
          ),
          websearch_to_tsquery('simple', public.jobbie_unaccent(trim(p_q)))
        )
      end as fts_score,
      case
        when trim(coalesce(p_q, '')) = '' then 0::float
        else greatest(
          similarity(public.jobbie_unaccent(coalesce(b.title, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.description, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.location, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.location_address, '')), public.jobbie_unaccent(trim(p_q)))
        )
      end as trigram_score
    from base b
    where
      trim(coalesce(p_q, '')) = ''
      or to_tsvector(
            'simple',
            public.jobbie_unaccent(
              coalesce(b.title, '') || ' ' ||
              coalesce(b.description, '') || ' ' ||
              coalesce(b.location, '') || ' ' ||
              coalesce(b.location_address, '')
            )
         ) @@ websearch_to_tsquery('simple', public.jobbie_unaccent(trim(p_q)))
      or similarity(public.jobbie_unaccent(coalesce(b.title, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.description, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.location, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.location_address, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
  )
  select j.*
  from ranked r
  join public.job_offers j on j.id = r.id
  order by
    (0.75 * r.fts_score + 0.25 * r.trigram_score + case when j.is_urgent then 0.03 else 0 end) desc,
    j.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

create or replace function public.search_profiles_hybrid(
  p_q text default '',
  p_location text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table(
  id uuid,
  role text,
  display_name text,
  company_name text,
  avatar_url text,
  logo_url text,
  bio text,
  description text,
  location text,
  skills text,
  sector text,
  customer_role boolean,
  worker_role boolean,
  provider_role boolean,
  created_at timestamptz,
  rating_average numeric,
  rating_count int
)
language sql
stable
as $$
  with base as (
    select
      p.id,
      p.role,
      p.display_name,
      p.company_name,
      p.avatar_url,
      p.logo_url,
      p.bio,
      p.description,
      p.location,
      p.skills,
      p.sector,
      p.customer_role,
      p.worker_role,
      p.provider_role,
      p.created_at
    from public.profiles p
    where p.provider_role = true
      and (
        p_location is null
        or public.jobbie_unaccent(coalesce(p.location, '')) ilike '%' || public.jobbie_unaccent(p_location) || '%'
      )
  ),
  ranked as (
    select
      b.*,
      case
        when trim(coalesce(p_q, '')) = '' then 0::float
        else ts_rank_cd(
          to_tsvector(
            'simple',
            public.jobbie_unaccent(
              coalesce(b.display_name, '') || ' ' ||
              coalesce(b.company_name, '') || ' ' ||
              coalesce(b.bio, '') || ' ' ||
              coalesce(b.description, '') || ' ' ||
              coalesce(b.skills, '') || ' ' ||
              coalesce(b.sector, '') || ' ' ||
              coalesce(b.location, '')
            )
          ),
          websearch_to_tsquery('simple', public.jobbie_unaccent(trim(p_q)))
        )
      end as fts_score,
      case
        when trim(coalesce(p_q, '')) = '' then 0::float
        else greatest(
          similarity(public.jobbie_unaccent(coalesce(b.display_name, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.company_name, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.skills, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.location, '')), public.jobbie_unaccent(trim(p_q)))
        )
      end as trigram_score
    from base b
    where
      trim(coalesce(p_q, '')) = ''
      or to_tsvector(
            'simple',
            public.jobbie_unaccent(
              coalesce(b.display_name, '') || ' ' ||
              coalesce(b.company_name, '') || ' ' ||
              coalesce(b.bio, '') || ' ' ||
              coalesce(b.description, '') || ' ' ||
              coalesce(b.skills, '') || ' ' ||
              coalesce(b.sector, '') || ' ' ||
              coalesce(b.location, '')
            )
         ) @@ websearch_to_tsquery('simple', public.jobbie_unaccent(trim(p_q)))
      or similarity(public.jobbie_unaccent(coalesce(b.display_name, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.company_name, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.skills, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.location, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
  )
  select
    r.id,
    r.role,
    r.display_name,
    r.company_name,
    r.avatar_url,
    r.logo_url,
    r.bio,
    r.description,
    r.location,
    r.skills,
    r.sector,
    r.customer_role,
    r.worker_role,
    r.provider_role,
    r.created_at,
    0::numeric as rating_average,
    0::int as rating_count
  from ranked r
  order by (0.8 * r.fts_score + 0.2 * r.trigram_score) desc, r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.jobbie_unaccent(text)
to anon, authenticated, service_role;
grant execute on function public.search_jobs_hybrid(text, text, text, text, boolean, int, int)
to anon, authenticated, service_role;
grant execute on function public.search_profiles_hybrid(text, text, int, int)
to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260421120000_chat_e2ee_and_media.sql
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Source: 20260421180000_search_saved_and_analytics.sql
-- -----------------------------------------------------------------------------

-- Saved searches, email alerts metadata, and search query analytics (backend uses service role).

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text,
  query_json jsonb not null default '{}'::jsonb,
  notify_email boolean not null default false,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_searches_user_id on public.saved_searches (user_id);
create index if not exists idx_saved_searches_notify on public.saved_searches (notify_email)
  where notify_email = true;

create table if not exists public.search_query_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  entity text not null default 'jobs',
  q text,
  filters jsonb,
  result_count integer not null default 0,
  source text,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_search_query_logs_created_at on public.search_query_logs (created_at desc);
create index if not exists idx_search_query_logs_result_count on public.search_query_logs (result_count)
  where result_count = 0;

alter table public.saved_searches enable row level security;
alter table public.search_query_logs enable row level security;

create policy "Users manage own saved searches"
  on public.saved_searches
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No client read/write on analytics; service role bypasses RLS.
create policy "No direct access to search_query_logs"
  on public.search_query_logs
  for all
  using (false)
  with check (false);

-- -----------------------------------------------------------------------------
-- Source: 20260421180500_search_jobs_hybrid_filters.sql
-- -----------------------------------------------------------------------------

-- Extend job search fallback with wage / created / skills filters (Typesense remains primary).

drop function if exists public.search_jobs_hybrid(text, text, text, text, boolean, int, int);

create or replace function public.search_jobs_hybrid(
  p_q text default '',
  p_category text default null,
  p_job_type text default null,
  p_location text default null,
  p_urgent_only boolean default false,
  p_limit int default 20,
  p_offset int default 0,
  p_min_compensation numeric default null,
  p_max_compensation numeric default null,
  p_created_after timestamptz default null,
  p_skills text default null
)
returns setof public.job_offers
language sql
stable
as $$
  with base as (
    select j.*
    from public.job_offers j
    where j.is_deleted = false
      and j.is_active = true
      and coalesce(j.is_draft, false) = false
      and (p_category is null or j.category = p_category)
      and (p_job_type is null or j.job_type = p_job_type)
      and (not p_urgent_only or j.is_urgent = true)
      and (
        p_location is null
        or trim(p_location) = ''
        or public.jobbie_unaccent(coalesce(j.location, '')) ilike '%' || public.jobbie_unaccent(trim(p_location)) || '%'
        or public.jobbie_unaccent(coalesce(j.location_address, '')) ilike '%' || public.jobbie_unaccent(trim(p_location)) || '%'
      )
      and (
        p_min_compensation is null
        or (
          j.compensation_amount is not null
          and j.compensation_amount >= p_min_compensation
        )
      )
      and (
        p_max_compensation is null
        or (
          j.compensation_amount is not null
          and j.compensation_amount <= p_max_compensation
        )
      )
      and (p_created_after is null or j.created_at >= p_created_after)
      and (
        p_skills is null
        or trim(p_skills) = ''
        or exists (
          select 1
          from unnest(string_to_array(p_skills, ',')) as tok(raw)
          where trim(raw) <> ''
            and (
              public.jobbie_unaccent(coalesce(j.requirements, '')) ilike '%'
                || public.jobbie_unaccent(trim(raw)) || '%'
              or public.jobbie_unaccent(coalesce(j.description, '')) ilike '%'
                || public.jobbie_unaccent(trim(raw)) || '%'
            )
        )
      )
  ),
  ranked as (
    select
      b.*,
      case
        when trim(coalesce(p_q, '')) = '' then 0::float
        else ts_rank_cd(
          to_tsvector(
            'simple',
            public.jobbie_unaccent(
              coalesce(b.title, '') || ' ' ||
              coalesce(b.description, '') || ' ' ||
              coalesce(b.location, '') || ' ' ||
              coalesce(b.location_address, '')
            )
          ),
          websearch_to_tsquery('simple', public.jobbie_unaccent(trim(p_q)))
        )
      end as fts_score,
      case
        when trim(coalesce(p_q, '')) = '' then 0::float
        else greatest(
          similarity(public.jobbie_unaccent(coalesce(b.title, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.description, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.location, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.location_address, '')), public.jobbie_unaccent(trim(p_q)))
        )
      end as trigram_score
    from base b
    where
      trim(coalesce(p_q, '')) = ''
      or to_tsvector(
            'simple',
            public.jobbie_unaccent(
              coalesce(b.title, '') || ' ' ||
              coalesce(b.description, '') || ' ' ||
              coalesce(b.location, '') || ' ' ||
              coalesce(b.location_address, '')
            )
         ) @@ websearch_to_tsquery('simple', public.jobbie_unaccent(trim(p_q)))
      or similarity(public.jobbie_unaccent(coalesce(b.title, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.description, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.location, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.location_address, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
  )
  select j.*
  from ranked r
  join public.job_offers j on j.id = r.id
  order by
    (0.75 * r.fts_score + 0.25 * r.trigram_score + case when j.is_urgent then 0.03 else 0 end) desc,
    j.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.search_jobs_hybrid(
  text,
  text,
  text,
  text,
  boolean,
  int,
  int,
  numeric,
  numeric,
  timestamptz,
  text
) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260421183500_search_analytics_rpc.sql
-- -----------------------------------------------------------------------------

create or replace function public.search_analytics_top_queries(
  p_since timestamptz,
  p_limit int default 30
)
returns table(q text, cnt bigint)
language sql
stable
as $$
  select
    coalesce(nullif(trim(s.q), ''), '(empty)') as q,
    count(*)::bigint as cnt
  from public.search_query_logs s
  where s.created_at >= p_since
    and s.entity = 'jobs'
  group by 1
  order by cnt desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

create or replace function public.search_analytics_zero_result_queries(
  p_since timestamptz,
  p_limit int default 30
)
returns table(q text, cnt bigint)
language sql
stable
as $$
  select
    coalesce(nullif(trim(s.q), ''), '(empty)') as q,
    count(*)::bigint as cnt
  from public.search_query_logs s
  where s.created_at >= p_since
    and s.entity = 'jobs'
    and s.result_count = 0
  group by 1
  order by cnt desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

grant execute on function public.search_analytics_top_queries(timestamptz, int)
  to service_role;
grant execute on function public.search_analytics_zero_result_queries(timestamptz, int)
  to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260503120000_enterprise_auth_security.sql
-- -----------------------------------------------------------------------------

-- RBAC app_role, optional scopes, phone, device/session tracking, security notifications

alter table public.profiles
  add column if not exists app_role text not null default 'user'
    check (app_role in ('user', 'employer', 'freelancer', 'admin'));

alter table public.profiles
  add column if not exists extra_permission_scopes text[] not null default '{}'::text[];

alter table public.profiles
  add column if not exists phone_e164 text;

alter table public.profiles
  add column if not exists phone_verified_at timestamptz;

comment on column public.profiles.app_role is 'Primary RBAC role: employer (company jobs), freelancer (individual labor), admin, or generic user.';
comment on column public.profiles.extra_permission_scopes is 'Additional API permission scopes beyond defaults for app_role.';
comment on column public.profiles.phone_e164 is 'E.164 phone number when phone auth/verification is enabled.';

-- Backfill app_role from legacy profile.role (new column defaults to user for all rows)
update public.profiles
set app_role = case
  when role = 'company' then 'employer'
  when role = 'individual' then 'freelancer'
  else 'user'
end;

create index if not exists idx_profiles_app_role on public.profiles (app_role);

-- Failed-login tracking (backend increments via service role only)
create table if not exists public.login_attempt_counters (
  email_normalized text primary key,
  failed_count int not null default 0,
  locked_until timestamptz,
  last_failed_ip text,
  updated_at timestamptz not null default now()
);

alter table public.login_attempt_counters enable row level security;

-- No client access — backend uses service role only
create policy "deny all login_attempt_counters"
  on public.login_attempt_counters for all
  using (false)
  with check (false);

grant select, insert, update, delete on public.login_attempt_counters to service_role;

-- Known devices per user (new-device alerts + session UI)
create table if not exists public.user_device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id text not null,
  user_agent text,
  last_ip text,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index if not exists idx_user_device_sessions_user on public.user_device_sessions (user_id, last_seen desc);

alter table public.user_device_sessions enable row level security;

drop policy if exists "Users manage own device sessions" on public.user_device_sessions;
create policy "Users manage own device sessions"
  on public.user_device_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.user_device_sessions to authenticated;
grant all on public.user_device_sessions to service_role;

-- Extend notification types for security alerts
alter table public.user_notifications drop constraint if exists user_notifications_type_check;

alter table public.user_notifications
  add constraint user_notifications_type_check
  check (type in ('chat_message', 'job_application', 'security_alert'));

-- -----------------------------------------------------------------------------
-- Source: 20260503160000_admin_analytics_rpcs.sql
-- -----------------------------------------------------------------------------

-- Admin analytics RPCs (service_role only). Used by Nest AdminAnalyticsController.

create or replace function public.admin_analytics_funnel(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_signups bigint;
  v_credit_users bigint;
  v_apply_users bigint;
  v_hire_users bigint;
begin
  select count(*)::bigint into v_signups
  from profiles p
  where p.created_at >= p_from and p.created_at <= p_to and not p.is_deleted;

  select count(distinct cl.user_id)::bigint into v_credit_users
  from credit_ledger cl
  where cl.created_at >= p_from and cl.created_at <= p_to
    and cl.delta > 0
    and cl.reason = 'stripe_payment_intent';

  select count(distinct a.individual_id)::bigint into v_apply_users
  from applications a
  where a.created_at >= p_from and a.created_at <= p_to
    and not a.is_deleted;

  select count(distinct a.individual_id)::bigint into v_hire_users
  from applications a
  where not a.is_deleted
    and a.status = 'accepted'
    and a.updated_at >= p_from and a.updated_at <= p_to;

  return jsonb_build_object(
    'signups', v_signups,
    'credit_purchases_distinct_users', v_credit_users,
    'applicants_distinct', v_apply_users,
    'hires_distinct', v_hire_users,
    'conversion_signup_to_credit',
      case when v_signups > 0 then round(v_credit_users::numeric / v_signups, 6) else null end,
    'conversion_signup_to_apply',
      case when v_signups > 0 then round(v_apply_users::numeric / v_signups, 6) else null end,
    'conversion_apply_to_hire',
      case when v_apply_users > 0 then round(v_hire_users::numeric / v_apply_users, 6) else null end
  );
end;
$$;

create or replace function public.admin_analytics_revenue()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  mrr bigint;
  n_pay int;
begin
  select
    coalesce(sum(sp.price_monthly_cents), 0)::bigint,
    count(*)::int
  into mrr, n_pay
  from user_subscriptions us
  join subscription_plans sp on sp.id = us.plan_id
  where us.status = 'active'
    and sp.price_monthly_cents > 0;

  return jsonb_build_object(
    'mrr_cents', mrr,
    'arr_cents', mrr * 12,
    'active_paying_subscribers', n_pay,
    'arpu_cents', case when n_pay > 0 then (mrr / n_pay)::bigint else 0 end
  );
end;
$$;

create or replace function public.admin_analytics_subscription_churn(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'canceled_subscriptions_in_period',
      (select count(*)::bigint
       from user_subscriptions
       where status = 'canceled'
         and updated_at >= p_from
         and updated_at <= p_to)
  );
$$;

create or replace function public.admin_analytics_cohort_weekly(p_weeks int default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb := '[]'::jsonb;
  ws timestamptz;
  we timestamptz;
  now_ts timestamptz := now();
  w int;
  signup_c bigint;
  applied_c bigint;
begin
  w := greatest(1, least(coalesce(p_weeks, 8), 24));
  for i in 0..w - 1 loop
    we := now_ts - (i * interval '7 days');
    ws := we - interval '7 days';
    select count(*)::bigint into signup_c
    from profiles p
    where p.created_at >= ws and p.created_at < we and not p.is_deleted;

    select count(distinct p.id)::bigint into applied_c
    from profiles p
    inner join applications a on a.individual_id = p.id and not a.is_deleted
    where p.created_at >= ws and p.created_at < we and not p.is_deleted
      and a.created_at >= p.created_at
      and a.created_at <= p.created_at + interval '30 days';

    result := result || jsonb_build_array(
      jsonb_build_object(
        'week_start', to_char(ws at time zone 'UTC', 'YYYY-MM-DD'),
        'week_end', to_char(we at time zone 'UTC', 'YYYY-MM-DD'),
        'signups', signup_c,
        'applied_within_30d', applied_c,
        'retention_apply_pct',
          case when signup_c > 0 then round((applied_c::numeric / signup_c) * 100, 2) else null end
      )
    );
  end loop;
  return coalesce(result, '[]'::jsonb);
end;
$$;

revoke all on function public.admin_analytics_funnel(timestamptz, timestamptz) from public;
revoke all on function public.admin_analytics_revenue() from public;
revoke all on function public.admin_analytics_subscription_churn(timestamptz, timestamptz) from public;
revoke all on function public.admin_analytics_cohort_weekly(int) from public;

grant execute on function public.admin_analytics_funnel(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_analytics_revenue() to service_role;
grant execute on function public.admin_analytics_subscription_churn(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_analytics_cohort_weekly(int) to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260503180000_search_jobs_hybrid_category_multi.sql
-- -----------------------------------------------------------------------------

-- OR-match job category when p_category is comma-separated (multi-select).

drop function if exists public.search_jobs_hybrid(
  text,
  text,
  text,
  text,
  boolean,
  int,
  int,
  numeric,
  numeric,
  timestamptz,
  text
);

create or replace function public.search_jobs_hybrid(
  p_q text default '',
  p_category text default null,
  p_job_type text default null,
  p_location text default null,
  p_urgent_only boolean default false,
  p_limit int default 20,
  p_offset int default 0,
  p_min_compensation numeric default null,
  p_max_compensation numeric default null,
  p_created_after timestamptz default null,
  p_skills text default null
)
returns setof public.job_offers
language sql
stable
as $$
  with base as (
    select j.*
    from public.job_offers j
    where j.is_deleted = false
      and j.is_active = true
      and coalesce(j.is_draft, false) = false
      and (
        p_category is null
        or trim(p_category) = ''
        or j.category = any (
          select trim(x)
          from unnest(string_to_array(p_category, ',')) as x
          where trim(x) <> ''
        )
      )
      and (p_job_type is null or j.job_type = p_job_type)
      and (not p_urgent_only or j.is_urgent = true)
      and (
        p_location is null
        or trim(p_location) = ''
        or public.jobbie_unaccent(coalesce(j.location, '')) ilike '%' || public.jobbie_unaccent(trim(p_location)) || '%'
        or public.jobbie_unaccent(coalesce(j.location_address, '')) ilike '%' || public.jobbie_unaccent(trim(p_location)) || '%'
      )
      and (
        p_min_compensation is null
        or (
          j.compensation_amount is not null
          and j.compensation_amount >= p_min_compensation
        )
      )
      and (
        p_max_compensation is null
        or (
          j.compensation_amount is not null
          and j.compensation_amount <= p_max_compensation
        )
      )
      and (p_created_after is null or j.created_at >= p_created_after)
      and (
        p_skills is null
        or trim(p_skills) = ''
        or exists (
          select 1
          from unnest(string_to_array(p_skills, ',')) as tok(raw)
          where trim(raw) <> ''
            and (
              public.jobbie_unaccent(coalesce(j.requirements, '')) ilike '%'
                || public.jobbie_unaccent(trim(raw)) || '%'
              or public.jobbie_unaccent(coalesce(j.description, '')) ilike '%'
                || public.jobbie_unaccent(trim(raw)) || '%'
            )
        )
      )
  ),
  ranked as (
    select
      b.*,
      case
        when trim(coalesce(p_q, '')) = '' then 0::float
        else ts_rank_cd(
          to_tsvector(
            'simple',
            public.jobbie_unaccent(
              coalesce(b.title, '') || ' ' ||
              coalesce(b.description, '') || ' ' ||
              coalesce(b.location, '') || ' ' ||
              coalesce(b.location_address, '')
            )
          ),
          websearch_to_tsquery('simple', public.jobbie_unaccent(trim(p_q)))
        )
      end as fts_score,
      case
        when trim(coalesce(p_q, '')) = '' then 0::float
        else greatest(
          similarity(public.jobbie_unaccent(coalesce(b.title, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.description, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.location, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.location_address, '')), public.jobbie_unaccent(trim(p_q)))
        )
      end as trigram_score
    from base b
    where
      trim(coalesce(p_q, '')) = ''
      or to_tsvector(
            'simple',
            public.jobbie_unaccent(
              coalesce(b.title, '') || ' ' ||
              coalesce(b.description, '') || ' ' ||
              coalesce(b.location, '') || ' ' ||
              coalesce(b.location_address, '')
            )
         ) @@ websearch_to_tsquery('simple', public.jobbie_unaccent(trim(p_q)))
      or similarity(public.jobbie_unaccent(coalesce(b.title, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.description, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.location, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.location_address, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
  )
  select j.*
  from ranked r
  join public.job_offers j on j.id = r.id
  order by
    (0.75 * r.fts_score + 0.25 * r.trigram_score + case when j.is_urgent then 0.03 else 0 end) desc,
    j.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.search_jobs_hybrid(
  text,
  text,
  text,
  text,
  boolean,
  int,
  int,
  numeric,
  numeric,
  timestamptz,
  text
) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260504100000_audit_compliance_logging.sql
-- -----------------------------------------------------------------------------

-- Audit & compliance: append-only audit chain, ledgers, webhook log, client telemetry, storage access.
-- RLS: deny direct client access; backend uses service role.

-- ---------------------------------------------------------------------------
-- applications: allow withdrawn status
-- ---------------------------------------------------------------------------
alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in ('pending', 'accepted', 'rejected', 'withdrawn'));

-- ---------------------------------------------------------------------------
-- Chain state (genesis for HMAC chain computed in API)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_chain_state (
  id int primary key check (id = 1),
  last_row_hash text not null
);

insert into public.audit_chain_state (id, last_row_hash)
values (1, 'GENESIS_AUDIT_CHAIN_ORIGIN')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Main audit log (append-only; hash chain via API)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_events (
  id uuid primary key,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_ip text,
  actor_user_agent text,
  session_id text,
  device_id text,
  event_type text not null,
  subject_type text,
  subject_id uuid,
  payload jsonb not null default '{}'::jsonb,
  prev_row_hash text not null,
  row_hash text not null
);

create index if not exists idx_audit_events_occurred_at on public.audit_events (occurred_at desc);
create index if not exists idx_audit_events_actor_time on public.audit_events (actor_user_id, occurred_at desc);
create index if not exists idx_audit_events_type_time on public.audit_events (event_type, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Atomic insert with chain lock (called from API with precomputed hashes)
-- ---------------------------------------------------------------------------
create or replace function public.insert_audit_event(
  p_id uuid,
  p_occurred_at timestamptz,
  p_actor_user_id uuid,
  p_actor_ip text,
  p_actor_user_agent text,
  p_session_id text,
  p_device_id text,
  p_event_type text,
  p_subject_type text,
  p_subject_id uuid,
  p_payload jsonb,
  p_prev_row_hash text,
  p_row_hash text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_curr text;
begin
  perform pg_advisory_xact_lock(84201931);
  select last_row_hash into v_curr
  from public.audit_chain_state
  where id = 1
  for update;
  if v_curr is distinct from p_prev_row_hash then
    raise exception 'AUDIT_CHAIN_CONFLICT' using errcode = 'P0001';
  end if;
  insert into public.audit_events (
    id, occurred_at, actor_user_id, actor_ip, actor_user_agent,
    session_id, device_id, event_type, subject_type, subject_id,
    payload, prev_row_hash, row_hash
  ) values (
    p_id, coalesce(p_occurred_at, now()), p_actor_user_id,
    nullif(trim(p_actor_ip), ''),
    nullif(trim(p_actor_user_agent), ''),
    nullif(trim(p_session_id), ''),
    nullif(trim(p_device_id), ''),
    p_event_type,
    nullif(trim(p_subject_type), ''),
    p_subject_id,
    coalesce(p_payload, '{}'::jsonb),
    p_prev_row_hash,
    p_row_hash
  );
  update public.audit_chain_state
  set last_row_hash = p_row_hash
  where id = 1;
  return p_id;
end;
$$;

revoke all on function public.insert_audit_event(
  uuid, timestamptz, uuid, text, text, text, text, text, text, uuid, jsonb, text, text
) from public;
grant execute on function public.insert_audit_event(
  uuid, timestamptz, uuid, text, text, text, text, text, text, uuid, jsonb, text, text
) to service_role;

create or replace function public.prevent_audit_events_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events is append-only';
end;
$$;

drop trigger if exists audit_events_no_update on public.audit_events;
create trigger audit_events_no_update
  before update on public.audit_events
  for each row execute function public.prevent_audit_events_mutation();

-- ---------------------------------------------------------------------------
-- Auth security events (each login attempt; complements aggregate counters)
-- ---------------------------------------------------------------------------
create table if not exists public.auth_security_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email_normalized text,
  actor_user_id uuid references auth.users (id) on delete set null,
  event_kind text not null,
  success boolean,
  ip text,
  user_agent text,
  device_id text,
  metadata jsonb default '{}'::jsonb,
  audit_event_id uuid references public.audit_events (id) on delete set null
);

create index if not exists idx_auth_security_events_created on public.auth_security_events (created_at desc);
create index if not exists idx_auth_security_events_email on public.auth_security_events (email_normalized, created_at desc);

-- ---------------------------------------------------------------------------
-- Profile field history (PII: review retention policy)
-- ---------------------------------------------------------------------------
create table if not exists public.profile_field_changes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  audit_event_id uuid references public.audit_events (id) on delete set null
);

create index if not exists idx_profile_field_changes_profile on public.profile_field_changes (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Credit ledger (purchase + spend)
-- ---------------------------------------------------------------------------
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  reason text not null,
  ref_type text,
  ref_id text,
  payment_intent_id text,
  transaction_type text,
  audit_event_id uuid references public.audit_events (id) on delete set null
);

create index if not exists idx_credit_ledger_user_time on public.credit_ledger (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Stripe webhook receipt log
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processing_status text not null default 'received',
  error_message text,
  http_status smallint
);

create index if not exists idx_stripe_webhook_events_received on public.stripe_webhook_events (received_at desc);

-- ---------------------------------------------------------------------------
-- Refunds & disputes (Stripe-driven)
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_financial_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  stripe_event_id text references public.stripe_webhook_events (stripe_event_id) on delete set null,
  category text not null,
  amount_cents bigint,
  currency text,
  charge_id text,
  metadata jsonb default '{}'::jsonb,
  audit_event_id uuid references public.audit_events (id) on delete set null
);

create index if not exists idx_stripe_financial_events_time on public.stripe_financial_events (created_at desc);

-- ---------------------------------------------------------------------------
-- API request logs (sampled)
-- ---------------------------------------------------------------------------
create table if not exists public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  method text not null,
  path text not null,
  status_code int not null,
  latency_ms int not null,
  user_id uuid references auth.users (id) on delete set null,
  request_id text
);

create index if not exists idx_api_request_logs_occurred on public.api_request_logs (occurred_at desc);
create index if not exists idx_api_request_logs_user on public.api_request_logs (user_id, occurred_at desc);

-- Admin analytics RPC (SQL language — must be created after api_request_logs exists).
create or replace function public.admin_analytics_api_latency(
  p_from timestamptz,
  p_to timestamptz,
  p_limit int default 40
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'path', s.path,
          'n', s.n,
          'p50_ms', round(s.p50::numeric, 2),
          'p95_ms', round(s.p95::numeric, 2),
          'avg_ms', round(s.avg_ms::numeric, 2)
        )
        order by s.n desc
      )
      from (
        select
          path,
          count(*)::bigint as n,
          percentile_cont(0.5) within group (order by latency_ms) as p50,
          percentile_cont(0.95) within group (order by latency_ms) as p95,
          avg(latency_ms::double precision) as avg_ms
        from public.api_request_logs
        where occurred_at >= p_from and occurred_at <= p_to
        group by path
        order by count(*) desc
        limit greatest(1, least(coalesce(p_limit, 40), 200))
      ) s
    ),
    '[]'::jsonb
  );
$$;

revoke all on function public.admin_analytics_api_latency(timestamptz, timestamptz, int) from public;
grant execute on function public.admin_analytics_api_latency(timestamptz, timestamptz, int) to service_role;

-- ---------------------------------------------------------------------------
-- Storage access (upload trigger + optional download reporting)
-- ---------------------------------------------------------------------------
create table if not exists public.storage_access_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  bucket_id text not null,
  object_path text not null,
  action text not null check (action in ('upload', 'download')),
  bytes bigint,
  owner_id uuid references auth.users (id) on delete set null
);

create index if not exists idx_storage_access_events_time on public.storage_access_events (created_at desc);
create index if not exists idx_storage_access_events_owner on public.storage_access_events (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Content moderation decisions
-- ---------------------------------------------------------------------------
create table if not exists public.moderation_decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  subject_type text not null,
  subject_id text not null,
  moderator_user_id uuid references auth.users (id) on delete set null,
  decision text not null,
  reason text,
  metadata jsonb default '{}'::jsonb,
  audit_event_id uuid references public.audit_events (id) on delete set null
);

create index if not exists idx_moderation_decisions_time on public.moderation_decisions (created_at desc);

-- ---------------------------------------------------------------------------
-- Client UI telemetry (batched; shorter retention)
-- ---------------------------------------------------------------------------
create table if not exists public.client_event_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  events jsonb not null,
  ip text,
  user_agent text
);

create index if not exists idx_client_event_batches_time on public.client_event_batches (created_at desc);

-- ---------------------------------------------------------------------------
-- Read current chain tip (for verification / repair tools)
-- ---------------------------------------------------------------------------
create or replace function public.get_audit_chain_tip()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select last_row_hash from public.audit_chain_state where id = 1;
$$;

revoke all on function public.get_audit_chain_tip() from public;
grant execute on function public.get_audit_chain_tip() to service_role;

-- ---------------------------------------------------------------------------
-- Storage upload logging (storage schema)
-- ---------------------------------------------------------------------------
create or replace function public.log_storage_object_upload()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sz text;
  b bigint;
begin
  sz := new.metadata->>'size';
  if sz is not null and sz ~ '^[0-9]+$' then
    b := sz::bigint;
  else
    b := null;
  end if;
  insert into public.storage_access_events (
    bucket_id, object_path, action, bytes, owner_id
  ) values (
    new.bucket_id,
    new.name,
    'upload',
    b,
    new.owner
  );
  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists storage_objects_audit_upload on storage.objects;
create trigger storage_objects_audit_upload
  after insert on storage.objects
  for each row execute function public.log_storage_object_upload();

-- ---------------------------------------------------------------------------
-- RLS: block anon/authenticated direct access
-- ---------------------------------------------------------------------------
alter table public.audit_events enable row level security;
alter table public.auth_security_events enable row level security;
alter table public.profile_field_changes enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.stripe_financial_events enable row level security;
alter table public.api_request_logs enable row level security;
alter table public.storage_access_events enable row level security;
alter table public.moderation_decisions enable row level security;
alter table public.client_event_batches enable row level security;

create policy "deny all audit_events" on public.audit_events for all using (false) with check (false);
create policy "deny all auth_security_events" on public.auth_security_events for all using (false) with check (false);
create policy "deny all profile_field_changes" on public.profile_field_changes for all using (false) with check (false);
create policy "deny all credit_ledger" on public.credit_ledger for all using (false) with check (false);
create policy "deny all stripe_webhook_events" on public.stripe_webhook_events for all using (false) with check (false);
create policy "deny all stripe_financial_events" on public.stripe_financial_events for all using (false) with check (false);
create policy "deny all api_request_logs" on public.api_request_logs for all using (false) with check (false);
create policy "deny all storage_access_events" on public.storage_access_events for all using (false) with check (false);
create policy "deny all moderation_decisions" on public.moderation_decisions for all using (false) with check (false);
create policy "deny all client_event_batches" on public.client_event_batches for all using (false) with check (false);

-- chain state: no client access
alter table public.audit_chain_state enable row level security;
create policy "deny all audit_chain_state" on public.audit_chain_state for all using (false) with check (false);

-- -----------------------------------------------------------------------------
-- Source: 20260505140000_performance_indexes_fk_filters.sql
-- -----------------------------------------------------------------------------

-- Additional B-tree indexes for FK / filter columns used in joins and lookups.

create index if not exists idx_chat_rooms_job_id on public.chat_rooms (job_id);

create index if not exists idx_chat_rooms_application_id on public.chat_rooms (application_id);

create index if not exists idx_chat_messages_sender_id on public.chat_messages (sender_id);

create index if not exists idx_applications_status on public.applications (status)
where coalesce(is_deleted, false) = false;

-- -----------------------------------------------------------------------------
-- Source: 20260505160000_chat_reply_to_message.sql
-- -----------------------------------------------------------------------------

-- Single-level reply references (no FK: preserve orphan UUIDs if parent rows are removed).

alter table public.chat_messages
  add column if not exists reply_to_message_id uuid null;

create index if not exists idx_chat_messages_reply_to_message_id
  on public.chat_messages (reply_to_message_id)
  where reply_to_message_id is not null;

-- -----------------------------------------------------------------------------
-- Source: 20260506100000_chat_reads_push_broadcast_prefs.sql
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Source: 20260507120000_sk_municipalities.sql
-- -----------------------------------------------------------------------------

-- Slovak municipalities reference table for job location search.
-- Seed: 20260507120100_sk_municipalities_seed.sql (from supabase/seeds/municipalities-slovakia.csv).

create table if not exists public.sk_municipalities (
  id bigint generated always as identity primary key,
  name text not null,
  kraj text not null,
  okres text not null,
  constraint sk_municipalities_name_okres_key unique (name, okres)
);

comment on table public.sk_municipalities is 'Slovak obce/mestá for add-job location picker; accent-insensitive search via jobbie_unaccent + trgm.';

create index if not exists idx_sk_municipalities_name_unaccent_trgm
  on public.sk_municipalities
  using gin (public.jobbie_unaccent(name) gin_trgm_ops);

alter table public.sk_municipalities enable row level security;

create policy sk_municipalities_select_authenticated
  on public.sk_municipalities
  for select
  to authenticated
  using (true);

create policy sk_municipalities_select_anon
  on public.sk_municipalities
  for select
  to anon
  using (true);

grant select on public.sk_municipalities to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260507120100_sk_municipalities_seed.sql
-- -----------------------------------------------------------------------------

-- Seed: Slovak municipalities (name, kraj, okres)
-- Generated by supabase/scripts/generate_sk_municipalities_seed.py
-- CSV snapshot: supabase/seeds/municipalities-slovakia.csv
-- Original: https://github.com/adammertel/municipalities-slovakia (Wikipedia). Prefer MV SR Register obcí for authoritative updates.
INSERT INTO public.sk_municipalities (name, kraj, okres) VALUES
  ('Ábelová', 'Banskobystrický kraj', 'Lučenec'),
  ('Abovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Abrahám', 'Trnavský kraj', 'Galanta'),
  ('Abrahámovce', 'Prešovský kraj', 'Bardejov'),
  ('Abrahámovce', 'Prešovský kraj', 'Kežmarok'),
  ('Abramová', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Abranovce', 'Prešovský kraj', 'Prešov'),
  ('Adamovské Kochanovce', 'Trenčiansky kraj', 'Trenčín'),
  ('Adidovce', 'Prešovský kraj', 'Humenné'),
  ('Alekšince', 'Nitriansky kraj', 'Nitra'),
  ('Andovce', 'Nitriansky kraj', 'Nové Zámky'),
  ('Andrejová', 'Prešovský kraj', 'Bardejov'),
  ('Ardanovce', 'Nitriansky kraj', 'Topoľčany'),
  ('Ardovo', 'Košický kraj', 'Rožňava'),
  ('Arnutovce', 'Košický kraj', 'Spišská Nová Ves'),
  ('Babie', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Babiná', 'Banskobystrický kraj', 'Zvolen'),
  ('Babindol', 'Nitriansky kraj', 'Nitra'),
  ('Babinec', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Babín', 'Žilinský kraj', 'Námestovo'),
  ('Bacúch', 'Banskobystrický kraj', 'Brezno'),
  ('Bacúrov', 'Banskobystrický kraj', 'Zvolen'),
  ('Bačka', 'Košický kraj', 'Trebišov'),
  ('Bačkov', 'Košický kraj', 'Trebišov'),
  ('Bačkovík', 'Košický kraj', 'Košice-okolie'),
  ('Badín', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Baďan', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Bajany', 'Košický kraj', 'Michalovce'),
  ('Bajč', 'Nitriansky kraj', 'Komárno'),
  ('Bajerov', 'Prešovský kraj', 'Prešov'),
  ('Bajerovce', 'Prešovský kraj', 'Sabinov'),
  ('Bajka', 'Nitriansky kraj', 'Levice'),
  ('Bajtava', 'Nitriansky kraj', 'Nové Zámky'),
  ('Baka', 'Trnavský kraj', 'Dunajská Streda'),
  ('Baláže', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Baldovce', 'Prešovský kraj', 'Levoča'),
  ('Balog nad Ipľom', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Baloň', 'Trnavský kraj', 'Dunajská Streda'),
  ('Banka', 'Trnavský kraj', 'Piešťany'),
  ('Banská Belá', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Banská Bystrica', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Banská Štiavnica', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Banské', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Banský Studenec', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Baňa', 'Prešovský kraj', 'Stropkov'),
  ('Bara', 'Košický kraj', 'Trebišov'),
  ('Barca', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Bardejov', 'Prešovský kraj', 'Bardejov'),
  ('Bardoňovo', 'Nitriansky kraj', 'Nové Zámky'),
  ('Bartošova Lehôtka', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Bartošovce', 'Prešovský kraj', 'Bardejov'),
  ('Baška', 'Košický kraj', 'Košice-okolie'),
  ('Baškovce', 'Prešovský kraj', 'Humenné'),
  ('Baškovce', 'Košický kraj', 'Sobrance'),
  ('Bašovce', 'Trnavský kraj', 'Piešťany'),
  ('Batizovce', 'Prešovský kraj', 'Poprad'),
  ('Báb', 'Nitriansky kraj', 'Nitra'),
  ('Báč', 'Trnavský kraj', 'Dunajská Streda'),
  ('Bádice', 'Nitriansky kraj', 'Nitra'),
  ('Báhoň', 'Bratislavský kraj', 'Pezinok'),
  ('Bánov', 'Nitriansky kraj', 'Nové Zámky'),
  ('Bánovce nad Bebravou', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Bánovce nad Ondavou', 'Košický kraj', 'Michalovce'),
  ('Bátka', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Bátorová', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Bátorove Kosihy', 'Nitriansky kraj', 'Komárno'),
  ('Bátovce', 'Nitriansky kraj', 'Levice'),
  ('Beckov', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Beharovce', 'Prešovský kraj', 'Levoča'),
  ('Becherov', 'Prešovský kraj', 'Bardejov'),
  ('Belá', 'Nitriansky kraj', 'Nové Zámky'),
  ('Belá', 'Žilinský kraj', 'Žilina'),
  ('Belá-Dulice', 'Žilinský kraj', 'Martin'),
  ('Belá nad Cirochou', 'Prešovský kraj', 'Snina'),
  ('Beladice', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Belejovce', 'Prešovský kraj', 'Svidník'),
  ('Belín', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Belina', 'Banskobystrický kraj', 'Lučenec'),
  ('Belince', 'Nitriansky kraj', 'Topoľčany'),
  ('Bellova Ves', 'Trnavský kraj', 'Dunajská Streda'),
  ('Beloveža', 'Prešovský kraj', 'Bardejov'),
  ('Beluj', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Beluša', 'Trenčiansky kraj', 'Púchov'),
  ('Belža', 'Košický kraj', 'Košice-okolie'),
  ('Beniakovce', 'Košický kraj', 'Košice-okolie'),
  ('Benice', 'Žilinský kraj', 'Martin'),
  ('Benkovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Beňadiková', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Beňadikovce', 'Prešovský kraj', 'Svidník'),
  ('Beňadovo', 'Žilinský kraj', 'Námestovo'),
  ('Beňatina', 'Košický kraj', 'Sobrance'),
  ('Beňuš', 'Banskobystrický kraj', 'Brezno'),
  ('Bernolákovo', 'Bratislavský kraj', 'Senec'),
  ('Bertotovce', 'Prešovský kraj', 'Prešov'),
  ('Beša', 'Nitriansky kraj', 'Levice'),
  ('Beša', 'Košický kraj', 'Michalovce'),
  ('Bešeňov', 'Nitriansky kraj', 'Nové Zámky'),
  ('Bešeňová', 'Žilinský kraj', 'Ružomberok'),
  ('Betlanovce', 'Košický kraj', 'Spišská Nová Ves'),
  ('Betliar', 'Košický kraj', 'Rožňava'),
  ('Bežovce', 'Košický kraj', 'Sobrance'),
  ('Bidovce', 'Košický kraj', 'Košice-okolie'),
  ('Biel', 'Košický kraj', 'Trebišov'),
  ('Bielovce', 'Nitriansky kraj', 'Levice'),
  ('Biely Kostol', 'Trnavský kraj', 'Trnava'),
  ('Bijacovce', 'Prešovský kraj', 'Levoča'),
  ('Biskupice', 'Banskobystrický kraj', 'Lučenec'),
  ('Biskupová', 'Nitriansky kraj', 'Topoľčany'),
  ('Bitarová', 'Žilinský kraj', 'Žilina'),
  ('Bílkove Humence', 'Trnavský kraj', 'Senica'),
  ('Bíňa', 'Nitriansky kraj', 'Nové Zámky'),
  ('Bíňovce', 'Trnavský kraj', 'Trnava'),
  ('Blahová', 'Trnavský kraj', 'Dunajská Streda'),
  ('Blatná na Ostrove', 'Trnavský kraj', 'Dunajská Streda'),
  ('Blatná Polianka', 'Košický kraj', 'Sobrance'),
  ('Blatné', 'Bratislavský kraj', 'Senec'),
  ('Blatné Remety', 'Košický kraj', 'Sobrance'),
  ('Blatné Revištia', 'Košický kraj', 'Sobrance'),
  ('Blatnica', 'Žilinský kraj', 'Martin'),
  ('Blažice', 'Košický kraj', 'Košice-okolie'),
  ('Blažovce', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Blesovce', 'Nitriansky kraj', 'Topoľčany'),
  ('Blhovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Bobot', 'Trenčiansky kraj', 'Trenčín'),
  ('Bobrov', 'Žilinský kraj', 'Námestovo'),
  ('Bobrovček', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Bobrovec', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Bobrovník', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Bočiar', 'Košický kraj', 'Košice-okolie'),
  ('Bodíky', 'Trnavský kraj', 'Dunajská Streda'),
  ('Bodiná', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Bodorová', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Bodovce', 'Prešovský kraj', 'Sabinov'),
  ('Bodružal', 'Prešovský kraj', 'Svidník'),
  ('Bodza', 'Nitriansky kraj', 'Komárno'),
  ('Bodzianske Lúky', 'Nitriansky kraj', 'Komárno'),
  ('Bogliarka', 'Prešovský kraj', 'Bardejov'),
  ('Bohdanovce', 'Košický kraj', 'Košice-okolie'),
  ('Bohdanovce nad Trnavou', 'Trnavský kraj', 'Trnava'),
  ('Boheľov', 'Trnavský kraj', 'Dunajská Streda'),
  ('Bohunice', 'Trenčiansky kraj', 'Ilava'),
  ('Bohunice', 'Nitriansky kraj', 'Levice'),
  ('Bohúňovo', 'Košický kraj', 'Rožňava'),
  ('Bojná', 'Nitriansky kraj', 'Topoľčany'),
  ('Bojnice', 'Trenčiansky kraj', 'Prievidza'),
  ('Bojničky', 'Trnavský kraj', 'Hlohovec'),
  ('Boldog', 'Bratislavský kraj', 'Senec'),
  ('Boleráz', 'Trnavský kraj', 'Trnava'),
  ('Bolešov', 'Trenčiansky kraj', 'Ilava'),
  ('Boliarov', 'Košický kraj', 'Košice-okolie'),
  ('Boľ', 'Košický kraj', 'Trebišov'),
  ('Boľkovce', 'Banskobystrický kraj', 'Lučenec'),
  ('Borcová', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Borčany', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Borčice', 'Trenčiansky kraj', 'Ilava'),
  ('Borinka', 'Bratislavský kraj', 'Malacky'),
  ('Borová', 'Trnavský kraj', 'Trnava'),
  ('Borovce', 'Trnavský kraj', 'Piešťany'),
  ('Borský Mikuláš', 'Trnavský kraj', 'Senica'),
  ('Borský Svätý Jur', 'Trnavský kraj', 'Senica'),
  ('Borša', 'Košický kraj', 'Trebišov'),
  ('Bory', 'Nitriansky kraj', 'Levice'),
  ('Bošáca', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Bošany', 'Trenčiansky kraj', 'Partizánske'),
  ('Bottovo', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Boťany', 'Košický kraj', 'Trebišov'),
  ('Bôrka', 'Košický kraj', 'Rožňava'),
  ('Bracovce', 'Košický kraj', 'Michalovce'),
  ('Branč', 'Nitriansky kraj', 'Nitra'),
  ('Branovo', 'Nitriansky kraj', 'Nové Zámky'),
  ('Bratislava', 'Bratislavský', 'Bratislava'),
  ('Braväcovo', 'Banskobystrický kraj', 'Brezno'),
  ('Brdárka', 'Košický kraj', 'Rožňava'),
  ('Brehov', 'Košický kraj', 'Trebišov'),
  ('Brehy', 'Banskobystrický kraj', 'Žarnovica'),
  ('Brekov', 'Prešovský kraj', 'Humenné'),
  ('Brestov', 'Prešovský kraj', 'Humenné'),
  ('Brestov', 'Prešovský kraj', 'Prešov'),
  ('Brestov nad Laborcom', 'Prešovský kraj', 'Medzilaborce'),
  ('Brestovany', 'Trnavský kraj', 'Trnava'),
  ('Brestovec', 'Trenčiansky kraj', 'Myjava'),
  ('Brestovec', 'Nitriansky kraj', 'Komárno'),
  ('Bretejovce', 'Prešovský kraj', 'Prešov'),
  ('Bretka', 'Košický kraj', 'Rožňava'),
  ('Breza', 'Žilinský kraj', 'Námestovo'),
  ('Brezany', 'Žilinský kraj', 'Žilina'),
  ('Brezina', 'Košický kraj', 'Trebišov'),
  ('Breziny', 'Banskobystrický kraj', 'Zvolen'),
  ('Breznica', 'Prešovský kraj', 'Stropkov'),
  ('Breznička', 'Banskobystrický kraj', 'Poltár'),
  ('Breznička', 'Prešovský kraj', 'Stropkov'),
  ('Brezno', 'Banskobystrický kraj', 'Brezno'),
  ('Brezolupy', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Brezov', 'Prešovský kraj', 'Bardejov'),
  ('Brezová pod Bradlom', 'Trenčiansky kraj', 'Myjava'),
  ('Brezovec', 'Prešovský kraj', 'Snina'),
  ('Brezovica', 'Prešovský kraj', 'Sabinov'),
  ('Brezovica', 'Žilinský kraj', 'Tvrdošín'),
  ('Brezovička', 'Prešovský kraj', 'Sabinov'),
  ('Brezovka', 'Prešovský kraj', 'Bardejov'),
  ('Brežany', 'Prešovský kraj', 'Prešov'),
  ('Brhlovce', 'Nitriansky kraj', 'Levice'),
  ('Brieštie', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Brodské', 'Trnavský kraj', 'Skalica'),
  ('Brodzany', 'Trenčiansky kraj', 'Partizánske'),
  ('Brunovce', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Brusnica', 'Prešovský kraj', 'Stropkov'),
  ('Brusník', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Brusno', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Brutovce', 'Prešovský kraj', 'Levoča'),
  ('Bruty', 'Nitriansky kraj', 'Nové Zámky'),
  ('Brvnište', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Brzotín', 'Košický kraj', 'Rožňava'),
  ('Buclovany', 'Prešovský kraj', 'Bardejov'),
  ('Bučany', 'Trnavský kraj', 'Trnava'),
  ('Budča', 'Banskobystrický kraj', 'Zvolen'),
  ('Budikovany', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Budimír', 'Košický kraj', 'Košice-okolie'),
  ('Budiná', 'Banskobystrický kraj', 'Lučenec'),
  ('Budince', 'Košický kraj', 'Michalovce'),
  ('Budiš', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Budkovce', 'Košický kraj', 'Michalovce'),
  ('Budmerice', 'Bratislavský kraj', 'Pezinok'),
  ('Buglovce', 'Prešovský kraj', 'Levoča'),
  ('Buková', 'Trnavský kraj', 'Trnava'),
  ('Bukovce', 'Prešovský kraj', 'Stropkov'),
  ('Bukovec', 'Košický kraj', 'Košice-okolie'),
  ('Bukovec', 'Trenčiansky kraj', 'Myjava'),
  ('Bukovina', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Bulhary', 'Banskobystrický kraj', 'Lučenec'),
  ('Bunetice', 'Košický kraj', 'Košice-okolie'),
  ('Bunkovce', 'Košický kraj', 'Sobrance'),
  ('Bušince', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Bušovce', 'Prešovský kraj', 'Kežmarok'),
  ('Buzica', 'Košický kraj', 'Košice-okolie'),
  ('Buzitka', 'Banskobystrický kraj', 'Lučenec'),
  ('Búč', 'Nitriansky kraj', 'Komárno'),
  ('Bystrá', 'Banskobystrický kraj', 'Brezno'),
  ('Bystrá', 'Prešovský kraj', 'Stropkov'),
  ('Bystrany', 'Košický kraj', 'Spišská Nová Ves'),
  ('Bystré', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Bystričany', 'Trenčiansky kraj', 'Prievidza'),
  ('Bystrička', 'Žilinský kraj', 'Martin'),
  ('Byšta', 'Košický kraj', 'Trebišov'),
  ('Bytča', 'Žilinský kraj', 'Bytča'),
  ('Bzenica', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Bzenov', 'Prešovský kraj', 'Prešov'),
  ('Bzince pod Javorinou', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Bziny', 'Žilinský kraj', 'Dolný Kubín'),
  ('Bzovík', 'Banskobystrický kraj', 'Krupina'),
  ('Bzovská Lehôtka', 'Banskobystrický kraj', 'Zvolen'),
  ('Bžany', 'Prešovský kraj', 'Stropkov'),
  ('Cabaj-Čápor', 'Nitriansky kraj', 'Nitra'),
  ('Cabov', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Cakov', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Cejkov', 'Košický kraj', 'Trebišov'),
  ('Cernina', 'Prešovský kraj', 'Svidník'),
  ('Cerová', 'Trnavský kraj', 'Senica'),
  ('Cerovo', 'Banskobystrický kraj', 'Krupina'),
  ('Cestice', 'Košický kraj', 'Košice-okolie'),
  ('Cigeľ', 'Trenčiansky kraj', 'Prievidza'),
  ('Cigeľka', 'Prešovský kraj', 'Bardejov'),
  ('Cigla', 'Prešovský kraj', 'Svidník'),
  ('Cimenná', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Cinobaňa', 'Banskobystrický kraj', 'Poltár'),
  ('Cífer', 'Trnavský kraj', 'Trnava'),
  ('Čab', 'Nitriansky kraj', 'Nitra'),
  ('Čabalovce', 'Prešovský kraj', 'Medzilaborce'),
  ('Čabiny', 'Prešovský kraj', 'Medzilaborce'),
  ('Čabradský Vrbovok', 'Banskobystrický kraj', 'Krupina'),
  ('Čadca', 'Žilinský kraj', 'Čadca'),
  ('Čachtice', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Čajkov', 'Nitriansky kraj', 'Levice'),
  ('Čaka', 'Nitriansky kraj', 'Levice'),
  ('Čakajovce', 'Nitriansky kraj', 'Nitra'),
  ('Čakanovce', 'Banskobystrický kraj', 'Lučenec'),
  ('Čakanovce', 'Košický kraj', 'Košice-okolie'),
  ('Čakany', 'Trnavský kraj', 'Dunajská Streda'),
  ('Čaklov', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Čalovec', 'Nitriansky kraj', 'Komárno'),
  ('Čamovce', 'Banskobystrický kraj', 'Lučenec'),
  ('Čaňa', 'Košický kraj', 'Košice-okolie'),
  ('Čaradice', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Častá', 'Bratislavský kraj', 'Pezinok'),
  ('Častkov', 'Trnavský kraj', 'Senica'),
  ('Častkovce', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Čata', 'Nitriansky kraj', 'Levice'),
  ('Čataj', 'Bratislavský kraj', 'Senec'),
  ('Čavoj', 'Trenčiansky kraj', 'Prievidza'),
  ('Čáry', 'Trnavský kraj', 'Senica'),
  ('Čebovce', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Čečehov', 'Košický kraj', 'Michalovce'),
  ('Čečejovce', 'Košický kraj', 'Košice-okolie'),
  ('Čechy', 'Nitriansky kraj', 'Nové Zámky'),
  ('Čechynce', 'Nitriansky kraj', 'Nitra'),
  ('Čekovce', 'Banskobystrický kraj', 'Krupina'),
  ('Čeláre', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Čelkova Lehota', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Čelovce', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Čelovce', 'Prešovský kraj', 'Prešov'),
  ('Čeľadice', 'Nitriansky kraj', 'Nitra'),
  ('Čeľadince', 'Nitriansky kraj', 'Topoľčany'),
  ('Čeľovce', 'Košický kraj', 'Trebišov'),
  ('Čenkovce', 'Trnavský kraj', 'Dunajská Streda'),
  ('Čerenčany', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Čereňany', 'Trenčiansky kraj', 'Prievidza'),
  ('Čerhov', 'Košický kraj', 'Trebišov'),
  ('Čerín', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Čermany', 'Nitriansky kraj', 'Topoľčany'),
  ('Černík', 'Nitriansky kraj', 'Nové Zámky'),
  ('Černina', 'Prešovský kraj', 'Humenné'),
  ('Černochov', 'Košický kraj', 'Trebišov'),
  ('Čertižné', 'Prešovský kraj', 'Medzilaborce'),
  ('Červená Voda', 'Prešovský kraj', 'Sabinov'),
  ('Červenica', 'Prešovský kraj', 'Prešov'),
  ('Červenica pri Sabinove', 'Prešovský kraj', 'Sabinov'),
  ('Červeník', 'Trnavský kraj', 'Hlohovec'),
  ('Červený Hrádok', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Červený Kameň', 'Trenčiansky kraj', 'Ilava'),
  ('Červený Kláštor', 'Prešovský kraj', 'Kežmarok'),
  ('Červeňany', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('České Brezovo', 'Banskobystrický kraj', 'Poltár'),
  ('Čičarovce', 'Košický kraj', 'Michalovce'),
  ('Čičava', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Čičmany', 'Žilinský kraj', 'Žilina'),
  ('Čierna', 'Košický kraj', 'Trebišov'),
  ('Čierna Lehota', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Čierna Lehota', 'Košický kraj', 'Rožňava'),
  ('Čierna nad Tisou', 'Košický kraj', 'Trebišov'),
  ('Čierna Voda', 'Trnavský kraj', 'Galanta'),
  ('Čierne', 'Žilinský kraj', 'Čadca'),
  ('Čierne Kľačany', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Čierne nad Topľou', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Čierne Pole', 'Košický kraj', 'Michalovce'),
  ('Čierny Balog', 'Banskobystrický kraj', 'Brezno'),
  ('Čierny Brod', 'Trnavský kraj', 'Galanta'),
  ('Čierny Potok', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Čifáre', 'Nitriansky kraj', 'Nitra'),
  ('Čiližská Radvaň', 'Trnavský kraj', 'Dunajská Streda'),
  ('Čimhová', 'Žilinský kraj', 'Tvrdošín'),
  ('Čirč', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Čižatice', 'Košický kraj', 'Košice-okolie'),
  ('Číčov', 'Nitriansky kraj', 'Komárno'),
  ('Číž', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Čoltovo', 'Košický kraj', 'Rožňava'),
  ('Čremošné', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Čučma', 'Košický kraj', 'Rožňava'),
  ('Čukalovce', 'Prešovský kraj', 'Snina'),
  ('Dačov Lom', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Daletice', 'Prešovský kraj', 'Sabinov'),
  ('Danišovce', 'Košický kraj', 'Spišská Nová Ves'),
  ('Dargov', 'Košický kraj', 'Trebišov'),
  ('Davidov', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Debraď', 'Košický kraj', 'Košice-okolie'),
  ('Dedačov', 'Prešovský kraj', 'Humenné'),
  ('Dedina Mládeže', 'Nitriansky kraj', 'Komárno'),
  ('Dedinka', 'Nitriansky kraj', 'Nové Zámky'),
  ('Dedinky', 'Košický kraj', 'Rožňava'),
  ('Dechtice', 'Trnavský kraj', 'Trnava'),
  ('Dekýš', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Demandice', 'Nitriansky kraj', 'Levice'),
  ('Demänovská Dolina', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Demjata', 'Prešovský kraj', 'Prešov'),
  ('Detrík', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Detva', 'Banskobystrický kraj', 'Detva'),
  ('Detvianska Huta', 'Banskobystrický kraj', 'Detva'),
  ('Devičany', 'Nitriansky kraj', 'Levice'),
  ('Devičie', 'Banskobystrický kraj', 'Krupina'),
  ('Dežerice', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Diaková', 'Žilinský kraj', 'Martin'),
  ('Diakovce', 'Nitriansky kraj', 'Šaľa'),
  ('Diviacka Nová Ves', 'Trenčiansky kraj', 'Prievidza'),
  ('Diviaky nad Nitricou', 'Trenčiansky kraj', 'Prievidza'),
  ('Divín', 'Banskobystrický kraj', 'Lučenec'),
  ('Divina', 'Žilinský kraj', 'Žilina'),
  ('Divinka', 'Žilinský kraj', 'Žilina'),
  ('Dlhá', 'Trnavský kraj', 'Trnava'),
  ('Dlhá nad Kysucou', 'Žilinský kraj', 'Čadca'),
  ('Dlhá nad Oravou', 'Žilinský kraj', 'Dolný Kubín'),
  ('Dlhá nad Váhom', 'Nitriansky kraj', 'Šaľa'),
  ('Dlhá Ves', 'Košický kraj', 'Rožňava'),
  ('Dlhé Klčovo', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Dlhé nad Cirochou', 'Prešovský kraj', 'Snina'),
  ('Dlhé Pole', 'Žilinský kraj', 'Žilina'),
  ('Dlhé Stráže', 'Prešovský kraj', 'Levoča'),
  ('Dlhoňa', 'Prešovský kraj', 'Svidník'),
  ('Dlžín', 'Trenčiansky kraj', 'Prievidza'),
  ('Dobrá', 'Košický kraj', 'Trebišov'),
  ('Dobrá Niva', 'Banskobystrický kraj', 'Zvolen'),
  ('Dobrá Voda', 'Trnavský kraj', 'Trnava'),
  ('Dobroč', 'Banskobystrický kraj', 'Lučenec'),
  ('Dobrohošť', 'Trnavský kraj', 'Dunajská Streda'),
  ('Dobroslava', 'Prešovský kraj', 'Svidník'),
  ('Dobšiná', 'Košický kraj', 'Rožňava'),
  ('Dohňany', 'Trenčiansky kraj', 'Púchov'),
  ('Dojč', 'Trnavský kraj', 'Senica'),
  ('Dolinka', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Dolná Breznica', 'Trenčiansky kraj', 'Púchov'),
  ('Dolná Krupá', 'Trnavský kraj', 'Trnava'),
  ('Dolná Lehota', 'Banskobystrický kraj', 'Brezno'),
  ('Dolná Mariková', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Dolná Mičiná', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Dolná Poruba', 'Trenčiansky kraj', 'Trenčín'),
  ('Dolná Seč', 'Nitriansky kraj', 'Levice'),
  ('Dolná Streda', 'Trnavský kraj', 'Galanta'),
  ('Dolná Strehová', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Dolná Súča', 'Trenčiansky kraj', 'Trenčín'),
  ('Dolná Tižina', 'Žilinský kraj', 'Žilina'),
  ('Dolná Trnávka', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Dolná Ves', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Dolná Ždaňa', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Dolné Dubové', 'Trnavský kraj', 'Trnava'),
  ('Dolné Kočkovce', 'Trenčiansky kraj', 'Púchov'),
  ('Dolné Lefantovce', 'Nitriansky kraj', 'Nitra'),
  ('Dolné Lovčice', 'Trnavský kraj', 'Trnava'),
  ('Dolné Mladonice', 'Banskobystrický kraj', 'Krupina'),
  ('Dolné Naštice', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Dolné Obdokovce', 'Nitriansky kraj', 'Nitra'),
  ('Dolné Orešany', 'Trnavský kraj', 'Trnava'),
  ('Dolné Otrokovce', 'Trnavský kraj', 'Hlohovec'),
  ('Dolné Plachtince', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Dolné Saliby', 'Trnavský kraj', 'Galanta'),
  ('Dolné Semerovce', 'Nitriansky kraj', 'Levice'),
  ('Dolné Srnie', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Dolné Strháre', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Dolné Trhovište', 'Trnavský kraj', 'Hlohovec'),
  ('Dolné Vestenice', 'Trenčiansky kraj', 'Prievidza'),
  ('Dolné Zahorany', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Dolné Zelenice', 'Trnavský kraj', 'Hlohovec'),
  ('Dolný Badín', 'Banskobystrický kraj', 'Krupina'),
  ('Dolný Bar', 'Trnavský kraj', 'Dunajská Streda'),
  ('Dolný Harmanec', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Dolný Hričov', 'Žilinský kraj', 'Žilina'),
  ('Dolný Chotár', 'Trnavský kraj', 'Galanta'),
  ('Dolný Kalník', 'Žilinský kraj', 'Martin'),
  ('Dolný Kubín', 'Žilinský kraj', 'Dolný Kubín'),
  ('Dolný Lieskov', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Dolný Lopašov', 'Trnavský kraj', 'Piešťany'),
  ('Dolný Ohaj', 'Nitriansky kraj', 'Nové Zámky'),
  ('Dolný Pial', 'Nitriansky kraj', 'Levice'),
  ('Dolný Štál', 'Trnavský kraj', 'Dunajská Streda'),
  ('Dolný Vadičov', 'Žilinský kraj', 'Kysucké Nové Mesto'),
  ('Doľany', 'Bratislavský kraj', 'Pezinok'),
  ('Doľany', 'Prešovský kraj', 'Levoča'),
  ('Domadice', 'Nitriansky kraj', 'Levice'),
  ('Domaníky', 'Banskobystrický kraj', 'Krupina'),
  ('Domaniža', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Domaňovce', 'Prešovský kraj', 'Levoča'),
  ('Donovaly', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Drábsko', 'Banskobystrický kraj', 'Brezno'),
  ('Drahňov', 'Košický kraj', 'Michalovce'),
  ('Drahovce', 'Trnavský kraj', 'Piešťany'),
  ('Dravce', 'Prešovský kraj', 'Levoča'),
  ('Dražice', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Dražkovce', 'Žilinský kraj', 'Martin'),
  ('Drážovce', 'Banskobystrický kraj', 'Krupina'),
  ('Drienčany', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Drienica', 'Prešovský kraj', 'Sabinov'),
  ('Drienov', 'Prešovský kraj', 'Prešov'),
  ('Drienovec', 'Košický kraj', 'Košice-okolie'),
  ('Drienovo', 'Banskobystrický kraj', 'Krupina'),
  ('Drienovská Nová Ves', 'Prešovský kraj', 'Prešov'),
  ('Drietoma', 'Trenčiansky kraj', 'Trenčín'),
  ('Drnava', 'Košický kraj', 'Rožňava'),
  ('Drňa', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Družstevná pri Hornáde', 'Košický kraj', 'Košice-okolie'),
  ('Drženice', 'Nitriansky kraj', 'Levice'),
  ('Držkovce', 'Banskobystrický kraj', 'Revúca'),
  ('Dubinné', 'Prešovský kraj', 'Bardejov'),
  ('Dubnica nad Váhom', 'Trenčiansky kraj', 'Ilava'),
  ('Dubnička', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Dubník', 'Nitriansky kraj', 'Nové Zámky'),
  ('Dubno', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Dubodiel', 'Trenčiansky kraj', 'Trenčín'),
  ('Dubová', 'Bratislavský kraj', 'Pezinok'),
  ('Dubová', 'Prešovský kraj', 'Svidník'),
  ('Dubovany', 'Trnavský kraj', 'Piešťany'),
  ('Dubovce', 'Trnavský kraj', 'Skalica'),
  ('Dubové', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Dubové', 'Banskobystrický kraj', 'Zvolen'),
  ('Dubovec', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Dubovica', 'Prešovský kraj', 'Sabinov'),
  ('Ducové', 'Trnavský kraj', 'Piešťany'),
  ('Dudince', 'Banskobystrický kraj', 'Krupina'),
  ('Dukovce', 'Prešovský kraj', 'Svidník'),
  ('Dulov', 'Trenčiansky kraj', 'Ilava'),
  ('Dulova Ves', 'Prešovský kraj', 'Prešov'),
  ('Dulovce', 'Nitriansky kraj', 'Komárno'),
  ('Dulovo', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Dunajská Lužná', 'Bratislavský kraj', 'Senec'),
  ('Dunajov', 'Žilinský kraj', 'Čadca'),
  ('Dunajská Streda', 'Trnavský kraj', 'Dunajská Streda'),
  ('Dunajský Klátov', 'Trnavský kraj', 'Dunajská Streda'),
  ('Duplín', 'Prešovský kraj', 'Stropkov'),
  ('Dúbrava', 'Prešovský kraj', 'Levoča'),
  ('Dúbrava', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Dúbrava', 'Prešovský kraj', 'Snina'),
  ('Dúbravica', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Dúbravka', 'Košický kraj', 'Michalovce'),
  ('Dúbravy', 'Banskobystrický kraj', 'Detva'),
  ('Dvorany nad Nitrou', 'Nitriansky kraj', 'Topoľčany'),
  ('Dvorec', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Dvorianky', 'Košický kraj', 'Trebišov'),
  ('Dvorníky', 'Trnavský kraj', 'Hlohovec'),
  ('Dvorníky-Včeláre', 'Košický kraj', 'Košice-okolie'),
  ('Dvory nad Žitavou', 'Nitriansky kraj', 'Nové Zámky'),
  ('Ďačov', 'Prešovský kraj', 'Sabinov'),
  ('Ďanová', 'Žilinský kraj', 'Martin'),
  ('Ďapalovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Ďubákovo', 'Banskobystrický kraj', 'Poltár'),
  ('Ďurčiná', 'Žilinský kraj', 'Žilina'),
  ('Ďurďoš', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Ďurďošík', 'Košický kraj', 'Košice-okolie'),
  ('Ďurďové', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Ďurkov', 'Košický kraj', 'Košice-okolie'),
  ('Ďurková', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Ďurkovce', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Egreš', 'Košický kraj', 'Trebišov'),
  ('Fačkov', 'Žilinský kraj', 'Žilina'),
  ('Falkušovce', 'Košický kraj', 'Michalovce'),
  ('Farná', 'Nitriansky kraj', 'Levice'),
  ('Fekišovce', 'Košický kraj', 'Sobrance'),
  ('Figa', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Fijaš', 'Prešovský kraj', 'Svidník'),
  ('Fiľakovo', 'Banskobystrický kraj', 'Lučenec'),
  ('Fiľakovské Kováče', 'Banskobystrický kraj', 'Lučenec'),
  ('Fintice', 'Prešovský kraj', 'Prešov'),
  ('Folkušová', 'Žilinský kraj', 'Martin'),
  ('Forbasy', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Frička', 'Prešovský kraj', 'Bardejov'),
  ('Fričkovce', 'Prešovský kraj', 'Bardejov'),
  ('Fričovce', 'Prešovský kraj', 'Prešov'),
  ('Fulianka', 'Prešovský kraj', 'Prešov'),
  ('Gabčíkovo', 'Trnavský kraj', 'Dunajská Streda'),
  ('Gaboltov', 'Prešovský kraj', 'Bardejov'),
  ('Gajary', 'Bratislavský kraj', 'Malacky'),
  ('Galanta', 'Trnavský kraj', 'Galanta'),
  ('Galovany', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Gánovce', 'Prešovský kraj', 'Poprad'),
  ('Gáň', 'Trnavský kraj', 'Galanta'),
  ('Gbelce', 'Nitriansky kraj', 'Nové Zámky'),
  ('Gbely', 'Trnavský kraj', 'Skalica'),
  ('Gbeľany', 'Žilinský kraj', 'Žilina'),
  ('Geča', 'Košický kraj', 'Košice-okolie'),
  ('Gelnica', 'Košický kraj', 'Gelnica'),
  ('Gemer', 'Banskobystrický kraj', 'Revúca'),
  ('Gemerček', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Gemerská Hôrka', 'Košický kraj', 'Rožňava'),
  ('Gemerská Panica', 'Košický kraj', 'Rožňava'),
  ('Gemerská Poloma', 'Košický kraj', 'Rožňava'),
  ('Gemerská Ves', 'Banskobystrický kraj', 'Revúca'),
  ('Gemerské Dechtáre', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Gemerské Michalovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Gemerské Teplice', 'Banskobystrický kraj', 'Revúca'),
  ('Gemerský Jablonec', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Gemerský Sad', 'Banskobystrický kraj', 'Revúca'),
  ('Geraltov', 'Prešovský kraj', 'Prešov'),
  ('Gerlachov', 'Prešovský kraj', 'Bardejov'),
  ('Gerlachov', 'Prešovský kraj', 'Poprad'),
  ('Giglovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Giraltovce', 'Prešovský kraj', 'Svidník'),
  ('Girovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Glabušovce', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Gočaltovo', 'Košický kraj', 'Rožňava'),
  ('Gočovo', 'Košický kraj', 'Rožňava'),
  ('Golianovo', 'Nitriansky kraj', 'Nitra'),
  ('Gortva', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Gôtovany', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Granč-Petrovce', 'Prešovský kraj', 'Levoča'),
  ('Gregorova Vieska', 'Banskobystrický kraj', 'Lučenec'),
  ('Gregorovce', 'Prešovský kraj', 'Prešov'),
  ('Gribov', 'Prešovský kraj', 'Stropkov'),
  ('Gruzovce', 'Prešovský kraj', 'Humenné'),
  ('Gyňov', 'Košický kraj', 'Košice-okolie'),
  ('Habovka', 'Žilinský kraj', 'Tvrdošín'),
  ('Habura', 'Prešovský kraj', 'Medzilaborce'),
  ('Hačava', 'Košický kraj', 'Košice-okolie'),
  ('Háj', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Háj', 'Košický kraj', 'Košice-okolie'),
  ('Hajná Nová Ves', 'Nitriansky kraj', 'Topoľčany'),
  ('Hajnáčka', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Hájske', 'Nitriansky kraj', 'Šaľa'),
  ('Hajtovka', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Haláčovce', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Halič', 'Banskobystrický kraj', 'Lučenec'),
  ('Haligovce', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Haluzice', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Hamuliakovo', 'Bratislavský kraj', 'Senec'),
  ('Handlová', 'Trenčiansky kraj', 'Prievidza'),
  ('Hanigovce', 'Prešovský kraj', 'Sabinov'),
  ('Haniska', 'Prešovský kraj', 'Prešov'),
  ('Haniska', 'Košický kraj', 'Košice-okolie'),
  ('Hanková', 'Košický kraj', 'Rožňava'),
  ('Hankovce', 'Prešovský kraj', 'Bardejov'),
  ('Hankovce', 'Prešovský kraj', 'Humenné'),
  ('Hanušovce nad Topľou', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Harakovce', 'Prešovský kraj', 'Levoča'),
  ('Harhaj', 'Prešovský kraj', 'Bardejov'),
  ('Harichovce', 'Košický kraj', 'Spišská Nová Ves'),
  ('Harmanec', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Hatalov', 'Košický kraj', 'Michalovce'),
  ('Hatné', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Havaj', 'Prešovský kraj', 'Stropkov'),
  ('Havka', 'Prešovský kraj', 'Kežmarok'),
  ('Havranec', 'Prešovský kraj', 'Svidník'),
  ('Hažín', 'Košický kraj', 'Michalovce'),
  ('Hažín nad Cirochou', 'Prešovský kraj', 'Humenné'),
  ('Hažlín', 'Prešovský kraj', 'Bardejov'),
  ('Helcmanovce', 'Košický kraj', 'Gelnica'),
  ('Heľpa', 'Banskobystrický kraj', 'Brezno'),
  ('Henckovce', 'Košický kraj', 'Rožňava'),
  ('Henclová', 'Košický kraj', 'Gelnica'),
  ('Hencovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Hendrichovce', 'Prešovský kraj', 'Prešov'),
  ('Herľany', 'Košický kraj', 'Košice-okolie'),
  ('Hermanovce', 'Prešovský kraj', 'Prešov'),
  ('Hermanovce nad Topľou', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Hertník', 'Prešovský kraj', 'Bardejov'),
  ('Hervartov', 'Prešovský kraj', 'Bardejov'),
  ('Hiadeľ', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Hincovce', 'Košický kraj', 'Spišská Nová Ves'),
  ('Hladovka', 'Žilinský kraj', 'Tvrdošín'),
  ('Hlboké', 'Trnavský kraj', 'Senica'),
  ('Hlboké nad Váhom', 'Žilinský kraj', 'Bytča'),
  ('Hliník nad Hronom', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Hlinné', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Hlivištia', 'Košický kraj', 'Sobrance'),
  ('Hlohovec', 'Trnavský kraj', 'Hlohovec'),
  ('Hniezdne', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Hnilčík', 'Košický kraj', 'Spišská Nová Ves'),
  ('Hnilec', 'Košický kraj', 'Spišská Nová Ves'),
  ('Hnojné', 'Košický kraj', 'Michalovce'),
  ('Hnúšťa', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Hodejov', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Hodejovec', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Hodkovce', 'Košický kraj', 'Košice-okolie'),
  ('Hodruša-Hámre', 'Banskobystrický kraj', 'Žarnovica'),
  ('Hokovce', 'Nitriansky kraj', 'Levice'),
  ('Holčíkovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Holiare', 'Nitriansky kraj', 'Komárno'),
  ('Holice', 'Trnavský kraj', 'Dunajská Streda'),
  ('Holíč', 'Trnavský kraj', 'Skalica'),
  ('Holiša', 'Banskobystrický kraj', 'Lučenec'),
  ('Holumnica', 'Prešovský kraj', 'Kežmarok'),
  ('Honce', 'Košický kraj', 'Rožňava'),
  ('Hontianska Vrbica', 'Nitriansky kraj', 'Levice'),
  ('Hontianske Moravce', 'Banskobystrický kraj', 'Krupina'),
  ('Hontianske Nemce', 'Banskobystrický kraj', 'Krupina'),
  ('Hontianske Tesáre', 'Banskobystrický kraj', 'Krupina'),
  ('Hontianske Trsťany', 'Nitriansky kraj', 'Levice'),
  ('Horná Breznica', 'Trenčiansky kraj', 'Púchov'),
  ('Horná Kráľová', 'Nitriansky kraj', 'Šaľa'),
  ('Horná Krupá', 'Trnavský kraj', 'Trnava'),
  ('Horná Lehota', 'Žilinský kraj', 'Dolný Kubín'),
  ('Horná Lehota', 'Banskobystrický kraj', 'Brezno'),
  ('Horná Mariková', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Horná Mičiná', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Horná Poruba', 'Trenčiansky kraj', 'Ilava'),
  ('Horná Potôň', 'Trnavský kraj', 'Dunajská Streda'),
  ('Horná Seč', 'Nitriansky kraj', 'Levice'),
  ('Horná Streda', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Horná Strehová', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Horná Súča', 'Trenčiansky kraj', 'Trenčín'),
  ('Horná Štubňa', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Horná Ves', 'Trenčiansky kraj', 'Prievidza'),
  ('Horná Ves', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Horná Ždaňa', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Horné Dubové', 'Trnavský kraj', 'Trnava'),
  ('Horné Hámre', 'Banskobystrický kraj', 'Žarnovica'),
  ('Horné Chlebany', 'Nitriansky kraj', 'Topoľčany'),
  ('Horné Lefantovce', 'Nitriansky kraj', 'Nitra'),
  ('Horné Mladonice', 'Banskobystrický kraj', 'Krupina'),
  ('Horné Mýto', 'Trnavský kraj', 'Dunajská Streda'),
  ('Horné Naštice', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Horné Obdokovce', 'Nitriansky kraj', 'Topoľčany'),
  ('Horné Orešany', 'Trnavský kraj', 'Trnava'),
  ('Horné Otrokovce', 'Trnavský kraj', 'Hlohovec'),
  ('Horné Plachtince', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Horné Pršany', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Horné Saliby', 'Trnavský kraj', 'Galanta'),
  ('Horné Semerovce', 'Nitriansky kraj', 'Levice'),
  ('Horné Srnie', 'Trenčiansky kraj', 'Trenčín'),
  ('Horné Strháre', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Horné Štitáre', 'Nitriansky kraj', 'Topoľčany'),
  ('Horné Trhovište', 'Trnavský kraj', 'Hlohovec'),
  ('Horné Turovce', 'Nitriansky kraj', 'Levice'),
  ('Horné Vestenice', 'Trenčiansky kraj', 'Prievidza'),
  ('Horné Zahorany', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Horné Zelenice', 'Trnavský kraj', 'Hlohovec'),
  ('Horný Badín', 'Banskobystrický kraj', 'Krupina'),
  ('Horný Bar', 'Trnavský kraj', 'Dunajská Streda'),
  ('Horný Hričov', 'Žilinský kraj', 'Žilina'),
  ('Horný Kalník', 'Žilinský kraj', 'Martin'),
  ('Horný Lieskov', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Horný Pial', 'Nitriansky kraj', 'Levice'),
  ('Horný Tisovník', 'Banskobystrický kraj', 'Detva'),
  ('Horný Vadičov', 'Žilinský kraj', 'Kysucké Nové Mesto'),
  ('Horňa', 'Košický kraj', 'Sobrance'),
  ('Horňany', 'Trenčiansky kraj', 'Trenčín'),
  ('Horovce', 'Trenčiansky kraj', 'Púchov'),
  ('Horovce', 'Košický kraj', 'Michalovce'),
  ('Hoste', 'Trnavský kraj', 'Galanta'),
  ('Hostice', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Hostie', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Hostišovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Hostovice', 'Prešovský kraj', 'Snina'),
  ('Hosťová', 'Nitriansky kraj', 'Nitra'),
  ('Hosťovce', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Hosťovce', 'Košický kraj', 'Košice-okolie'),
  ('Hozelec', 'Prešovský kraj', 'Poprad'),
  ('Hôrka', 'Prešovský kraj', 'Poprad'),
  ('Hôrka nad Váhom', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Hôrky', 'Žilinský kraj', 'Žilina'),
  ('Hrabičov', 'Banskobystrický kraj', 'Žarnovica'),
  ('Hrabkov', 'Prešovský kraj', 'Prešov'),
  ('Hrabová Roztoka', 'Prešovský kraj', 'Snina'),
  ('Hrabovčík', 'Prešovský kraj', 'Svidník'),
  ('Hrabovec', 'Prešovský kraj', 'Bardejov'),
  ('Hrabovec nad Laborcom', 'Prešovský kraj', 'Humenné'),
  ('Hrabovka', 'Trenčiansky kraj', 'Trenčín'),
  ('Hrabské', 'Prešovský kraj', 'Bardejov'),
  ('Hrabušice', 'Košický kraj', 'Spišská Nová Ves'),
  ('Hradisko', 'Prešovský kraj', 'Kežmarok'),
  ('Hradište', 'Trenčiansky kraj', 'Partizánske'),
  ('Hradište', 'Banskobystrický kraj', 'Poltár'),
  ('Hradište pod Vrátnom', 'Trnavský kraj', 'Senica'),
  ('Hrádok', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Hrachovište', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Hrachovo', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Hraničné', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Hranovnica', 'Prešovský kraj', 'Poprad'),
  ('Hraň', 'Košický kraj', 'Trebišov'),
  ('Hrašné', 'Trenčiansky kraj', 'Myjava'),
  ('Hrašovík', 'Košický kraj', 'Košice-okolie'),
  ('Hrčeľ', 'Košický kraj', 'Trebišov'),
  ('Hrhov', 'Košický kraj', 'Rožňava'),
  ('Hriadky', 'Košický kraj', 'Trebišov'),
  ('Hričovské Podhradie', 'Žilinský kraj', 'Žilina'),
  ('Hriňová', 'Banskobystrický kraj', 'Detva'),
  ('Hrišovce', 'Košický kraj', 'Gelnica'),
  ('Hrkovce', 'Nitriansky kraj', 'Levice'),
  ('Hrlica', 'Banskobystrický kraj', 'Revúca'),
  ('Hrnčiarovce nad Parnou', 'Trnavský kraj', 'Trnava'),
  ('Hrnčiarska Ves', 'Banskobystrický kraj', 'Poltár'),
  ('Hrnčiarske Zalužany', 'Banskobystrický kraj', 'Poltár'),
  ('Hrochoť', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Hromoš', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Hronec', 'Banskobystrický kraj', 'Brezno'),
  ('Hronovce', 'Nitriansky kraj', 'Levice'),
  ('Hronsek', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Hronská Breznica', 'Banskobystrický kraj', 'Zvolen'),
  ('Hronská Dúbrava', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Hronské Kľačany', 'Nitriansky kraj', 'Levice'),
  ('Hronské Kosihy', 'Nitriansky kraj', 'Levice'),
  ('Hronský Beňadik', 'Banskobystrický kraj', 'Žarnovica'),
  ('Hrubá Borša', 'Bratislavský kraj', 'Senec'),
  ('Hruboňovo', 'Nitriansky kraj', 'Nitra'),
  ('Hrubov', 'Prešovský kraj', 'Humenné'),
  ('Hrubý Šúr', 'Bratislavský kraj', 'Senec'),
  ('Hrušov', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Hrušov', 'Košický kraj', 'Rožňava'),
  ('Hrušovany', 'Nitriansky kraj', 'Topoľčany'),
  ('Hrušovo', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Hruštín', 'Žilinský kraj', 'Námestovo'),
  ('Hubice', 'Trnavský kraj', 'Dunajská Streda'),
  ('Hubina', 'Trnavský kraj', 'Piešťany'),
  ('Hubošovce', 'Prešovský kraj', 'Sabinov'),
  ('Hubová', 'Žilinský kraj', 'Ružomberok'),
  ('Hubovo', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Hucín', 'Banskobystrický kraj', 'Revúca'),
  ('Hudcovce', 'Prešovský kraj', 'Humenné'),
  ('Hul', 'Nitriansky kraj', 'Nové Zámky'),
  ('Humenné', 'Prešovský kraj', 'Humenné'),
  ('Huncovce', 'Prešovský kraj', 'Kežmarok'),
  ('Hunkovce', 'Prešovský kraj', 'Svidník'),
  ('Hurbanova Ves', 'Bratislavský kraj', 'Senec'),
  ('Hurbanovo', 'Nitriansky kraj', 'Komárno'),
  ('Husák', 'Košický kraj', 'Sobrance'),
  ('Husiná', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Hutka', 'Prešovský kraj', 'Bardejov'),
  ('Huty', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Hviezdoslavov', 'Trnavský kraj', 'Dunajská Streda'),
  ('Hvozdnica', 'Žilinský kraj', 'Bytča'),
  ('Hybe', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Hýľov', 'Košický kraj', 'Košice-okolie'),
  ('Chanava', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Chlebnice', 'Žilinský kraj', 'Dolný Kubín'),
  ('Chlmec', 'Prešovský kraj', 'Humenné'),
  ('Chľaba', 'Nitriansky kraj', 'Nové Zámky'),
  ('Chmeľnica', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Chmeľov', 'Prešovský kraj', 'Prešov'),
  ('Chmeľová', 'Prešovský kraj', 'Bardejov'),
  ('Chmeľovec', 'Prešovský kraj', 'Prešov'),
  ('Chminianska Nová Ves', 'Prešovský kraj', 'Prešov'),
  ('Chminianske Jakubovany', 'Prešovský kraj', 'Prešov'),
  ('Chmiňany', 'Prešovský kraj', 'Prešov'),
  ('Choča', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Chocholná-Velčice', 'Trenčiansky kraj', 'Trenčín'),
  ('Choňkovce', 'Košický kraj', 'Sobrance'),
  ('Chorvátsky Grob', 'Bratislavský kraj', 'Senec'),
  ('Chorváty', 'Košický kraj', 'Košice-okolie'),
  ('Chotča', 'Prešovský kraj', 'Stropkov'),
  ('Chotín', 'Nitriansky kraj', 'Komárno'),
  ('Chrabrany', 'Nitriansky kraj', 'Topoľčany'),
  ('Chrámec', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Chrastince', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Chrastné', 'Košický kraj', 'Košice-okolie'),
  ('Chrasť nad Hornádom', 'Košický kraj', 'Spišská Nová Ves'),
  ('Chrenovec-Brusno', 'Trenčiansky kraj', 'Prievidza'),
  ('Chropov', 'Trnavský kraj', 'Skalica'),
  ('Chrťany', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Chtelnica', 'Trnavský kraj', 'Piešťany'),
  ('Chudá Lehota', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Chvalová', 'Banskobystrický kraj', 'Revúca'),
  ('Chvojnica', 'Trenčiansky kraj', 'Myjava'),
  ('Chvojnica', 'Trenčiansky kraj', 'Prievidza'),
  ('Chynorany', 'Trenčiansky kraj', 'Partizánske'),
  ('Chyžné', 'Banskobystrický kraj', 'Revúca'),
  ('Igram', 'Bratislavský kraj', 'Senec'),
  ('Ihľany', 'Prešovský kraj', 'Kežmarok'),
  ('Ihráč', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Ilava', 'Trenčiansky kraj', 'Ilava'),
  ('Iliašovce', 'Košický kraj', 'Spišská Nová Ves'),
  ('Ilija', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Imeľ', 'Nitriansky kraj', 'Komárno'),
  ('Inovce', 'Košický kraj', 'Sobrance'),
  ('Iňa', 'Nitriansky kraj', 'Levice'),
  ('Iňačovce', 'Košický kraj', 'Michalovce'),
  ('Ipeľské Predmostie', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Ipeľské Úľany', 'Nitriansky kraj', 'Levice'),
  ('Ipeľský Sokolec', 'Nitriansky kraj', 'Levice'),
  ('Istebné', 'Žilinský kraj', 'Dolný Kubín'),
  ('Ivachnová', 'Žilinský kraj', 'Ružomberok'),
  ('Ivančiná', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Ivanice', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Ivanka pri Dunaji', 'Bratislavský kraj', 'Senec'),
  ('Ivanka pri Nitre', 'Nitriansky kraj', 'Nitra'),
  ('Ivanovce', 'Trenčiansky kraj', 'Trenčín'),
  ('Iža', 'Nitriansky kraj', 'Komárno'),
  ('Ižipovce', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Ižkovce', 'Košický kraj', 'Michalovce'),
  ('Jablonec', 'Bratislavský kraj', 'Pezinok'),
  ('Jablonica', 'Trnavský kraj', 'Senica'),
  ('Jablonka', 'Trenčiansky kraj', 'Myjava'),
  ('Jablonov', 'Prešovský kraj', 'Levoča'),
  ('Jablonov nad Turňou', 'Košický kraj', 'Rožňava'),
  ('Jablonové', 'Bratislavský kraj', 'Malacky'),
  ('Jablonové', 'Žilinský kraj', 'Bytča'),
  ('Jabloň', 'Prešovský kraj', 'Humenné'),
  ('Jabloňovce', 'Nitriansky kraj', 'Levice'),
  ('Jacovce', 'Nitriansky kraj', 'Topoľčany'),
  ('Jahodná', 'Trnavský kraj', 'Dunajská Streda'),
  ('Jaklovce', 'Košický kraj', 'Gelnica'),
  ('Jakovany', 'Prešovský kraj', 'Sabinov'),
  ('Jakubany', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Jakubov', 'Bratislavský kraj', 'Malacky'),
  ('Jakubova Voľa', 'Prešovský kraj', 'Sabinov'),
  ('Jakubovany', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Jakubovany', 'Prešovský kraj', 'Sabinov'),
  ('Jakušovce', 'Prešovský kraj', 'Stropkov'),
  ('Jalová', 'Prešovský kraj', 'Snina'),
  ('Jalovec', 'Trenčiansky kraj', 'Prievidza'),
  ('Jalovec', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Jalšové', 'Trnavský kraj', 'Hlohovec'),
  ('Jalšovík', 'Banskobystrický kraj', 'Krupina'),
  ('Jamník', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Jamník', 'Košický kraj', 'Spišská Nová Ves'),
  ('Janice', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Janík', 'Košický kraj', 'Košice-okolie'),
  ('Janíky', 'Trnavský kraj', 'Dunajská Streda'),
  ('Jankovce', 'Prešovský kraj', 'Humenné'),
  ('Janov', 'Prešovský kraj', 'Prešov'),
  ('Janova Lehota', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Janovce', 'Prešovský kraj', 'Bardejov'),
  ('Jánovce', 'Trnavský kraj', 'Galanta'),
  ('Jánovce', 'Prešovský kraj', 'Poprad'),
  ('Janovík', 'Prešovský kraj', 'Prešov'),
  ('Jarabá', 'Banskobystrický kraj', 'Brezno'),
  ('Jarabina', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Jarok', 'Nitriansky kraj', 'Nitra'),
  ('Jarovnice', 'Prešovský kraj', 'Sabinov'),
  ('Jasenica', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Jasenie', 'Banskobystrický kraj', 'Brezno'),
  ('Jasenov', 'Prešovský kraj', 'Humenné'),
  ('Jasenov', 'Košický kraj', 'Sobrance'),
  ('Jasenová', 'Žilinský kraj', 'Dolný Kubín'),
  ('Jasenovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Jasenové', 'Žilinský kraj', 'Žilina'),
  ('Jasenovo', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Jaslovské Bohunice', 'Trnavský kraj', 'Trnava'),
  ('Jasov', 'Košický kraj', 'Košice-okolie'),
  ('Jasová', 'Nitriansky kraj', 'Nové Zámky'),
  ('Jastrabá', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Jastrabie nad Topľou', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Jastrabie pri Michalovciach', 'Košický kraj', 'Michalovce'),
  ('Jatov', 'Nitriansky kraj', 'Nové Zámky'),
  ('Jazernica', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Jedlinka', 'Prešovský kraj', 'Bardejov'),
  ('Jedľové Kostoľany', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Jelenec', 'Nitriansky kraj', 'Nitra'),
  ('Jelka', 'Trnavský kraj', 'Galanta'),
  ('Jelšava', 'Banskobystrický kraj', 'Revúca'),
  ('Jelšovce', 'Nitriansky kraj', 'Nitra'),
  ('Jelšovec', 'Banskobystrický kraj', 'Lučenec'),
  ('Jenkovce', 'Košický kraj', 'Sobrance'),
  ('Jesenské', 'Nitriansky kraj', 'Levice'),
  ('Jesenské', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Jestice', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Ješkova Ves', 'Trenčiansky kraj', 'Partizánske'),
  ('Jezersko', 'Prešovský kraj', 'Kežmarok'),
  ('Jovice', 'Košický kraj', 'Rožňava'),
  ('Jovsa', 'Košický kraj', 'Michalovce'),
  ('Jur nad Hronom', 'Nitriansky kraj', 'Levice'),
  ('Jurkova Voľa', 'Prešovský kraj', 'Svidník'),
  ('Jurová', 'Trnavský kraj', 'Dunajská Streda'),
  ('Jurské', 'Prešovský kraj', 'Kežmarok'),
  ('Juskova Voľa', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Kačanov', 'Košický kraj', 'Michalovce'),
  ('Kajal', 'Trnavský kraj', 'Galanta'),
  ('Kalameny', 'Žilinský kraj', 'Ružomberok'),
  ('Kalinkovo', 'Bratislavský kraj', 'Senec'),
  ('Kalinov', 'Prešovský kraj', 'Medzilaborce'),
  ('Kalinovo', 'Banskobystrický kraj', 'Poltár'),
  ('Kalná nad Hronom', 'Nitriansky kraj', 'Levice'),
  ('Kalná Roztoka', 'Prešovský kraj', 'Snina'),
  ('Kálnica', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Kalnište', 'Prešovský kraj', 'Svidník'),
  ('Kalonda', 'Banskobystrický kraj', 'Lučenec'),
  ('Kalša', 'Košický kraj', 'Košice-okolie'),
  ('Kaloša', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Kaluža', 'Košický kraj', 'Michalovce'),
  ('Kaľamenová', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Kaľava', 'Košický kraj', 'Spišská Nová Ves'),
  ('Kamanová', 'Nitriansky kraj', 'Topoľčany'),
  ('Kamenec pod Vtáčnikom', 'Trenčiansky kraj', 'Prievidza'),
  ('Kamenica', 'Prešovský kraj', 'Sabinov'),
  ('Kamenica nad Cirochou', 'Prešovský kraj', 'Humenné'),
  ('Kamenica nad Hronom', 'Nitriansky kraj', 'Nové Zámky'),
  ('Kameničany', 'Trenčiansky kraj', 'Ilava'),
  ('Kameničná', 'Nitriansky kraj', 'Komárno'),
  ('Kamenín', 'Nitriansky kraj', 'Nové Zámky'),
  ('Kamenná Poruba', 'Žilinský kraj', 'Žilina'),
  ('Kamenná Poruba', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Kamenné Kosihy', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Kamenný Most', 'Nitriansky kraj', 'Nové Zámky'),
  ('Kameňany', 'Banskobystrický kraj', 'Revúca'),
  ('Kamienka', 'Prešovský kraj', 'Humenné'),
  ('Kamienka', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Kanianka', 'Trenčiansky kraj', 'Prievidza'),
  ('Kapince', 'Nitriansky kraj', 'Nitra'),
  ('Kapišová', 'Prešovský kraj', 'Svidník'),
  ('Kaplna', 'Bratislavský kraj', 'Senec'),
  ('Kapušany', 'Prešovský kraj', 'Prešov'),
  ('Kapušianske Kľačany', 'Košický kraj', 'Michalovce'),
  ('Karlová', 'Žilinský kraj', 'Martin'),
  ('Karná', 'Prešovský kraj', 'Humenné'),
  ('Kašov', 'Košický kraj', 'Trebišov'),
  ('Kátlovce', 'Trnavský kraj', 'Trnava'),
  ('Kátov', 'Trnavský kraj', 'Skalica'),
  ('Kazimír', 'Košický kraj', 'Trebišov'),
  ('Kecerovce', 'Košický kraj', 'Košice-okolie'),
  ('Kecerovský Lipovec', 'Košický kraj', 'Košice-okolie'),
  ('Kečkovce', 'Prešovský kraj', 'Svidník'),
  ('Kečovo', 'Košický kraj', 'Rožňava'),
  ('Kechnec', 'Košický kraj', 'Košice-okolie'),
  ('Kendice', 'Prešovský kraj', 'Prešov'),
  ('Kesovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Keť', 'Nitriansky kraj', 'Levice'),
  ('Kežmarok', 'Prešovský kraj', 'Kežmarok'),
  ('Kiarov', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Kladzany', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Klasov', 'Nitriansky kraj', 'Nitra'),
  ('Kláštor pod Znievom', 'Žilinský kraj', 'Martin'),
  ('Klátova Nová Ves', 'Trenčiansky kraj', 'Partizánske'),
  ('Klčov', 'Prešovský kraj', 'Levoča'),
  ('Klenov', 'Prešovský kraj', 'Prešov'),
  ('Klenová', 'Prešovský kraj', 'Snina'),
  ('Klenovec', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Kleňany', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Klieština', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Klin', 'Žilinský kraj', 'Námestovo'),
  ('Klin nad Bodrogom', 'Košický kraj', 'Trebišov'),
  ('Klížska Nemá', 'Nitriansky kraj', 'Komárno'),
  ('Klokoč', 'Banskobystrický kraj', 'Detva'),
  ('Klokočov', 'Žilinský kraj', 'Čadca'),
  ('Klokočov', 'Košický kraj', 'Michalovce'),
  ('Klubina', 'Žilinský kraj', 'Čadca'),
  ('Kluknava', 'Košický kraj', 'Gelnica'),
  ('Kľačany', 'Trnavský kraj', 'Hlohovec'),
  ('Kľače', 'Žilinský kraj', 'Žilina'),
  ('Kľačno', 'Trenčiansky kraj', 'Prievidza'),
  ('Kľak', 'Banskobystrický kraj', 'Žarnovica'),
  ('Kľúčovec', 'Trnavský kraj', 'Dunajská Streda'),
  ('Kľušov', 'Prešovský kraj', 'Bardejov'),
  ('Kmeťovo', 'Nitriansky kraj', 'Nové Zámky'),
  ('Kobeliarovo', 'Košický kraj', 'Rožňava'),
  ('Kobylnice', 'Prešovský kraj', 'Svidník'),
  ('Kobyly', 'Prešovský kraj', 'Bardejov'),
  ('Koceľovce', 'Košický kraj', 'Rožňava'),
  ('Kociha', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Kocurany', 'Trenčiansky kraj', 'Prievidza'),
  ('Kočín-Lančár', 'Trnavský kraj', 'Piešťany'),
  ('Kočovce', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Kochanovce', 'Prešovský kraj', 'Bardejov'),
  ('Kochanovce', 'Prešovský kraj', 'Humenné'),
  ('Kojatice', 'Prešovský kraj', 'Prešov'),
  ('Kojšov', 'Košický kraj', 'Gelnica'),
  ('Kokava nad Rimavicou', 'Banskobystrický kraj', 'Poltár'),
  ('Kokošovce', 'Prešovský kraj', 'Prešov'),
  ('Kokšov-Bakša', 'Košický kraj', 'Košice-okolie'),
  ('Kolačkov', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Kolačno', 'Trenčiansky kraj', 'Partizánske'),
  ('Koláre', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Kolárovice', 'Žilinský kraj', 'Bytča'),
  ('Kolárovo', 'Nitriansky kraj', 'Komárno'),
  ('Kolbasov', 'Prešovský kraj', 'Snina'),
  ('Kolbovce', 'Prešovský kraj', 'Stropkov'),
  ('Kolibabovce', 'Košický kraj', 'Sobrance'),
  ('Kolinovce', 'Košický kraj', 'Spišská Nová Ves'),
  ('Kolíňany', 'Nitriansky kraj', 'Nitra'),
  ('Kolonica', 'Prešovský kraj', 'Snina'),
  ('Kolta', 'Nitriansky kraj', 'Nové Zámky'),
  ('Komárany', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Komárno', 'Nitriansky kraj', 'Komárno'),
  ('Komárov', 'Prešovský kraj', 'Bardejov'),
  ('Komárovce', 'Košický kraj', 'Košice-okolie'),
  ('Komjatice', 'Nitriansky kraj', 'Nové Zámky'),
  ('Komjatná', 'Žilinský kraj', 'Ružomberok'),
  ('Komoča', 'Nitriansky kraj', 'Nové Zámky'),
  ('Koniarovce', 'Nitriansky kraj', 'Topoľčany'),
  ('Konrádovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Konská', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Konská', 'Žilinský kraj', 'Žilina'),
  ('Koňuš', 'Košický kraj', 'Sobrance'),
  ('Kopčany', 'Trnavský kraj', 'Skalica'),
  ('Kopernica', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Koplotovce', 'Trnavský kraj', 'Hlohovec'),
  ('Koprivnica', 'Prešovský kraj', 'Bardejov'),
  ('Kordíky', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Korejovce', 'Prešovský kraj', 'Svidník'),
  ('Korňa', 'Žilinský kraj', 'Čadca'),
  ('Koromľa', 'Košický kraj', 'Sobrance'),
  ('Korunková', 'Prešovský kraj', 'Stropkov'),
  ('Korytárky', 'Banskobystrický kraj', 'Detva'),
  ('Korytné', 'Prešovský kraj', 'Levoča'),
  ('Kosihovce', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Kosihy nad Ipľom', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Kosorín', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Kostolec', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Kostolište', 'Bratislavský kraj', 'Malacky'),
  ('Kostolná pri Dunaji', 'Bratislavský kraj', 'Senec'),
  ('Kostolná Ves', 'Trenčiansky kraj', 'Prievidza'),
  ('Kostolná-Záriečie', 'Trenčiansky kraj', 'Trenčín'),
  ('Kostolné', 'Trenčiansky kraj', 'Myjava'),
  ('Kostolné Kračany', 'Trnavský kraj', 'Dunajská Streda'),
  ('Kostoľany nad Hornádom', 'Košický kraj', 'Košice-okolie'),
  ('Kostoľany pod Tribečom', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Koš', 'Trenčiansky kraj', 'Prievidza'),
  ('Košariská', 'Trenčiansky kraj', 'Myjava'),
  ('Košarovce', 'Prešovský kraj', 'Humenné'),
  ('Košeca', 'Trenčiansky kraj', 'Ilava'),
  ('Košecké Podhradie', 'Trenčiansky kraj', 'Ilava'),
  ('Košice', 'Košický', 'Košice'),
  ('Košická Belá', 'Košický kraj', 'Košice-okolie'),
  ('Košická Polianka', 'Košický kraj', 'Košice-okolie'),
  ('Košické Oľšany', 'Košický kraj', 'Košice-okolie'),
  ('Košický Klečenov', 'Košický kraj', 'Košice-okolie'),
  ('Koškovce', 'Prešovský kraj', 'Humenné'),
  ('Košolná', 'Trnavský kraj', 'Trnava'),
  ('Košúty', 'Trnavský kraj', 'Galanta'),
  ('Košťany nad Turcom', 'Žilinský kraj', 'Martin'),
  ('Kotešová', 'Žilinský kraj', 'Bytča'),
  ('Kotmanová', 'Banskobystrický kraj', 'Lučenec'),
  ('Kotrčiná Lúčka', 'Žilinský kraj', 'Žilina'),
  ('Kováčová', 'Banskobystrický kraj', 'Zvolen'),
  ('Kováčová', 'Košický kraj', 'Rožňava'),
  ('Kováčovce', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Koválov', 'Trnavský kraj', 'Senica'),
  ('Koválovec', 'Trnavský kraj', 'Skalica'),
  ('Kovarce', 'Nitriansky kraj', 'Topoľčany'),
  ('Kozárovce', 'Nitriansky kraj', 'Levice'),
  ('Kozelník', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Kozí Vrbovok', 'Banskobystrický kraj', 'Krupina'),
  ('Kožany', 'Prešovský kraj', 'Bardejov'),
  ('Kožuchov', 'Košický kraj', 'Trebišov'),
  ('Kožuchovce', 'Prešovský kraj', 'Stropkov'),
  ('Kračúnovce', 'Prešovský kraj', 'Svidník'),
  ('Krahule', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Krajná Bystrá', 'Prešovský kraj', 'Svidník'),
  ('Krajná Poľana', 'Prešovský kraj', 'Svidník'),
  ('Krajná Porúbka', 'Prešovský kraj', 'Svidník'),
  ('Krajné', 'Trenčiansky kraj', 'Myjava'),
  ('Krajné Čierno', 'Prešovský kraj', 'Svidník'),
  ('Krakovany', 'Trnavský kraj', 'Piešťany'),
  ('Králiky', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Kráľ', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Kráľov Brod', 'Trnavský kraj', 'Galanta'),
  ('Kráľova Lehota', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Kráľová nad Váhom', 'Nitriansky kraj', 'Šaľa'),
  ('Kráľová pri Senci', 'Bratislavský kraj', 'Senec'),
  ('Kraľovany', 'Žilinský kraj', 'Dolný Kubín'),
  ('Kráľovce', 'Košický kraj', 'Košice-okolie'),
  ('Kráľovce-Krnišov', 'Banskobystrický kraj', 'Krupina'),
  ('Kráľovičove Kračany', 'Trnavský kraj', 'Dunajská Streda'),
  ('Kráľovský Chlmec', 'Košický kraj', 'Trebišov'),
  ('Kraskovo', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Krásna Lúka', 'Prešovský kraj', 'Sabinov'),
  ('Krásna Ves', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Krásno', 'Trenčiansky kraj', 'Partizánske'),
  ('Krásno nad Kysucou', 'Žilinský kraj', 'Čadca'),
  ('Krásnohorská Dlhá Lúka', 'Košický kraj', 'Rožňava'),
  ('Krásnohorské Podhradie', 'Košický kraj', 'Rožňava'),
  ('Krásnovce', 'Košický kraj', 'Michalovce'),
  ('Krásny Brod', 'Prešovský kraj', 'Medzilaborce'),
  ('Krasňany', 'Žilinský kraj', 'Žilina'),
  ('Kravany', 'Prešovský kraj', 'Poprad'),
  ('Kravany', 'Košický kraj', 'Trebišov'),
  ('Kravany nad Dunajom', 'Nitriansky kraj', 'Komárno'),
  ('Krčava', 'Košický kraj', 'Sobrance'),
  ('Kremná', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Kremnica', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Kremnické Bane', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Kristy', 'Košický kraj', 'Sobrance'),
  ('Krišľovce', 'Prešovský kraj', 'Stropkov'),
  ('Krišovská Liesková', 'Košický kraj', 'Michalovce'),
  ('Krivá', 'Žilinský kraj', 'Dolný Kubín'),
  ('Krivany', 'Prešovský kraj', 'Sabinov'),
  ('Kriváň', 'Banskobystrický kraj', 'Detva'),
  ('Krivé', 'Prešovský kraj', 'Bardejov'),
  ('Krivoklát', 'Trenčiansky kraj', 'Ilava'),
  ('Krivosúd-Bodovka', 'Trenčiansky kraj', 'Trenčín'),
  ('Kríže', 'Prešovský kraj', 'Bardejov'),
  ('Krížová Ves', 'Prešovský kraj', 'Kežmarok'),
  ('Krížovany', 'Prešovský kraj', 'Prešov'),
  ('Križovany nad Dudváhom', 'Trnavský kraj', 'Trnava'),
  ('Krná', 'Banskobystrický kraj', 'Poltár'),
  ('Krnča', 'Nitriansky kraj', 'Topoľčany'),
  ('Krokava', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Krompachy', 'Košický kraj', 'Spišská Nová Ves'),
  ('Krpeľany', 'Žilinský kraj', 'Martin'),
  ('Krškany', 'Nitriansky kraj', 'Levice'),
  ('Krtovce', 'Nitriansky kraj', 'Topoľčany'),
  ('Kručov', 'Prešovský kraj', 'Stropkov'),
  ('Krupina', 'Banskobystrický kraj', 'Krupina'),
  ('Krušetnica', 'Žilinský kraj', 'Námestovo'),
  ('Krušinec', 'Prešovský kraj', 'Stropkov'),
  ('Krušovce', 'Nitriansky kraj', 'Topoľčany'),
  ('Kružlov', 'Prešovský kraj', 'Bardejov'),
  ('Kružlová', 'Prešovský kraj', 'Svidník'),
  ('Kružná', 'Košický kraj', 'Rožňava'),
  ('Kružno', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Kšinná', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Kubáňovo', 'Nitriansky kraj', 'Levice'),
  ('Kučín', 'Prešovský kraj', 'Bardejov'),
  ('Kučín', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Kuchyňa', 'Bratislavský kraj', 'Malacky'),
  ('Kuklov', 'Trnavský kraj', 'Senica'),
  ('Kuková', 'Prešovský kraj', 'Svidník'),
  ('Kukučínov', 'Nitriansky kraj', 'Levice'),
  ('Kunerad', 'Žilinský kraj', 'Žilina'),
  ('Kunešov', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Kunova Teplica', 'Košický kraj', 'Rožňava'),
  ('Kuraľany', 'Nitriansky kraj', 'Levice'),
  ('Kurima', 'Prešovský kraj', 'Bardejov'),
  ('Kurimany', 'Prešovský kraj', 'Levoča'),
  ('Kurimka', 'Prešovský kraj', 'Svidník'),
  ('Kurov', 'Prešovský kraj', 'Bardejov'),
  ('Kusín', 'Košický kraj', 'Michalovce'),
  ('Kútniky', 'Trnavský kraj', 'Dunajská Streda'),
  ('Kúty', 'Trnavský kraj', 'Senica'),
  ('Kuzmice', 'Nitriansky kraj', 'Topoľčany'),
  ('Kuzmice', 'Košický kraj', 'Trebišov'),
  ('Kvačany', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Kvačany', 'Prešovský kraj', 'Prešov'),
  ('Kvakovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Kvašov', 'Trenčiansky kraj', 'Púchov'),
  ('Kvetoslavov', 'Trnavský kraj', 'Dunajská Streda'),
  ('Kyjatice', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Kyjov', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Kynceľová', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Kysak', 'Košický kraj', 'Košice-okolie'),
  ('Kyselica', 'Trnavský kraj', 'Dunajská Streda'),
  ('Kysta', 'Košický kraj', 'Trebišov'),
  ('Kysucké Nové Mesto', 'Žilinský kraj', 'Kysucké Nové Mesto'),
  ('Kysucký Lieskovec', 'Žilinský kraj', 'Kysucké Nové Mesto'),
  ('Láb', 'Bratislavský kraj', 'Malacky'),
  ('Lackov', 'Banskobystrický kraj', 'Krupina'),
  ('Lacková', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Lackovce', 'Prešovský kraj', 'Humenné'),
  ('Lada', 'Prešovský kraj', 'Prešov'),
  ('Ladce', 'Trenčiansky kraj', 'Ilava'),
  ('Ladice', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Ladmovce', 'Košický kraj', 'Trebišov'),
  ('Ladomerská Vieska', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Ladomirov', 'Prešovský kraj', 'Snina'),
  ('Ladomirová', 'Prešovský kraj', 'Svidník'),
  ('Ladzany', 'Banskobystrický kraj', 'Krupina'),
  ('Lakšárska Nová Ves', 'Trnavský kraj', 'Senica'),
  ('Lascov', 'Prešovský kraj', 'Bardejov'),
  ('Laskár', 'Žilinský kraj', 'Martin'),
  ('Lastomír', 'Košický kraj', 'Michalovce'),
  ('Lastovce', 'Košický kraj', 'Trebišov'),
  ('Laškovce', 'Košický kraj', 'Michalovce'),
  ('Látky', 'Banskobystrický kraj', 'Detva'),
  ('Lazany', 'Trenčiansky kraj', 'Prievidza'),
  ('Lazisko', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Lazy pod Makytou', 'Trenčiansky kraj', 'Púchov'),
  ('Lažany', 'Prešovský kraj', 'Prešov'),
  ('Lednica', 'Trenčiansky kraj', 'Púchov'),
  ('Lednické Rovne', 'Trenčiansky kraj', 'Púchov'),
  ('Legnava', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Lehnice', 'Trnavský kraj', 'Dunajská Streda'),
  ('Lehota', 'Nitriansky kraj', 'Nitra'),
  ('Lehota nad Rimavicou', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Lehota pod Vtáčnikom', 'Trenčiansky kraj', 'Prievidza'),
  ('Lehôtka', 'Banskobystrický kraj', 'Lučenec'),
  ('Lehôtka pod Brehmi', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Lechnica', 'Prešovský kraj', 'Kežmarok'),
  ('Lekárovce', 'Košický kraj', 'Sobrance'),
  ('Leles', 'Košický kraj', 'Trebišov'),
  ('Leľa', 'Nitriansky kraj', 'Nové Zámky'),
  ('Lemešany', 'Prešovský kraj', 'Prešov'),
  ('Lenartov', 'Prešovský kraj', 'Bardejov'),
  ('Lenartovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Lendak', 'Prešovský kraj', 'Kežmarok'),
  ('Lenka', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Lentvora', 'Banskobystrický kraj', 'Lučenec'),
  ('Leopoldov', 'Trnavský kraj', 'Hlohovec'),
  ('Lesenice', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Lesíček', 'Prešovský kraj', 'Prešov'),
  ('Lesné', 'Košický kraj', 'Michalovce'),
  ('Lesnica', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Leštiny', 'Žilinský kraj', 'Dolný Kubín'),
  ('Lešť (vojenský obvod)', 'Banskobystrický kraj', 'Zvolen'),
  ('Letanovce', 'Košický kraj', 'Spišská Nová Ves'),
  ('Letničie', 'Trnavský kraj', 'Skalica'),
  ('Leváre', 'Banskobystrický kraj', 'Revúca'),
  ('Levice', 'Nitriansky kraj', 'Levice'),
  ('Levkuška', 'Banskobystrický kraj', 'Revúca'),
  ('Levoča', 'Prešovský kraj', 'Levoča'),
  ('Ležiachov', 'Žilinský kraj', 'Martin'),
  ('Libichava', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Licince', 'Banskobystrický kraj', 'Revúca'),
  ('Ličartovce', 'Prešovský kraj', 'Prešov'),
  ('Liesek', 'Žilinský kraj', 'Tvrdošín'),
  ('Lieskovany', 'Košický kraj', 'Spišská Nová Ves'),
  ('Lieskovec', 'Banskobystrický kraj', 'Zvolen'),
  ('Lieskovec', 'Prešovský kraj', 'Humenné'),
  ('Liešno', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Liešťany', 'Trenčiansky kraj', 'Prievidza'),
  ('Lietava', 'Žilinský kraj', 'Žilina'),
  ('Lietavská Lúčka', 'Žilinský kraj', 'Žilina'),
  ('Lietavská Svinná-Babkov', 'Žilinský kraj', 'Žilina'),
  ('Likavka', 'Žilinský kraj', 'Ružomberok'),
  ('Limbach', 'Bratislavský kraj', 'Pezinok'),
  ('Lipany', 'Prešovský kraj', 'Sabinov'),
  ('Lipník', 'Trenčiansky kraj', 'Prievidza'),
  ('Lipníky', 'Prešovský kraj', 'Prešov'),
  ('Lipová', 'Nitriansky kraj', 'Nové Zámky'),
  ('Lipová', 'Prešovský kraj', 'Bardejov'),
  ('Lipovany', 'Banskobystrický kraj', 'Lučenec'),
  ('Lipovce', 'Prešovský kraj', 'Prešov'),
  ('Lipové', 'Nitriansky kraj', 'Komárno'),
  ('Lipovec', 'Žilinský kraj', 'Martin'),
  ('Lipovec', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Lipovník', 'Nitriansky kraj', 'Topoľčany'),
  ('Lipovník', 'Košický kraj', 'Rožňava'),
  ('Liptovská Anna', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Liptovská Kokava', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Liptovská Lúžna', 'Žilinský kraj', 'Ružomberok'),
  ('Liptovská Osada', 'Žilinský kraj', 'Ružomberok'),
  ('Liptovská Porúbka', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Liptovská Sielnica', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Liptovská Štiavnica', 'Žilinský kraj', 'Ružomberok'),
  ('Liptovská Teplá', 'Žilinský kraj', 'Ružomberok'),
  ('Liptovská Teplička', 'Prešovský kraj', 'Poprad'),
  ('Liptovské Beharovce', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Liptovské Kľačany', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Liptovské Matiašovce', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Liptovské Revúce', 'Žilinský kraj', 'Ružomberok'),
  ('Liptovské Sliače', 'Žilinský kraj', 'Ružomberok'),
  ('Liptovský Hrádok', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Liptovský Ján', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Liptovský Michal', 'Žilinský kraj', 'Ružomberok'),
  ('Liptovský Mikuláš', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Liptovský Ondrej', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Liptovský Peter', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Liptovský Trnovec', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Lisková', 'Žilinský kraj', 'Ružomberok'),
  ('Lišov', 'Banskobystrický kraj', 'Krupina'),
  ('Litava', 'Banskobystrický kraj', 'Krupina'),
  ('Litmanová', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Livina', 'Trenčiansky kraj', 'Partizánske'),
  ('Livinské Opatovce', 'Trenčiansky kraj', 'Partizánske'),
  ('Livov', 'Prešovský kraj', 'Bardejov'),
  ('Livovská Huta', 'Prešovský kraj', 'Bardejov'),
  ('Lodno', 'Žilinský kraj', 'Kysucké Nové Mesto'),
  ('Lok', 'Nitriansky kraj', 'Levice'),
  ('Lokca', 'Žilinský kraj', 'Námestovo'),
  ('Lom nad Rimavicou', 'Banskobystrický kraj', 'Brezno'),
  ('Lomná', 'Žilinský kraj', 'Námestovo'),
  ('Lomné', 'Prešovský kraj', 'Stropkov'),
  ('Lomnička', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Lontov', 'Nitriansky kraj', 'Levice'),
  ('Lopašov', 'Trnavský kraj', 'Skalica'),
  ('Lopúchov', 'Prešovský kraj', 'Bardejov'),
  ('Lopušné Pažite', 'Žilinský kraj', 'Kysucké Nové Mesto'),
  ('Lošonec', 'Trnavský kraj', 'Trnava'),
  ('Lovce', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Lovča', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Lovčica-Trubín', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Lovinobaňa', 'Banskobystrický kraj', 'Lučenec'),
  ('Lozorno', 'Bratislavský kraj', 'Malacky'),
  ('Ložín', 'Košický kraj', 'Michalovce'),
  ('Lubeník', 'Banskobystrický kraj', 'Revúca'),
  ('Lubina', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Lúč na Ostrove', 'Trnavský kraj', 'Dunajská Streda'),
  ('Lučatín', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Lučenec', 'Banskobystrický kraj', 'Lučenec'),
  ('Lúčina', 'Prešovský kraj', 'Prešov'),
  ('Lučivná', 'Prešovský kraj', 'Poprad'),
  ('Lúčka', 'Prešovský kraj', 'Levoča'),
  ('Lúčka', 'Prešovský kraj', 'Sabinov'),
  ('Lúčka', 'Prešovský kraj', 'Svidník'),
  ('Lúčka', 'Košický kraj', 'Rožňava'),
  ('Lúčky', 'Žilinský kraj', 'Ružomberok'),
  ('Lúčky', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Lúčky', 'Košický kraj', 'Michalovce'),
  ('Lúčnica nad Žitavou', 'Nitriansky kraj', 'Nitra'),
  ('Ludanice', 'Nitriansky kraj', 'Topoľčany'),
  ('Ludrová', 'Žilinský kraj', 'Ružomberok'),
  ('Luhyňa', 'Košický kraj', 'Trebišov'),
  ('Lúka', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Lukačovce', 'Prešovský kraj', 'Humenné'),
  ('Lukáčovce', 'Nitriansky kraj', 'Nitra'),
  ('Lukavica', 'Banskobystrický kraj', 'Zvolen'),
  ('Lukavica', 'Prešovský kraj', 'Bardejov'),
  ('Lukov', 'Prešovský kraj', 'Bardejov'),
  ('Lukovištia', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Lúky', 'Trenčiansky kraj', 'Púchov'),
  ('Lula', 'Nitriansky kraj', 'Levice'),
  ('Lupoč', 'Banskobystrický kraj', 'Lučenec'),
  ('Lutila', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Lutiše', 'Žilinský kraj', 'Žilina'),
  ('Lužany', 'Nitriansky kraj', 'Topoľčany'),
  ('Lužany pri Topli', 'Prešovský kraj', 'Svidník'),
  ('Lužianky', 'Nitriansky kraj', 'Nitra'),
  ('Lysá pod Makytou', 'Trenčiansky kraj', 'Púchov'),
  ('Lysica', 'Žilinský kraj', 'Žilina'),
  ('Ľubá', 'Nitriansky kraj', 'Nové Zámky'),
  ('Ľubeľa', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Ľubica', 'Prešovský kraj', 'Kežmarok'),
  ('Ľubietová', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Ľubiša', 'Prešovský kraj', 'Humenné'),
  ('Ľubochňa', 'Žilinský kraj', 'Ružomberok'),
  ('Ľuboreč', 'Banskobystrický kraj', 'Lučenec'),
  ('Ľuboriečka', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Ľubotice', 'Prešovský kraj', 'Prešov'),
  ('Ľubotín', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Ľubovec', 'Prešovský kraj', 'Prešov'),
  ('Ľudovítová', 'Nitriansky kraj', 'Nitra'),
  ('Ľutina', 'Prešovský kraj', 'Sabinov'),
  ('Ľutov', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Macov', 'Trnavský kraj', 'Dunajská Streda'),
  ('Mad', 'Trnavský kraj', 'Dunajská Streda'),
  ('Madunice', 'Trnavský kraj', 'Hlohovec'),
  ('Magnezitovce', 'Banskobystrický kraj', 'Revúca'),
  ('Machulince', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Majcichov', 'Trnavský kraj', 'Trnava'),
  ('Majere', 'Prešovský kraj', 'Kežmarok'),
  ('Majerovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Makov', 'Žilinský kraj', 'Čadca'),
  ('Makovce', 'Prešovský kraj', 'Stropkov'),
  ('Malá Čalomija', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Malá Čausa', 'Trenčiansky kraj', 'Prievidza'),
  ('Malá Čierna', 'Žilinský kraj', 'Žilina'),
  ('Malá Domaša', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Malá Franková', 'Prešovský kraj', 'Kežmarok'),
  ('Malá Hradná', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Malá Ida', 'Košický kraj', 'Košice-okolie'),
  ('Malá Lehota', 'Banskobystrický kraj', 'Žarnovica'),
  ('Malá Lodina', 'Košický kraj', 'Košice-okolie'),
  ('Malá Mača', 'Trnavský kraj', 'Galanta'),
  ('Malá nad Hronom', 'Nitriansky kraj', 'Nové Zámky'),
  ('Malá Poľana', 'Prešovský kraj', 'Stropkov'),
  ('Malá Tŕňa', 'Košický kraj', 'Trebišov'),
  ('Malacky', 'Bratislavský kraj', 'Malacky'),
  ('Malachov', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Málaš', 'Nitriansky kraj', 'Levice'),
  ('Malatiná', 'Žilinský kraj', 'Dolný Kubín'),
  ('Malatíny', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Malcov', 'Prešovský kraj', 'Bardejov'),
  ('Malčice', 'Košický kraj', 'Michalovce'),
  ('Malé Borové', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Malé Dvorníky', 'Trnavský kraj', 'Dunajská Streda'),
  ('Malé Chyndice', 'Nitriansky kraj', 'Nitra'),
  ('Malé Hoste', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Malé Kosihy', 'Nitriansky kraj', 'Nové Zámky'),
  ('Malé Kozmálovce', 'Nitriansky kraj', 'Levice'),
  ('Malé Kršteňany', 'Trenčiansky kraj', 'Partizánske'),
  ('Malé Lednice', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Malé Leváre', 'Bratislavský kraj', 'Malacky'),
  ('Malé Ludince', 'Nitriansky kraj', 'Levice'),
  ('Malé Ozorovce', 'Košický kraj', 'Trebišov'),
  ('Malé Raškovce', 'Košický kraj', 'Michalovce'),
  ('Malé Ripňany', 'Nitriansky kraj', 'Topoľčany'),
  ('Malé Straciny', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Malé Trakany', 'Košický kraj', 'Trebišov'),
  ('Malé Uherce', 'Trenčiansky kraj', 'Partizánske'),
  ('Malé Vozokany', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Malé Zálužie', 'Nitriansky kraj', 'Nitra'),
  ('Malé Zlievce', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Málinec', 'Banskobystrický kraj', 'Poltár'),
  ('Malinová', 'Trenčiansky kraj', 'Prievidza'),
  ('Malinovo', 'Bratislavský kraj', 'Senec'),
  ('Malužiná', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Malý Cetín', 'Nitriansky kraj', 'Nitra'),
  ('Malý Čepčín', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Malý Horeš', 'Košický kraj', 'Trebišov'),
  ('Malý Kamenec', 'Košický kraj', 'Trebišov'),
  ('Malý Krtíš', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Malý Lapáš', 'Nitriansky kraj', 'Nitra'),
  ('Malý Lipník', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Malý Slavkov', 'Prešovský kraj', 'Kežmarok'),
  ('Malý Slivník', 'Prešovský kraj', 'Prešov'),
  ('Malý Šariš', 'Prešovský kraj', 'Prešov'),
  ('Malženice', 'Trnavský kraj', 'Trnava'),
  ('Mankovce', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Maňa', 'Nitriansky kraj', 'Nové Zámky'),
  ('Marcelová', 'Nitriansky kraj', 'Komárno'),
  ('Margecany', 'Košický kraj', 'Gelnica'),
  ('Marhaň', 'Prešovský kraj', 'Bardejov'),
  ('Marianka', 'Bratislavský kraj', 'Malacky'),
  ('Markovce', 'Košický kraj', 'Michalovce'),
  ('Markuška', 'Košický kraj', 'Rožňava'),
  ('Markušovce', 'Košický kraj', 'Spišská Nová Ves'),
  ('Maršová-Rašov', 'Žilinský kraj', 'Bytča'),
  ('Martin', 'Žilinský kraj', 'Martin'),
  ('Martin nad Žitavou', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Martinček', 'Žilinský kraj', 'Ružomberok'),
  ('Martinová', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Martovce', 'Nitriansky kraj', 'Komárno'),
  ('Mašková', 'Banskobystrický kraj', 'Lučenec'),
  ('Maškovce', 'Prešovský kraj', 'Humenné'),
  ('Matejovce nad Hornádom', 'Košický kraj', 'Spišská Nová Ves'),
  ('Matiaška', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Matiašovce', 'Prešovský kraj', 'Kežmarok'),
  ('Matovce', 'Prešovský kraj', 'Svidník'),
  ('Matúškovo', 'Trnavský kraj', 'Galanta'),
  ('Matysová', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Maťovské Vojkovce', 'Košický kraj', 'Michalovce'),
  ('Medovarce', 'Banskobystrický kraj', 'Krupina'),
  ('Medvedie', 'Prešovský kraj', 'Svidník'),
  ('Medveďov', 'Trnavský kraj', 'Dunajská Streda'),
  ('Medzany', 'Prešovský kraj', 'Prešov'),
  ('Medzev', 'Košický kraj', 'Košice-okolie'),
  ('Medzianky', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Medzibrod', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Medzibrodie nad Oravou', 'Žilinský kraj', 'Dolný Kubín'),
  ('Medzilaborce', 'Prešovský kraj', 'Medzilaborce'),
  ('Melčice-Lieskové', 'Trenčiansky kraj', 'Trenčín'),
  ('Melek', 'Nitriansky kraj', 'Nitra'),
  ('Meliata', 'Košický kraj', 'Rožňava'),
  ('Mengusovce', 'Prešovský kraj', 'Poprad'),
  ('Merašice', 'Trnavský kraj', 'Hlohovec'),
  ('Merník', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Mestečko', 'Trenčiansky kraj', 'Púchov'),
  ('Mestisko', 'Prešovský kraj', 'Svidník'),
  ('Mičakovce', 'Prešovský kraj', 'Svidník'),
  ('Mierovo', 'Trnavský kraj', 'Dunajská Streda'),
  ('Miezgovce', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Michajlov', 'Prešovský kraj', 'Snina'),
  ('Michal na Ostrove', 'Trnavský kraj', 'Dunajská Streda'),
  ('Michal nad Žitavou', 'Nitriansky kraj', 'Nové Zámky'),
  ('Michalková', 'Banskobystrický kraj', 'Zvolen'),
  ('Michalok', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Michalová', 'Banskobystrický kraj', 'Brezno'),
  ('Michalovce', 'Košický kraj', 'Michalovce'),
  ('Michaľany', 'Košický kraj', 'Trebišov'),
  ('Miklušovce', 'Prešovský kraj', 'Prešov'),
  ('Miková', 'Prešovský kraj', 'Stropkov'),
  ('Mikulášová', 'Prešovský kraj', 'Bardejov'),
  ('Mikušovce', 'Trenčiansky kraj', 'Ilava'),
  ('Mikušovce', 'Banskobystrický kraj', 'Lučenec'),
  ('Milhosť', 'Košický kraj', 'Košice-okolie'),
  ('Miloslavov', 'Bratislavský kraj', 'Senec'),
  ('Milpoš', 'Prešovský kraj', 'Sabinov'),
  ('Miňovce', 'Prešovský kraj', 'Stropkov'),
  ('Mirkovce', 'Prešovský kraj', 'Prešov'),
  ('Miroľa', 'Prešovský kraj', 'Svidník'),
  ('Mládzovo', 'Banskobystrický kraj', 'Poltár'),
  ('Mlynárovce', 'Prešovský kraj', 'Svidník'),
  ('Mlynčeky', 'Prešovský kraj', 'Kežmarok'),
  ('Mlynica', 'Prešovský kraj', 'Poprad'),
  ('Mlynky', 'Košický kraj', 'Spišská Nová Ves'),
  ('Mníchova Lehota', 'Trenčiansky kraj', 'Trenčín'),
  ('Mníšek nad Hnilcom', 'Košický kraj', 'Gelnica'),
  ('Mníšek nad Popradom', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Moča', 'Nitriansky kraj', 'Komárno'),
  ('Močenok', 'Nitriansky kraj', 'Šaľa'),
  ('Močiar', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Modra', 'Bratislavský kraj', 'Pezinok'),
  ('Modra nad Cirochou', 'Prešovský kraj', 'Humenné'),
  ('Modrany', 'Nitriansky kraj', 'Komárno'),
  ('Modrová', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Modrovka', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Modrý Kameň', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Mojmírovce', 'Nitriansky kraj', 'Nitra'),
  ('Mojš', 'Žilinský kraj', 'Žilina'),
  ('Mojtín', 'Trenčiansky kraj', 'Púchov'),
  ('Mojzesovo', 'Nitriansky kraj', 'Nové Zámky'),
  ('Mokrá Lúka', 'Banskobystrický kraj', 'Revúca'),
  ('Mokrance', 'Košický kraj', 'Košice-okolie'),
  ('Mokroluh', 'Prešovský kraj', 'Bardejov'),
  ('Mokrý Háj', 'Trnavský kraj', 'Skalica'),
  ('Moldava nad Bodvou', 'Košický kraj', 'Košice-okolie'),
  ('Moravany', 'Košický kraj', 'Michalovce'),
  ('Moravany nad Váhom', 'Trnavský kraj', 'Piešťany'),
  ('Moravské Lieskové', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Moravský Svätý Ján', 'Trnavský kraj', 'Senica'),
  ('Most pri Bratislave', 'Bratislavský kraj', 'Senec'),
  ('Mostová', 'Trnavský kraj', 'Galanta'),
  ('Moškovec', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Mošovce', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Moštenica', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Mošurov', 'Prešovský kraj', 'Prešov'),
  ('Motešice', 'Trenčiansky kraj', 'Trenčín'),
  ('Motyčky', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Môlča', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Mrázovce', 'Prešovský kraj', 'Stropkov'),
  ('Mučín', 'Banskobystrický kraj', 'Lučenec'),
  ('Mudroňovo', 'Nitriansky kraj', 'Komárno'),
  ('Mudrovce', 'Košický kraj', 'Košice-okolie'),
  ('Muľa', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Muráň', 'Banskobystrický kraj', 'Revúca'),
  ('Muránska Dlhá Lúka', 'Banskobystrický kraj', 'Revúca'),
  ('Muránska Huta', 'Banskobystrický kraj', 'Revúca'),
  ('Muránska Lehota', 'Banskobystrický kraj', 'Revúca'),
  ('Muránska Zdychava', 'Banskobystrický kraj', 'Revúca'),
  ('Mútne', 'Žilinský kraj', 'Námestovo'),
  ('Mužla', 'Nitriansky kraj', 'Nové Zámky'),
  ('Myjava', 'Trenčiansky kraj', 'Myjava'),
  ('Myslina', 'Prešovský kraj', 'Humenné'),
  ('Mýtna', 'Banskobystrický kraj', 'Lučenec'),
  ('Mýtne Ludany', 'Nitriansky kraj', 'Levice'),
  ('Mýto pod Ďumbierom', 'Banskobystrický kraj', 'Brezno'),
  ('Nacina Ves', 'Košický kraj', 'Michalovce'),
  ('Nadlice', 'Trenčiansky kraj', 'Partizánske'),
  ('Naháč', 'Trnavský kraj', 'Trnava'),
  ('Nálepkovo', 'Košický kraj', 'Gelnica'),
  ('Námestovo', 'Žilinský kraj', 'Námestovo'),
  ('Nána', 'Nitriansky kraj', 'Nové Zámky'),
  ('Nandraž', 'Banskobystrický kraj', 'Revúca'),
  ('Necpaly', 'Žilinský kraj', 'Martin'),
  ('Nedanovce', 'Trenčiansky kraj', 'Partizánske'),
  ('Nedašovce', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Neded', 'Nitriansky kraj', 'Šaľa'),
  ('Nededza', 'Žilinský kraj', 'Žilina'),
  ('Nedožery-Brezany', 'Trenčiansky kraj', 'Prievidza'),
  ('Nechválova Polianka', 'Prešovský kraj', 'Humenné'),
  ('Nemce', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Nemcovce', 'Prešovský kraj', 'Bardejov'),
  ('Nemcovce', 'Prešovský kraj', 'Prešov'),
  ('Nemčice', 'Nitriansky kraj', 'Topoľčany'),
  ('Nemčiňany', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Nemecká', 'Banskobystrický kraj', 'Brezno'),
  ('Nemečky', 'Nitriansky kraj', 'Topoľčany'),
  ('Nemešany', 'Prešovský kraj', 'Levoča'),
  ('Nemšová', 'Trenčiansky kraj', 'Trenčín'),
  ('Nenince', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Neporadza', 'Trenčiansky kraj', 'Trenčín'),
  ('Neporadza', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Nesvady', 'Nitriansky kraj', 'Komárno'),
  ('Nesluša', 'Žilinský kraj', 'Kysucké Nové Mesto'),
  ('Neverice', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Nevidzany', 'Trenčiansky kraj', 'Prievidza'),
  ('Nevidzany', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Nevoľné', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Nezbudská Lúčka', 'Žilinský kraj', 'Žilina'),
  ('Nimnica', 'Trenčiansky kraj', 'Púchov'),
  ('Nitra', 'Nitriansky kraj', 'Nitra'),
  ('Nitra nad Ipľom', 'Banskobystrický kraj', 'Lučenec'),
  ('Nitrianska Blatnica', 'Nitriansky kraj', 'Topoľčany'),
  ('Nitrianska Streda', 'Nitriansky kraj', 'Topoľčany'),
  ('Nitrianske Hrnčiarovce', 'Nitriansky kraj', 'Nitra'),
  ('Nitrianske Pravno', 'Trenčiansky kraj', 'Prievidza'),
  ('Nitrianske Rudno', 'Trenčiansky kraj', 'Prievidza'),
  ('Nitrianske Sučany', 'Trenčiansky kraj', 'Prievidza'),
  ('Nitrica', 'Trenčiansky kraj', 'Prievidza'),
  ('Nižná', 'Trnavský kraj', 'Piešťany'),
  ('Nižná', 'Žilinský kraj', 'Tvrdošín'),
  ('Nižná Boca', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Nižná Hutka', 'Košický kraj', 'Košice-okolie'),
  ('Nižná Jablonka', 'Prešovský kraj', 'Humenné'),
  ('Nižná Jedľová', 'Prešovský kraj', 'Svidník'),
  ('Nižná Kamenica', 'Košický kraj', 'Košice-okolie'),
  ('Nižná Myšľa', 'Košický kraj', 'Košice-okolie'),
  ('Nižná Olšava', 'Prešovský kraj', 'Stropkov'),
  ('Nižná Pisaná', 'Prešovský kraj', 'Svidník'),
  ('Nižná Polianka', 'Prešovský kraj', 'Bardejov'),
  ('Nižná Rybnica', 'Košický kraj', 'Sobrance'),
  ('Nižná Sitnica', 'Prešovský kraj', 'Humenné'),
  ('Nižná Slaná', 'Košický kraj', 'Rožňava'),
  ('Nižná Voľa', 'Prešovský kraj', 'Bardejov'),
  ('Nižné Ladičkovce', 'Prešovský kraj', 'Humenné'),
  ('Nižné Nemecké', 'Košický kraj', 'Sobrance'),
  ('Nižné Repaše', 'Prešovský kraj', 'Levoča'),
  ('Nižné Ružbachy', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Nižný Čaj', 'Košický kraj', 'Košice-okolie'),
  ('Nižný Hrabovec', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Nižný Hrušov', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Nižný Klátov', 'Košický kraj', 'Košice-okolie'),
  ('Nižný Komárnik', 'Prešovský kraj', 'Svidník'),
  ('Nižný Kručov', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Nižný Lánec', 'Košický kraj', 'Košice-okolie'),
  ('Nižný Mirošov', 'Prešovský kraj', 'Svidník'),
  ('Nižný Orlík', 'Prešovský kraj', 'Svidník'),
  ('Nižný Skálnik', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Nižný Slavkov', 'Prešovský kraj', 'Sabinov'),
  ('Nižný Tvarožec', 'Prešovský kraj', 'Bardejov'),
  ('Nižný Žipov', 'Košický kraj', 'Trebišov'),
  ('Nolčovo', 'Žilinský kraj', 'Martin'),
  ('Norovce', 'Nitriansky kraj', 'Topoľčany'),
  ('Nová Baňa', 'Banskobystrický kraj', 'Žarnovica'),
  ('Nová Bašta', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Nová Bošáca', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Nová Bystrica', 'Žilinský kraj', 'Čadca'),
  ('Nová Dedina', 'Nitriansky kraj', 'Levice'),
  ('Nová Dedinka', 'Bratislavský kraj', 'Senec'),
  ('Nová Dubnica', 'Trenčiansky kraj', 'Ilava'),
  ('Nová Kelča', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Nová Lehota', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Nová Lesná', 'Prešovský kraj', 'Poprad'),
  ('Nová Ľubovňa', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Nová Polhora', 'Košický kraj', 'Košice-okolie'),
  ('Nová Polianka', 'Prešovský kraj', 'Svidník'),
  ('Nová Sedlica', 'Prešovský kraj', 'Snina'),
  ('Nová Ves', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Nová Ves nad Váhom', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Nová Ves nad Žitavou', 'Nitriansky kraj', 'Nitra'),
  ('Nová Vieska', 'Nitriansky kraj', 'Nové Zámky'),
  ('Nováčany', 'Košický kraj', 'Košice-okolie'),
  ('Nováky', 'Trenčiansky kraj', 'Prievidza'),
  ('Nové Hony', 'Banskobystrický kraj', 'Lučenec'),
  ('Nové Mesto nad Váhom', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Nové Sady', 'Nitriansky kraj', 'Nitra'),
  ('Nové Zámky', 'Nitriansky kraj', 'Nové Zámky'),
  ('Novosad', 'Košický kraj', 'Trebišov'),
  ('Novoť', 'Žilinský kraj', 'Námestovo'),
  ('Nový Ruskov', 'Košický kraj', 'Trebišov'),
  ('Nový Salaš', 'Košický kraj', 'Košice-okolie'),
  ('Nový Svet', 'Bratislavský kraj', 'Senec'),
  ('Nový Tekov', 'Nitriansky kraj', 'Levice'),
  ('Nový Život', 'Trnavský kraj', 'Dunajská Streda'),
  ('Nýrovce', 'Nitriansky kraj', 'Levice'),
  ('Ňagov', 'Prešovský kraj', 'Medzilaborce'),
  ('Ňárad', 'Trnavský kraj', 'Dunajská Streda'),
  ('Obeckov', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Obid', 'Nitriansky kraj', 'Nové Zámky'),
  ('Obišovce', 'Košický kraj', 'Košice-okolie'),
  ('Oborín', 'Košický kraj', 'Michalovce'),
  ('Obručné', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Obyce', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Očkov', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Očová', 'Banskobystrický kraj', 'Zvolen'),
  ('Odorín', 'Košický kraj', 'Spišská Nová Ves'),
  ('Ohrady', 'Trnavský kraj', 'Dunajská Streda'),
  ('Ohradzany', 'Prešovský kraj', 'Humenné'),
  ('Ochodnica', 'Žilinský kraj', 'Kysucké Nové Mesto'),
  ('Ochtiná', 'Košický kraj', 'Rožňava'),
  ('Okoč', 'Trnavský kraj', 'Dunajská Streda'),
  ('Okoličná na Ostrove', 'Nitriansky kraj', 'Komárno'),
  ('Okrúhle', 'Prešovský kraj', 'Svidník'),
  ('Okružná', 'Prešovský kraj', 'Prešov'),
  ('Olcnava', 'Košický kraj', 'Spišská Nová Ves'),
  ('Olejníkov', 'Prešovský kraj', 'Sabinov'),
  ('Olešná', 'Žilinský kraj', 'Čadca'),
  ('Olováry', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Olšovany', 'Košický kraj', 'Košice-okolie'),
  ('Oľdza', 'Trnavský kraj', 'Dunajská Streda'),
  ('Oľka', 'Prešovský kraj', 'Medzilaborce'),
  ('Oľšavce', 'Prešovský kraj', 'Bardejov'),
  ('Oľšavica', 'Prešovský kraj', 'Levoča'),
  ('Oľšavka', 'Prešovský kraj', 'Stropkov'),
  ('Oľšavka', 'Košický kraj', 'Spišská Nová Ves'),
  ('Oľšinkov', 'Prešovský kraj', 'Medzilaborce'),
  ('Oľšov', 'Prešovský kraj', 'Sabinov'),
  ('Omastiná', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Omšenie', 'Trenčiansky kraj', 'Trenčín'),
  ('Ondavka', 'Prešovský kraj', 'Bardejov'),
  ('Ondavské Matiašovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Ondrašovce', 'Prešovský kraj', 'Prešov'),
  ('Ondrašová', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Ondrejovce', 'Nitriansky kraj', 'Levice'),
  ('Opátka', 'Košický kraj', 'Košice-okolie'),
  ('Opatovce', 'Trenčiansky kraj', 'Trenčín'),
  ('Opatovce nad Nitrou', 'Trenčiansky kraj', 'Prievidza'),
  ('Opatovská Nová Ves', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Opava', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Opiná', 'Košický kraj', 'Košice-okolie'),
  ('Opoj', 'Trnavský kraj', 'Trnava'),
  ('Oponice', 'Nitriansky kraj', 'Topoľčany'),
  ('Oravce', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Orávka', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Oravská Jasenica', 'Žilinský kraj', 'Námestovo'),
  ('Oravská Lesná', 'Žilinský kraj', 'Námestovo'),
  ('Oravská Polhora', 'Žilinský kraj', 'Námestovo'),
  ('Oravská Poruba', 'Žilinský kraj', 'Dolný Kubín'),
  ('Oravské Veselé', 'Žilinský kraj', 'Námestovo'),
  ('Oravský Biely Potok', 'Žilinský kraj', 'Tvrdošín'),
  ('Oravský Podzámok', 'Žilinský kraj', 'Dolný Kubín'),
  ('Ordzovany', 'Prešovský kraj', 'Levoča'),
  ('Orechová', 'Košický kraj', 'Sobrance'),
  ('Orechová Potôň', 'Trnavský kraj', 'Dunajská Streda'),
  ('Oreské', 'Trnavský kraj', 'Skalica'),
  ('Oreské', 'Košický kraj', 'Michalovce'),
  ('Orešany', 'Nitriansky kraj', 'Topoľčany'),
  ('Orlov', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Orovnica', 'Banskobystrický kraj', 'Žarnovica'),
  ('Ortuťová', 'Prešovský kraj', 'Bardejov'),
  ('Osádka', 'Žilinský kraj', 'Dolný Kubín'),
  ('Osadné', 'Prešovský kraj', 'Snina'),
  ('Osikov', 'Prešovský kraj', 'Bardejov'),
  ('Oslany', 'Trenčiansky kraj', 'Prievidza'),
  ('Osrblie', 'Banskobystrický kraj', 'Brezno'),
  ('Ostrá Lúka', 'Banskobystrický kraj', 'Zvolen'),
  ('Ostratice', 'Trenčiansky kraj', 'Partizánske'),
  ('Ostrov', 'Trnavský kraj', 'Piešťany'),
  ('Ostrov', 'Košický kraj', 'Sobrance'),
  ('Ostrovany', 'Prešovský kraj', 'Sabinov'),
  ('Ostrý Grúň', 'Banskobystrický kraj', 'Žarnovica'),
  ('Osturňa', 'Prešovský kraj', 'Kežmarok'),
  ('Osuské', 'Trnavský kraj', 'Senica'),
  ('Oščadnica', 'Žilinský kraj', 'Čadca'),
  ('Otrhánky', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Otročok', 'Banskobystrický kraj', 'Revúca'),
  ('Ovčiarsko', 'Žilinský kraj', 'Žilina'),
  ('Ovčie', 'Prešovský kraj', 'Prešov'),
  ('Ozdín', 'Banskobystrický kraj', 'Poltár'),
  ('Ožďany', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Pača', 'Košický kraj', 'Rožňava'),
  ('Padáň', 'Trnavský kraj', 'Dunajská Streda'),
  ('Padarovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Pakostov', 'Prešovský kraj', 'Humenné'),
  ('Palárikovo', 'Nitriansky kraj', 'Nové Zámky'),
  ('Palín', 'Košický kraj', 'Michalovce'),
  ('Palota', 'Prešovský kraj', 'Medzilaborce'),
  ('Panické Dravce', 'Banskobystrický kraj', 'Lučenec'),
  ('Paňa', 'Nitriansky kraj', 'Nitra'),
  ('Paňovce', 'Košický kraj', 'Košice-okolie'),
  ('Papín', 'Prešovský kraj', 'Humenné'),
  ('Papradno', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Parchovany', 'Košický kraj', 'Trebišov'),
  ('Parihuzovce', 'Prešovský kraj', 'Snina'),
  ('Párnica', 'Žilinský kraj', 'Dolný Kubín'),
  ('Partizánska Ľupča', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Partizánske', 'Trenčiansky kraj', 'Partizánske'),
  ('Pastovce', 'Nitriansky kraj', 'Levice'),
  ('Pastuchov', 'Trnavský kraj', 'Hlohovec'),
  ('Pašková', 'Košický kraj', 'Rožňava'),
  ('Paština Závada', 'Žilinský kraj', 'Žilina'),
  ('Pata', 'Trnavský kraj', 'Galanta'),
  ('Pataš', 'Trnavský kraj', 'Dunajská Streda'),
  ('Patince', 'Nitriansky kraj', 'Komárno'),
  ('Pavčina Lehota', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Pavlice', 'Trnavský kraj', 'Trnava'),
  ('Pavlová', 'Nitriansky kraj', 'Nové Zámky'),
  ('Pavlova Ves', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Pavlovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Pavlovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Pavlovce nad Uhom', 'Košický kraj', 'Michalovce'),
  ('Pavľany', 'Prešovský kraj', 'Levoča'),
  ('Pažiť', 'Trenčiansky kraj', 'Partizánske'),
  ('Pčoliné', 'Prešovský kraj', 'Snina'),
  ('Pečenice', 'Nitriansky kraj', 'Levice'),
  ('Pečeňady', 'Trnavský kraj', 'Piešťany'),
  ('Pečeňany', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Pečovská Nová Ves', 'Prešovský kraj', 'Sabinov'),
  ('Peder', 'Košický kraj', 'Košice-okolie'),
  ('Perín-Chym', 'Košický kraj', 'Košice-okolie'),
  ('Pernek', 'Bratislavský kraj', 'Malacky'),
  ('Petkovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Petrikovce', 'Košický kraj', 'Michalovce'),
  ('Petrová', 'Prešovský kraj', 'Bardejov'),
  ('Petrova Lehota', 'Trenčiansky kraj', 'Trenčín'),
  ('Petrova Ves', 'Trnavský kraj', 'Skalica'),
  ('Petrovany', 'Prešovský kraj', 'Prešov'),
  ('Petrovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Petrovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Petrovce', 'Košický kraj', 'Sobrance'),
  ('Petrovce nad Laborcom', 'Košický kraj', 'Michalovce'),
  ('Petrovice', 'Žilinský kraj', 'Bytča'),
  ('Petrovo', 'Košický kraj', 'Rožňava'),
  ('Pezinok', 'Bratislavský kraj', 'Pezinok'),
  ('Piešťany', 'Trnavský kraj', 'Piešťany'),
  ('Pichne', 'Prešovský kraj', 'Snina'),
  ('Píla', 'Bratislavský kraj', 'Pezinok'),
  ('Píla', 'Banskobystrický kraj', 'Lučenec'),
  ('Píla', 'Banskobystrický kraj', 'Žarnovica'),
  ('Pinciná', 'Banskobystrický kraj', 'Lučenec'),
  ('Pinkovce', 'Košický kraj', 'Sobrance'),
  ('Piskorovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Pitelová', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Plášťovce', 'Nitriansky kraj', 'Levice'),
  ('Plavé Vozokany', 'Nitriansky kraj', 'Levice'),
  ('Plavecké Podhradie', 'Bratislavský kraj', 'Malacky'),
  ('Plavecký Mikuláš', 'Bratislavský kraj', 'Malacky'),
  ('Plavecký Peter', 'Trnavský kraj', 'Senica'),
  ('Plavecký Štvrtok', 'Bratislavský kraj', 'Malacky'),
  ('Plaveč', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Plavnica', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Plechotice', 'Košický kraj', 'Trebišov'),
  ('Pleš', 'Banskobystrický kraj', 'Lučenec'),
  ('Plešivec', 'Košický kraj', 'Rožňava'),
  ('Plevník-Drienové', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Pliešovce', 'Banskobystrický kraj', 'Zvolen'),
  ('Ploské', 'Banskobystrický kraj', 'Revúca'),
  ('Ploské', 'Košický kraj', 'Košice-okolie'),
  ('Pobedim', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Počarová', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Počúvadlo', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Podbiel', 'Žilinský kraj', 'Tvrdošín'),
  ('Podbranč', 'Trnavský kraj', 'Senica'),
  ('Podbrezová', 'Banskobystrický kraj', 'Brezno'),
  ('Podhájska', 'Nitriansky kraj', 'Nové Zámky'),
  ('Podhorany', 'Nitriansky kraj', 'Nitra'),
  ('Podhorany', 'Prešovský kraj', 'Kežmarok'),
  ('Podhorany', 'Prešovský kraj', 'Prešov'),
  ('Podhorie', 'Žilinský kraj', 'Žilina'),
  ('Podhorie', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Podhoroď', 'Košický kraj', 'Sobrance'),
  ('Podhradie', 'Trenčiansky kraj', 'Prievidza'),
  ('Podhradie', 'Nitriansky kraj', 'Topoľčany'),
  ('Podhradie', 'Žilinský kraj', 'Martin'),
  ('Podhradík', 'Prešovský kraj', 'Prešov'),
  ('Podkonice', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Podkriváň', 'Banskobystrický kraj', 'Detva'),
  ('Podkylava', 'Trenčiansky kraj', 'Myjava'),
  ('Podlužany', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Podlužany', 'Nitriansky kraj', 'Levice'),
  ('Podolie', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Podolínec', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Podrečany', 'Banskobystrický kraj', 'Lučenec'),
  ('Podskalie', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Podtureň', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Podvysoká', 'Žilinský kraj', 'Čadca'),
  ('Podzámčok', 'Banskobystrický kraj', 'Zvolen'),
  ('Pohorelá', 'Banskobystrický kraj', 'Brezno'),
  ('Pohranice', 'Nitriansky kraj', 'Nitra'),
  ('Pohronská Polhora', 'Banskobystrický kraj', 'Brezno'),
  ('Pohronský Bukovec', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Pohronský Ruskov', 'Nitriansky kraj', 'Levice'),
  ('Pochabany', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Pokryváč', 'Žilinský kraj', 'Dolný Kubín'),
  ('Poliakovce', 'Prešovský kraj', 'Bardejov'),
  ('Polianka', 'Trenčiansky kraj', 'Myjava'),
  ('Polichno', 'Banskobystrický kraj', 'Lučenec'),
  ('Polina', 'Banskobystrický kraj', 'Revúca'),
  ('Poloma', 'Prešovský kraj', 'Sabinov'),
  ('Polomka', 'Banskobystrický kraj', 'Brezno'),
  ('Poltár', 'Banskobystrický kraj', 'Poltár'),
  ('Poluvsie', 'Trenčiansky kraj', 'Prievidza'),
  ('Poľanovce', 'Prešovský kraj', 'Levoča'),
  ('Poľany', 'Košický kraj', 'Trebišov'),
  ('Poľný Kesov', 'Nitriansky kraj', 'Nitra'),
  ('Pongrácovce', 'Prešovský kraj', 'Levoča'),
  ('Poniky', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Poprad', 'Prešovský kraj', 'Poprad'),
  ('Poproč', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Poproč', 'Košický kraj', 'Košice-okolie'),
  ('Popudinské Močidľany', 'Trnavský kraj', 'Skalica'),
  ('Poráč', 'Košický kraj', 'Spišská Nová Ves'),
  ('Poriadie', 'Trenčiansky kraj', 'Myjava'),
  ('Porostov', 'Košický kraj', 'Sobrance'),
  ('Poruba', 'Trenčiansky kraj', 'Prievidza'),
  ('Poruba pod Vihorlatom', 'Košický kraj', 'Michalovce'),
  ('Porúbka', 'Žilinský kraj', 'Žilina'),
  ('Porúbka', 'Prešovský kraj', 'Bardejov'),
  ('Porúbka', 'Prešovský kraj', 'Humenné'),
  ('Porúbka', 'Košický kraj', 'Sobrance'),
  ('Poša', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Potok', 'Žilinský kraj', 'Ružomberok'),
  ('Potok', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Potoky', 'Prešovský kraj', 'Stropkov'),
  ('Potôčky', 'Prešovský kraj', 'Stropkov'),
  ('Potônske Lúky', 'Trnavský kraj', 'Dunajská Streda'),
  ('Potvorice', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Považany', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Považská Bystrica', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Povina', 'Žilinský kraj', 'Kysucké Nové Mesto'),
  ('Povoda', 'Trnavský kraj', 'Dunajská Streda'),
  ('Povrazník', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Pozba', 'Nitriansky kraj', 'Nové Zámky'),
  ('Pozdišovce', 'Košický kraj', 'Michalovce'),
  ('Pôtor', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Praha', 'Banskobystrický kraj', 'Lučenec'),
  ('Prakovce', 'Košický kraj', 'Gelnica'),
  ('Prašice', 'Nitriansky kraj', 'Topoľčany'),
  ('Prašník', 'Trnavský kraj', 'Piešťany'),
  ('Pravenec', 'Trenčiansky kraj', 'Prievidza'),
  ('Pravica', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Pravotice', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Práznovce', 'Nitriansky kraj', 'Topoľčany'),
  ('Prečín', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Predajná', 'Banskobystrický kraj', 'Brezno'),
  ('Predmier', 'Žilinský kraj', 'Bytča'),
  ('Prenčov', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Preseľany', 'Nitriansky kraj', 'Topoľčany'),
  ('Prestavlky', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Prešov', 'Prešovský kraj', 'Prešov'),
  ('Príbelce', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Pribeník', 'Košický kraj', 'Trebišov'),
  ('Pribeta', 'Nitriansky kraj', 'Komárno'),
  ('Pribiš', 'Žilinský kraj', 'Dolný Kubín'),
  ('Príbovce', 'Žilinský kraj', 'Martin'),
  ('Pribylina', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Priechod', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Priekopa', 'Košický kraj', 'Sobrance'),
  ('Priepasné', 'Trenčiansky kraj', 'Myjava'),
  ('Prietrž', 'Trnavský kraj', 'Senica'),
  ('Prietržka', 'Trnavský kraj', 'Skalica'),
  ('Prievaly', 'Trnavský kraj', 'Senica'),
  ('Prievidza', 'Trenčiansky kraj', 'Prievidza'),
  ('Prihradzany', 'Banskobystrický kraj', 'Revúca'),
  ('Príkra', 'Prešovský kraj', 'Svidník'),
  ('Príslop', 'Prešovský kraj', 'Snina'),
  ('Prituľany', 'Prešovský kraj', 'Humenné'),
  ('Proč', 'Prešovský kraj', 'Prešov'),
  ('Prochot', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Prosačov', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Prosiek', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Prša', 'Banskobystrický kraj', 'Lučenec'),
  ('Pruské', 'Trenčiansky kraj', 'Ilava'),
  ('Prusy', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Pružina', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Pstriná', 'Prešovský kraj', 'Svidník'),
  ('Ptičie', 'Prešovský kraj', 'Humenné'),
  ('Ptrukša', 'Košický kraj', 'Michalovce'),
  ('Pucov', 'Žilinský kraj', 'Dolný Kubín'),
  ('Púchov', 'Trenčiansky kraj', 'Púchov'),
  ('Pukanec', 'Nitriansky kraj', 'Levice'),
  ('Pusté Čemerné', 'Košický kraj', 'Michalovce'),
  ('Pusté Pole', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Pusté Sady', 'Trnavský kraj', 'Galanta'),
  ('Pusté Úľany', 'Trnavský kraj', 'Galanta'),
  ('Pušovce', 'Prešovský kraj', 'Prešov'),
  ('Rabča', 'Žilinský kraj', 'Námestovo'),
  ('Rabčice', 'Žilinský kraj', 'Námestovo'),
  ('Rad', 'Košický kraj', 'Trebišov'),
  ('Radatice', 'Prešovský kraj', 'Prešov'),
  ('Radava', 'Nitriansky kraj', 'Nové Zámky'),
  ('Radimov', 'Trnavský kraj', 'Skalica'),
  ('Radnovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Radobica', 'Trenčiansky kraj', 'Prievidza'),
  ('Radoľa', 'Žilinský kraj', 'Kysucké Nové Mesto'),
  ('Radoma', 'Prešovský kraj', 'Svidník'),
  ('Radošina', 'Nitriansky kraj', 'Topoľčany'),
  ('Radošovce', 'Trnavský kraj', 'Skalica'),
  ('Radošovce', 'Trnavský kraj', 'Trnava'),
  ('Radôstka', 'Žilinský kraj', 'Čadca'),
  ('Radvanovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Radvaň nad Dunajom', 'Nitriansky kraj', 'Komárno'),
  ('Radvaň nad Laborcom', 'Prešovský kraj', 'Medzilaborce'),
  ('Radzovce', 'Banskobystrický kraj', 'Lučenec'),
  ('Rafajovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Rajčany', 'Nitriansky kraj', 'Topoľčany'),
  ('Rajec', 'Žilinský kraj', 'Žilina'),
  ('Rajecká Lesná', 'Žilinský kraj', 'Žilina'),
  ('Rajecké Teplice', 'Žilinský kraj', 'Žilina'),
  ('Rákoš', 'Banskobystrický kraj', 'Revúca'),
  ('Rákoš', 'Košický kraj', 'Košice-okolie'),
  ('Raková', 'Žilinský kraj', 'Čadca'),
  ('Rakovčík', 'Prešovský kraj', 'Svidník'),
  ('Rakovec nad Ondavou', 'Košický kraj', 'Michalovce'),
  ('Rakovice', 'Trnavský kraj', 'Piešťany'),
  ('Rakovnica', 'Košický kraj', 'Rožňava'),
  ('Rakovo', 'Žilinský kraj', 'Martin'),
  ('Rakša', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Rakúsy', 'Prešovský kraj', 'Kežmarok'),
  ('Rakytník', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Rankovce', 'Košický kraj', 'Košice-okolie'),
  ('Rapovce', 'Banskobystrický kraj', 'Lučenec'),
  ('Raslavice', 'Prešovský kraj', 'Bardejov'),
  ('Rastislavice', 'Nitriansky kraj', 'Nové Zámky'),
  ('Rašice', 'Banskobystrický kraj', 'Revúca'),
  ('Ratka', 'Banskobystrický kraj', 'Lučenec'),
  ('Ratková', 'Banskobystrický kraj', 'Revúca'),
  ('Ratkovce', 'Trnavský kraj', 'Hlohovec'),
  ('Ratkovo', 'Žilinský kraj', 'Martin'),
  ('Ratkovská Lehota', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Ratkovská Suchá', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Ratkovské Bystré', 'Banskobystrický kraj', 'Revúca'),
  ('Ratnovce', 'Trnavský kraj', 'Piešťany'),
  ('Ratvaj', 'Prešovský kraj', 'Sabinov'),
  ('Ráztočno', 'Trenčiansky kraj', 'Prievidza'),
  ('Ráztoka', 'Banskobystrický kraj', 'Brezno'),
  ('Ražňany', 'Prešovský kraj', 'Sabinov'),
  ('Reca', 'Bratislavský kraj', 'Senec'),
  ('Regetovka', 'Prešovský kraj', 'Bardejov'),
  ('Rejdová', 'Košický kraj', 'Rožňava'),
  ('Reľov', 'Prešovský kraj', 'Kežmarok'),
  ('Remeniny', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Remetské Hámre', 'Košický kraj', 'Sobrance'),
  ('Renčišov', 'Prešovský kraj', 'Sabinov'),
  ('Repejov', 'Prešovský kraj', 'Medzilaborce'),
  ('Repište', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Rešica', 'Košický kraj', 'Košice-okolie'),
  ('Rešov', 'Prešovský kraj', 'Bardejov'),
  ('Revúca', 'Banskobystrický kraj', 'Revúca'),
  ('Revúcka Lehota', 'Banskobystrický kraj', 'Revúca'),
  ('Riečka', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Riečka', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Richnava', 'Košický kraj', 'Gelnica'),
  ('Richvald', 'Prešovský kraj', 'Bardejov'),
  ('Rimavská Baňa', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Rimavská Seč', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Rimavská Sobota', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Rimavské Brezovo', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Rimavské Janovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Rimavské Zalužany', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Rišňovce', 'Nitriansky kraj', 'Nitra'),
  ('Rohov', 'Trnavský kraj', 'Senica'),
  ('Rohovce', 'Trnavský kraj', 'Dunajská Streda'),
  ('Rohožník', 'Bratislavský kraj', 'Malacky'),
  ('Rohožník', 'Prešovský kraj', 'Humenné'),
  ('Rochovce', 'Košický kraj', 'Rožňava'),
  ('Rokycany', 'Prešovský kraj', 'Prešov'),
  ('Rokytov', 'Prešovský kraj', 'Bardejov'),
  ('Rokytov pri Humennom', 'Prešovský kraj', 'Humenné'),
  ('Rokytovce', 'Prešovský kraj', 'Medzilaborce'),
  ('Rosina', 'Žilinský kraj', 'Žilina'),
  ('Roškovce', 'Prešovský kraj', 'Medzilaborce'),
  ('Roštár', 'Košický kraj', 'Rožňava'),
  ('Rovensko', 'Trnavský kraj', 'Senica'),
  ('Rovinka', 'Bratislavský kraj', 'Senec'),
  ('Rovné', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Rovné', 'Prešovský kraj', 'Humenné'),
  ('Rovné', 'Prešovský kraj', 'Svidník'),
  ('Rovňany', 'Banskobystrický kraj', 'Poltár'),
  ('Rozhanovce', 'Košický kraj', 'Košice-okolie'),
  ('Rozložná', 'Košický kraj', 'Rožňava'),
  ('Roztoky', 'Prešovský kraj', 'Svidník'),
  ('Rožkovany', 'Prešovský kraj', 'Sabinov'),
  ('Rožňava', 'Košický kraj', 'Rožňava'),
  ('Rožňavské Bystré', 'Košický kraj', 'Rožňava'),
  ('Rúbaň', 'Nitriansky kraj', 'Nové Zámky'),
  ('Rudina', 'Žilinský kraj', 'Kysucké Nové Mesto'),
  ('Rudinka', 'Žilinský kraj', 'Kysucké Nové Mesto'),
  ('Rudinská', 'Žilinský kraj', 'Kysucké Nové Mesto'),
  ('Rudlov', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Rudná', 'Košický kraj', 'Rožňava'),
  ('Rudnianska Lehota', 'Trenčiansky kraj', 'Prievidza'),
  ('Rudník', 'Trenčiansky kraj', 'Myjava'),
  ('Rudník', 'Košický kraj', 'Košice-okolie'),
  ('Rudno', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Rudno nad Hronom', 'Banskobystrický kraj', 'Žarnovica'),
  ('Rudňany', 'Košický kraj', 'Spišská Nová Ves'),
  ('Rumanová', 'Nitriansky kraj', 'Nitra'),
  ('Rumince', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Runina', 'Prešovský kraj', 'Snina'),
  ('Ruská', 'Košický kraj', 'Michalovce'),
  ('Ruská Bystrá', 'Košický kraj', 'Sobrance'),
  ('Ruská Kajňa', 'Prešovský kraj', 'Humenné'),
  ('Ruská Nová Ves', 'Prešovský kraj', 'Prešov'),
  ('Ruská Poruba', 'Prešovský kraj', 'Humenné'),
  ('Ruská Volová', 'Prešovský kraj', 'Snina'),
  ('Ruská Voľa', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Ruská Voľa nad Popradom', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Ruskov', 'Košický kraj', 'Košice-okolie'),
  ('Ruskovce', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Ruskovce', 'Košický kraj', 'Sobrance'),
  ('Ruský Hrabovec', 'Košický kraj', 'Sobrance'),
  ('Ruský Potok', 'Prešovský kraj', 'Snina'),
  ('Ružiná', 'Banskobystrický kraj', 'Lučenec'),
  ('Ružindol', 'Trnavský kraj', 'Trnava'),
  ('Ružomberok', 'Žilinský kraj', 'Ružomberok'),
  ('Rybany', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Rybky', 'Trnavský kraj', 'Senica'),
  ('Rybník', 'Nitriansky kraj', 'Levice'),
  ('Rybník', 'Banskobystrický kraj', 'Revúca'),
  ('Rykynčice', 'Banskobystrický kraj', 'Krupina'),
  ('Sabinov', 'Prešovský kraj', 'Sabinov'),
  ('Sačurov', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Sádočné', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Sady nad Torysou', 'Košický kraj', 'Košice-okolie'),
  ('Salka', 'Nitriansky kraj', 'Nové Zámky'),
  ('Santovka', 'Nitriansky kraj', 'Levice'),
  ('Sap', 'Trnavský kraj', 'Dunajská Streda'),
  ('Sása', 'Banskobystrický kraj', 'Revúca'),
  ('Sása', 'Banskobystrický kraj', 'Zvolen'),
  ('Sasinkovo', 'Trnavský kraj', 'Hlohovec'),
  ('Sazdice', 'Nitriansky kraj', 'Levice'),
  ('Sebedín-Bečov', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Sebedražie', 'Trenčiansky kraj', 'Prievidza'),
  ('Sebechleby', 'Banskobystrický kraj', 'Krupina'),
  ('Seč', 'Trenčiansky kraj', 'Prievidza'),
  ('Sečianky', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Sečovce', 'Košický kraj', 'Trebišov'),
  ('Sečovská Polianka', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Sedliacka Dubová', 'Žilinský kraj', 'Dolný Kubín'),
  ('Sedlice', 'Prešovský kraj', 'Prešov'),
  ('Sedliská', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Sedmerovec', 'Trenčiansky kraj', 'Ilava'),
  ('Sejkov', 'Košický kraj', 'Sobrance'),
  ('Sekule', 'Trnavský kraj', 'Senica'),
  ('Selce', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Selce', 'Banskobystrický kraj', 'Krupina'),
  ('Selce', 'Banskobystrický kraj', 'Poltár'),
  ('Selec', 'Trenčiansky kraj', 'Trenčín'),
  ('Selice', 'Nitriansky kraj', 'Šaľa'),
  ('Seľany', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Semerovo', 'Nitriansky kraj', 'Nové Zámky'),
  ('Senec', 'Bratislavský kraj', 'Senec'),
  ('Seniakovce', 'Prešovský kraj', 'Prešov'),
  ('Senica', 'Trnavský kraj', 'Senica'),
  ('Senné', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Senné', 'Košický kraj', 'Michalovce'),
  ('Senohrad', 'Banskobystrický kraj', 'Krupina'),
  ('Seňa', 'Košický kraj', 'Košice-okolie'),
  ('Sereď', 'Trnavský kraj', 'Galanta'),
  ('Sielnica', 'Banskobystrický kraj', 'Zvolen'),
  ('Sihelné', 'Žilinský kraj', 'Námestovo'),
  ('Sihla', 'Banskobystrický kraj', 'Brezno'),
  ('Sikenica', 'Nitriansky kraj', 'Levice'),
  ('Sikenička', 'Nitriansky kraj', 'Nové Zámky'),
  ('Siladice', 'Trnavský kraj', 'Hlohovec'),
  ('Silica', 'Košický kraj', 'Rožňava'),
  ('Silická Brezová', 'Košický kraj', 'Rožňava'),
  ('Silická Jablonica', 'Košický kraj', 'Rožňava'),
  ('Sirk', 'Banskobystrický kraj', 'Revúca'),
  ('Sirník', 'Košický kraj', 'Trebišov'),
  ('Skačany', 'Trenčiansky kraj', 'Partizánske'),
  ('Skalica', 'Trnavský kraj', 'Skalica'),
  ('Skalité', 'Žilinský kraj', 'Čadca'),
  ('Skalka nad Váhom', 'Trenčiansky kraj', 'Trenčín'),
  ('Skároš', 'Košický kraj', 'Košice-okolie'),
  ('Skerešovo', 'Banskobystrický kraj', 'Revúca'),
  ('Sklabiná', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Sklabinský Podzámok', 'Žilinský kraj', 'Martin'),
  ('Sklabiňa', 'Žilinský kraj', 'Martin'),
  ('Sklené', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Sklené Teplice', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Skrabské', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Skýcov', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Sládkovičovo', 'Trnavský kraj', 'Galanta'),
  ('Slančík', 'Košický kraj', 'Košice-okolie'),
  ('Slanec', 'Košický kraj', 'Košice-okolie'),
  ('Slanská Huta', 'Košický kraj', 'Košice-okolie'),
  ('Slanské Nové Mesto', 'Košický kraj', 'Košice-okolie'),
  ('Slaská', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Slatina', 'Nitriansky kraj', 'Levice'),
  ('Slatina nad Bebravou', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Slatinka nad Bebravou', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Slatinské Lazy', 'Banskobystrický kraj', 'Detva'),
  ('Slatvina', 'Košický kraj', 'Spišská Nová Ves'),
  ('Slavec', 'Košický kraj', 'Rožňava'),
  ('Slavkovce', 'Košický kraj', 'Michalovce'),
  ('Slavnica', 'Trenčiansky kraj', 'Ilava'),
  ('Slavoška', 'Košický kraj', 'Rožňava'),
  ('Slavošovce', 'Košický kraj', 'Rožňava'),
  ('Slepčany', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Sliač', 'Banskobystrický kraj', 'Zvolen'),
  ('Sliepkovce', 'Košický kraj', 'Michalovce'),
  ('Slizké', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Slivník', 'Košický kraj', 'Trebišov'),
  ('Slopná', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Slovany', 'Žilinský kraj', 'Martin'),
  ('Slovenská Kajňa', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Slovenská Ľupča', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Slovenská Nová Ves', 'Trnavský kraj', 'Trnava'),
  ('Slovenská Ves', 'Prešovský kraj', 'Kežmarok'),
  ('Slovenská Volová', 'Prešovský kraj', 'Humenné'),
  ('Slovenské Ďarmoty', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Slovenské Kľačany', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Slovenské Krivé', 'Prešovský kraj', 'Humenné'),
  ('Slovenské Nové Mesto', 'Košický kraj', 'Trebišov'),
  ('Slovenské Pravno', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Slovenský Grob', 'Bratislavský kraj', 'Pezinok'),
  ('Slovinky', 'Košický kraj', 'Spišská Nová Ves'),
  ('Sľažany', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Smilno', 'Prešovský kraj', 'Bardejov'),
  ('Smižany', 'Košický kraj', 'Spišská Nová Ves'),
  ('Smolenice', 'Trnavský kraj', 'Trnava'),
  ('Smolinské', 'Trnavský kraj', 'Senica'),
  ('Smolnícka Huta', 'Košický kraj', 'Gelnica'),
  ('Smolník', 'Košický kraj', 'Gelnica'),
  ('Smrdáky', 'Trnavský kraj', 'Senica'),
  ('Smrečany', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Snakov', 'Prešovský kraj', 'Bardejov'),
  ('Snežnica', 'Žilinský kraj', 'Kysucké Nové Mesto'),
  ('Snina', 'Prešovský kraj', 'Snina'),
  ('Socovce', 'Žilinský kraj', 'Martin'),
  ('Soblahov', 'Trenčiansky kraj', 'Trenčín'),
  ('Soboš', 'Prešovský kraj', 'Svidník'),
  ('Sobotište', 'Trnavský kraj', 'Senica'),
  ('Sobrance', 'Košický kraj', 'Sobrance'),
  ('Sokolce', 'Nitriansky kraj', 'Komárno'),
  ('Sokolovce', 'Trnavský kraj', 'Piešťany'),
  ('Sokoľ', 'Košický kraj', 'Košice-okolie'),
  ('Sokoľany', 'Košický kraj', 'Košice-okolie'),
  ('Solčany', 'Nitriansky kraj', 'Topoľčany'),
  ('Solčianky', 'Nitriansky kraj', 'Topoľčany'),
  ('Sološnica', 'Bratislavský kraj', 'Malacky'),
  ('Soľ', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Soľnička', 'Košický kraj', 'Trebišov'),
  ('Soľník', 'Prešovský kraj', 'Stropkov'),
  ('Somotor', 'Košický kraj', 'Trebišov'),
  ('Sopkovce', 'Prešovský kraj', 'Humenné'),
  ('Spišská Belá', 'Prešovský kraj', 'Kežmarok'),
  ('Spišská Nová Ves', 'Košický kraj', 'Spišská Nová Ves'),
  ('Spišská Stará Ves', 'Prešovský kraj', 'Kežmarok'),
  ('Spišská Teplica', 'Prešovský kraj', 'Poprad'),
  ('Spišské Bystré', 'Prešovský kraj', 'Poprad'),
  ('Spišské Hanušovce', 'Prešovský kraj', 'Kežmarok'),
  ('Spišské Podhradie', 'Prešovský kraj', 'Levoča'),
  ('Spišské Tomášovce', 'Košický kraj', 'Spišská Nová Ves'),
  ('Spišské Vlachy', 'Košický kraj', 'Spišská Nová Ves'),
  ('Spišský Hrhov', 'Prešovský kraj', 'Levoča'),
  ('Spišský Hrušov', 'Košický kraj', 'Spišská Nová Ves'),
  ('Spišský Štiavnik', 'Prešovský kraj', 'Poprad'),
  ('Spišský Štvrtok', 'Prešovský kraj', 'Levoča'),
  ('Stakčín', 'Prešovský kraj', 'Snina'),
  ('Stakčínska Roztoka', 'Prešovský kraj', 'Snina'),
  ('Stanča', 'Košický kraj', 'Trebišov'),
  ('Stankovany', 'Žilinský kraj', 'Ružomberok'),
  ('Stankovce', 'Košický kraj', 'Trebišov'),
  ('Stará Bašta', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Stará Bystrica', 'Žilinský kraj', 'Čadca'),
  ('Stará Halič', 'Banskobystrický kraj', 'Lučenec'),
  ('Stará Huta', 'Banskobystrický kraj', 'Detva'),
  ('Stará Kremnička', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Stará Lehota', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Stará Lesná', 'Prešovský kraj', 'Kežmarok'),
  ('Stará Ľubovňa', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Stará Myjava', 'Trenčiansky kraj', 'Myjava'),
  ('Stará Turá', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Stará Voda', 'Košický kraj', 'Gelnica'),
  ('Staré', 'Košický kraj', 'Michalovce'),
  ('Staré Hory', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Starina', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Starý Hrádok', 'Nitriansky kraj', 'Levice'),
  ('Starý Tekov', 'Nitriansky kraj', 'Levice'),
  ('Staškov', 'Žilinský kraj', 'Čadca'),
  ('Staškovce', 'Prešovský kraj', 'Stropkov'),
  ('Stebnícka Huta', 'Prešovský kraj', 'Bardejov'),
  ('Stebník', 'Prešovský kraj', 'Bardejov'),
  ('Stožok', 'Banskobystrický kraj', 'Detva'),
  ('Stráne pod Tatrami', 'Prešovský kraj', 'Kežmarok'),
  ('Stránska', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Stránske', 'Žilinský kraj', 'Žilina'),
  ('Stráňany', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Stráňavy', 'Žilinský kraj', 'Žilina'),
  ('Stratená', 'Košický kraj', 'Rožňava'),
  ('Stráža', 'Žilinský kraj', 'Žilina'),
  ('Strážne', 'Košický kraj', 'Trebišov'),
  ('Strážske', 'Košický kraj', 'Michalovce'),
  ('Strečno', 'Žilinský kraj', 'Žilina'),
  ('Streda nad Bodrogom', 'Košický kraj', 'Trebišov'),
  ('Stredné Plachtince', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Strekov', 'Nitriansky kraj', 'Nové Zámky'),
  ('Strelníky', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Stretava', 'Košický kraj', 'Michalovce'),
  ('Stretavka', 'Košický kraj', 'Michalovce'),
  ('Streženice', 'Trenčiansky kraj', 'Púchov'),
  ('Strihovce', 'Prešovský kraj', 'Snina'),
  ('Stročín', 'Prešovský kraj', 'Svidník'),
  ('Stropkov', 'Prešovský kraj', 'Stropkov'),
  ('Studená', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Studenec', 'Prešovský kraj', 'Levoča'),
  ('Studienka', 'Bratislavský kraj', 'Malacky'),
  ('Stuľany', 'Prešovský kraj', 'Bardejov'),
  ('Stupava', 'Bratislavský kraj', 'Malacky'),
  ('Stupné', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Sučany', 'Žilinský kraj', 'Martin'),
  ('Sudince', 'Banskobystrický kraj', 'Krupina'),
  ('Súdovce', 'Banskobystrický kraj', 'Krupina'),
  ('Suchá Dolina', 'Prešovský kraj', 'Prešov'),
  ('Suchá Hora', 'Žilinský kraj', 'Tvrdošín'),
  ('Suchá nad Parnou', 'Trnavský kraj', 'Trnava'),
  ('Sucháň', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Suché', 'Košický kraj', 'Michalovce'),
  ('Suché Brezovo', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Suchohrad', 'Bratislavský kraj', 'Malacky'),
  ('Sukov', 'Prešovský kraj', 'Medzilaborce'),
  ('Sulín', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Súlovce', 'Nitriansky kraj', 'Topoľčany'),
  ('Súľov-Hradná', 'Žilinský kraj', 'Bytča'),
  ('Sušany', 'Banskobystrický kraj', 'Poltár'),
  ('Sútor', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Svätá Mária', 'Košický kraj', 'Trebišov'),
  ('Svätoplukovo', 'Nitriansky kraj', 'Nitra'),
  ('Svätuš', 'Košický kraj', 'Sobrance'),
  ('Svätuše', 'Košický kraj', 'Trebišov'),
  ('Svätý Anton', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Svätý Jur', 'Bratislavský kraj', 'Pezinok'),
  ('Svätý Kríž', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Svätý Peter', 'Nitriansky kraj', 'Komárno'),
  ('Svederník', 'Žilinský kraj', 'Žilina'),
  ('Sverepec', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Sveržov', 'Prešovský kraj', 'Bardejov'),
  ('Svetlice', 'Prešovský kraj', 'Medzilaborce'),
  ('Svidnička', 'Prešovský kraj', 'Svidník'),
  ('Svidník', 'Prešovský kraj', 'Svidník'),
  ('Svinia', 'Prešovský kraj', 'Prešov'),
  ('Svinica', 'Košický kraj', 'Košice-okolie'),
  ('Svinice', 'Košický kraj', 'Trebišov'),
  ('Svinná', 'Trenčiansky kraj', 'Trenčín'),
  ('Svit', 'Prešovský kraj', 'Poprad'),
  ('Svodín', 'Nitriansky kraj', 'Nové Zámky'),
  ('Svrbice', 'Nitriansky kraj', 'Topoľčany'),
  ('Svrčinovec', 'Žilinský kraj', 'Čadca'),
  ('Šahy', 'Nitriansky kraj', 'Levice'),
  ('Šajdíkove Humence', 'Trnavský kraj', 'Senica'),
  ('Šalgovce', 'Nitriansky kraj', 'Topoľčany'),
  ('Šalgočka', 'Trnavský kraj', 'Galanta'),
  ('Šalov', 'Nitriansky kraj', 'Levice'),
  ('Šaľa', 'Nitriansky kraj', 'Šaľa'),
  ('Šambron', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Šamorín', 'Trnavský kraj', 'Dunajská Streda'),
  ('Šamudovce', 'Košický kraj', 'Michalovce'),
  ('Šandal', 'Prešovský kraj', 'Stropkov'),
  ('Šarbov', 'Prešovský kraj', 'Svidník'),
  ('Šarišská Poruba', 'Prešovský kraj', 'Prešov'),
  ('Šarišská Trstená', 'Prešovský kraj', 'Prešov'),
  ('Šarišské Bohdanovce', 'Prešovský kraj', 'Prešov'),
  ('Šarišské Čierne', 'Prešovský kraj', 'Bardejov'),
  ('Šarišské Dravce', 'Prešovský kraj', 'Sabinov'),
  ('Šarišské Jastrabie', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Šarišské Michaľany', 'Prešovský kraj', 'Sabinov'),
  ('Šarišské Sokolovce', 'Prešovský kraj', 'Sabinov'),
  ('Šarišský Štiavnik', 'Prešovský kraj', 'Svidník'),
  ('Šarkan', 'Nitriansky kraj', 'Nové Zámky'),
  ('Šarovce', 'Nitriansky kraj', 'Levice'),
  ('Šašová', 'Prešovský kraj', 'Bardejov'),
  ('Šaštín-Stráže', 'Trnavský kraj', 'Senica'),
  ('Šávoľ', 'Banskobystrický kraj', 'Lučenec'),
  ('Šelpice', 'Trnavský kraj', 'Trnava'),
  ('Šemetkovce', 'Prešovský kraj', 'Svidník'),
  ('Šemša', 'Košický kraj', 'Košice-okolie'),
  ('Šenkvice', 'Bratislavský kraj', 'Pezinok'),
  ('Šiatorská Bukovinka', 'Banskobystrický kraj', 'Lučenec'),
  ('Šiba', 'Prešovský kraj', 'Bardejov'),
  ('Šíd', 'Banskobystrický kraj', 'Lučenec'),
  ('Šimonovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Šindliar', 'Prešovský kraj', 'Prešov'),
  ('Šintava', 'Trnavský kraj', 'Galanta'),
  ('Šípkov', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Šípkové', 'Trnavský kraj', 'Piešťany'),
  ('Širákov', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Širkovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Široké', 'Prešovský kraj', 'Prešov'),
  ('Šišov', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Šivetice', 'Banskobystrický kraj', 'Revúca'),
  ('Šmigovec', 'Prešovský kraj', 'Snina'),
  ('Šoltýska', 'Banskobystrický kraj', 'Poltár'),
  ('Šoporňa', 'Trnavský kraj', 'Galanta'),
  ('Špačince', 'Trnavský kraj', 'Trnava'),
  ('Špania Dolina', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Španie Pole', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Šrobárová', 'Nitriansky kraj', 'Komárno'),
  ('Štefanov', 'Trnavský kraj', 'Senica'),
  ('Štefanov nad Oravou', 'Žilinský kraj', 'Tvrdošín'),
  ('Štefanová', 'Bratislavský kraj', 'Pezinok'),
  ('Štefanovce', 'Prešovský kraj', 'Prešov'),
  ('Štefanovce', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Štefanovičová', 'Nitriansky kraj', 'Nitra'),
  ('Štefurov', 'Prešovský kraj', 'Svidník'),
  ('Šterusy', 'Trnavský kraj', 'Piešťany'),
  ('Štiavnické Bane', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Štiavnička', 'Žilinský kraj', 'Ružomberok'),
  ('Štiavnik', 'Žilinský kraj', 'Bytča'),
  ('Štitáre', 'Nitriansky kraj', 'Nitra'),
  ('Štítnik', 'Košický kraj', 'Rožňava'),
  ('Štós', 'Košický kraj', 'Košice-okolie'),
  ('Štôla', 'Prešovský kraj', 'Poprad'),
  ('Štrba', 'Prešovský kraj', 'Poprad'),
  ('Štrkovec', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Štúrovo', 'Nitriansky kraj', 'Nové Zámky'),
  ('Štvrtok', 'Trenčiansky kraj', 'Trenčín'),
  ('Štvrtok na Ostrove', 'Trnavský kraj', 'Dunajská Streda'),
  ('Šuja', 'Žilinský kraj', 'Žilina'),
  ('Šuľa', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Šumiac', 'Banskobystrický kraj', 'Brezno'),
  ('Šuňava', 'Prešovský kraj', 'Poprad'),
  ('Šurany', 'Nitriansky kraj', 'Nové Zámky'),
  ('Šurianky', 'Nitriansky kraj', 'Nitra'),
  ('Šurice', 'Banskobystrický kraj', 'Lučenec'),
  ('Šúrovce', 'Trnavský kraj', 'Trnava'),
  ('Šútovo', 'Žilinský kraj', 'Martin'),
  ('Šútovce', 'Trenčiansky kraj', 'Prievidza'),
  ('Švábovce', 'Prešovský kraj', 'Poprad'),
  ('Švedlár', 'Košický kraj', 'Gelnica'),
  ('Švošov', 'Žilinský kraj', 'Ružomberok'),
  ('Tachty', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Tajná', 'Nitriansky kraj', 'Nitra'),
  ('Tajov', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Tarnov', 'Prešovský kraj', 'Bardejov'),
  ('Tatranská Javorina', 'Prešovský kraj', 'Poprad'),
  ('Tašuľa', 'Košický kraj', 'Sobrance'),
  ('Tehla', 'Nitriansky kraj', 'Levice'),
  ('Tekolďany', 'Trnavský kraj', 'Hlohovec'),
  ('Tekovská Breznica', 'Banskobystrický kraj', 'Žarnovica'),
  ('Tekovské Lužany', 'Nitriansky kraj', 'Levice'),
  ('Tekovské Nemce', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Tekovský Hrádok', 'Nitriansky kraj', 'Levice'),
  ('Telgárt', 'Banskobystrický kraj', 'Brezno'),
  ('Telince', 'Nitriansky kraj', 'Nitra'),
  ('Temeš', 'Trenčiansky kraj', 'Prievidza'),
  ('Teplička', 'Košický kraj', 'Spišská Nová Ves'),
  ('Teplička nad Váhom', 'Žilinský kraj', 'Žilina'),
  ('Tepličky', 'Trnavský kraj', 'Hlohovec'),
  ('Teplý Vrch', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Terany', 'Banskobystrický kraj', 'Krupina'),
  ('Terchová', 'Žilinský kraj', 'Žilina'),
  ('Teriakovce', 'Prešovský kraj', 'Prešov'),
  ('Terňa', 'Prešovský kraj', 'Prešov'),
  ('Tesáre', 'Nitriansky kraj', 'Topoľčany'),
  ('Tesárske Mlyňany', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Tešedíkovo', 'Nitriansky kraj', 'Šaľa'),
  ('Tibava', 'Košický kraj', 'Sobrance'),
  ('Tichý Potok', 'Prešovský kraj', 'Sabinov'),
  ('Timoradza', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Tisinec', 'Prešovský kraj', 'Stropkov'),
  ('Tisovec', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Tlmače', 'Nitriansky kraj', 'Levice'),
  ('Točnica', 'Banskobystrický kraj', 'Lučenec'),
  ('Tokajík', 'Prešovský kraj', 'Stropkov'),
  ('Tomášikovo', 'Trnavský kraj', 'Galanta'),
  ('Tomášov', 'Bratislavský kraj', 'Senec'),
  ('Tomášovce', 'Banskobystrický kraj', 'Lučenec'),
  ('Tomášovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Topoľa', 'Prešovský kraj', 'Snina'),
  ('Topoľčany', 'Nitriansky kraj', 'Topoľčany'),
  ('Topoľčianky', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Topoľnica', 'Trnavský kraj', 'Galanta'),
  ('Topoľníky', 'Trnavský kraj', 'Dunajská Streda'),
  ('Topoľovka', 'Prešovský kraj', 'Humenné'),
  ('Toporec', 'Prešovský kraj', 'Kežmarok'),
  ('Tornaľa', 'Banskobystrický kraj', 'Revúca'),
  ('Torysa', 'Prešovský kraj', 'Sabinov'),
  ('Torysky', 'Prešovský kraj', 'Levoča'),
  ('Tovarné', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Tovarnianska Polianka', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Tovarníky', 'Nitriansky kraj', 'Topoľčany'),
  ('Tôň', 'Nitriansky kraj', 'Komárno'),
  ('Trakovice', 'Trnavský kraj', 'Hlohovec'),
  ('Trávnica', 'Nitriansky kraj', 'Nové Zámky'),
  ('Trávnik', 'Nitriansky kraj', 'Komárno'),
  ('Trebatice', 'Trnavský kraj', 'Piešťany'),
  ('Trebejov', 'Košický kraj', 'Košice-okolie'),
  ('Trebeľovce', 'Banskobystrický kraj', 'Lučenec'),
  ('Trebichava', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Trebišov', 'Košický kraj', 'Trebišov'),
  ('Trebostovo', 'Žilinský kraj', 'Martin'),
  ('Trebušovce', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Trenč', 'Banskobystrický kraj', 'Lučenec'),
  ('Trenčianska Teplá', 'Trenčiansky kraj', 'Trenčín'),
  ('Trenčianska Turná', 'Trenčiansky kraj', 'Trenčín'),
  ('Trenčianske Bohuslavice', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Trenčianske Jastrabie', 'Trenčiansky kraj', 'Trenčín'),
  ('Trenčianske Mitice', 'Trenčiansky kraj', 'Trenčín'),
  ('Trenčianske Stankovce', 'Trenčiansky kraj', 'Trenčín'),
  ('Trenčianske Teplice', 'Trenčiansky kraj', 'Trenčín'),
  ('Trenčín', 'Trenčiansky kraj', 'Trenčín (krajské mesto)'),
  ('Trhová Hradská', 'Trnavský kraj', 'Dunajská Streda'),
  ('Trhovište', 'Košický kraj', 'Michalovce'),
  ('Trnava', 'Trnavský kraj', 'Trnava'),
  ('Trnavá Hora', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Trnava pri Laborci', 'Košický kraj', 'Michalovce'),
  ('Trnávka', 'Trnavský kraj', 'Dunajská Streda'),
  ('Trnávka', 'Košický kraj', 'Trebišov'),
  ('Trnkov', 'Prešovský kraj', 'Prešov'),
  ('Trnovec', 'Trnavský kraj', 'Skalica'),
  ('Trnovec nad Váhom', 'Nitriansky kraj', 'Šaľa'),
  ('Trnovo', 'Žilinský kraj', 'Martin'),
  ('Tročany', 'Prešovský kraj', 'Bardejov'),
  ('Trpín', 'Banskobystrický kraj', 'Krupina'),
  ('Trstená', 'Žilinský kraj', 'Tvrdošín'),
  ('Trstená na Ostrove', 'Trnavský kraj', 'Dunajská Streda'),
  ('Trstené', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Trstené pri Hornáde', 'Košický kraj', 'Košice-okolie'),
  ('Trstice', 'Trnavský kraj', 'Galanta'),
  ('Trstín', 'Trnavský kraj', 'Trnava'),
  ('Trsťany', 'Košický kraj', 'Košice-okolie'),
  ('Tŕnie', 'Banskobystrický kraj', 'Zvolen'),
  ('Tuhár', 'Banskobystrický kraj', 'Lučenec'),
  ('Tuhrina', 'Prešovský kraj', 'Prešov'),
  ('Tuchyňa', 'Trenčiansky kraj', 'Ilava'),
  ('Tulčík', 'Prešovský kraj', 'Prešov'),
  ('Tupá', 'Nitriansky kraj', 'Levice'),
  ('Turá', 'Nitriansky kraj', 'Levice'),
  ('Turany', 'Žilinský kraj', 'Martin'),
  ('Turany nad Ondavou', 'Prešovský kraj', 'Stropkov'),
  ('Turcovce', 'Prešovský kraj', 'Humenné'),
  ('Turček', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Turčianky', 'Trenčiansky kraj', 'Partizánske'),
  ('Turčianska Štiavnička', 'Žilinský kraj', 'Martin'),
  ('Turčianske Jaseno', 'Žilinský kraj', 'Martin'),
  ('Turčianske Kľačany', 'Žilinský kraj', 'Martin'),
  ('Turčianske Teplice', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Turčiansky Ďur', 'Žilinský kraj', 'Martin'),
  ('Turčiansky Peter', 'Žilinský kraj', 'Martin'),
  ('Turčok', 'Banskobystrický kraj', 'Revúca'),
  ('Turecká', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Tureň', 'Bratislavský kraj', 'Senec'),
  ('Turie', 'Žilinský kraj', 'Žilina'),
  ('Turík', 'Žilinský kraj', 'Ružomberok'),
  ('Turnianska Nová Ves', 'Košický kraj', 'Košice-okolie'),
  ('Turňa nad Bodvou', 'Košický kraj', 'Košice-okolie'),
  ('Turová', 'Banskobystrický kraj', 'Zvolen'),
  ('Turzovka', 'Žilinský kraj', 'Čadca'),
  ('Tušice', 'Košický kraj', 'Michalovce'),
  ('Tušická Nová Ves', 'Košický kraj', 'Michalovce'),
  ('Tužina', 'Trenčiansky kraj', 'Prievidza'),
  ('Tvarožná', 'Prešovský kraj', 'Kežmarok'),
  ('Tvrdomestice', 'Nitriansky kraj', 'Topoľčany'),
  ('Tvrdošín', 'Žilinský kraj', 'Tvrdošín'),
  ('Tvrdošovce', 'Nitriansky kraj', 'Nové Zámky'),
  ('Ťapešovo', 'Žilinský kraj', 'Námestovo'),
  ('Ubľa', 'Prešovský kraj', 'Snina'),
  ('Úbrež', 'Košický kraj', 'Sobrance'),
  ('Udavské', 'Prešovský kraj', 'Humenné'),
  ('Udiča', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Údol', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Uhliská', 'Nitriansky kraj', 'Levice'),
  ('Úhorná', 'Košický kraj', 'Gelnica'),
  ('Uhorská Ves', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Uhorské', 'Banskobystrický kraj', 'Poltár'),
  ('Uhrovec', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Uhrovské Podhradie', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Ulič', 'Prešovský kraj', 'Snina'),
  ('Uličské Krivé', 'Prešovský kraj', 'Snina'),
  ('Uloža', 'Prešovský kraj', 'Levoča'),
  ('Úľany nad Žitavou', 'Nitriansky kraj', 'Nové Zámky'),
  ('Unín', 'Trnavský kraj', 'Skalica'),
  ('Uňatín', 'Banskobystrický kraj', 'Krupina'),
  ('Urmince', 'Nitriansky kraj', 'Topoľčany'),
  ('Utekáč', 'Banskobystrický kraj', 'Poltár'),
  ('Uzovce', 'Prešovský kraj', 'Sabinov'),
  ('Uzovská Panica', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Uzovské Pekľany', 'Prešovský kraj', 'Sabinov'),
  ('Uzovský Šalgov', 'Prešovský kraj', 'Sabinov'),
  ('Vaďovce', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Vagrinec', 'Prešovský kraj', 'Svidník'),
  ('Váhovce', 'Trnavský kraj', 'Galanta'),
  ('Vajkovce', 'Košický kraj', 'Košice-okolie'),
  ('Valaliky', 'Košický kraj', 'Košice-okolie'),
  ('Valaská', 'Banskobystrický kraj', 'Brezno'),
  ('Valaská Belá', 'Trenčiansky kraj', 'Prievidza'),
  ('Valaská Dubová', 'Žilinský kraj', 'Ružomberok'),
  ('Valaškovce (vojenský obvod)', 'Prešovský kraj', 'Humenné'),
  ('Valča', 'Žilinský kraj', 'Martin'),
  ('Valentovce', 'Prešovský kraj', 'Medzilaborce'),
  ('Valice', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Valkovce', 'Prešovský kraj', 'Svidník'),
  ('Vaľkovňa', 'Banskobystrický kraj', 'Brezno'),
  ('Vaniškovce', 'Prešovský kraj', 'Bardejov'),
  ('Vápeník', 'Prešovský kraj', 'Svidník'),
  ('Varadka', 'Prešovský kraj', 'Bardejov'),
  ('Varechovce', 'Prešovský kraj', 'Stropkov'),
  ('Varhaňovce', 'Prešovský kraj', 'Prešov'),
  ('Varín', 'Žilinský kraj', 'Žilina'),
  ('Vasiľov', 'Žilinský kraj', 'Námestovo'),
  ('Vavrečka', 'Žilinský kraj', 'Námestovo'),
  ('Vavrinec', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Vavrišovo', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Važec', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Včelince', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Večelkov', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Vechec', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Velčice', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Veličná', 'Žilinský kraj', 'Dolný Kubín'),
  ('Velušovce', 'Nitriansky kraj', 'Topoľčany'),
  ('Veľaty', 'Košický kraj', 'Trebišov'),
  ('Veľká Čalomija', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Veľká Čausa', 'Trenčiansky kraj', 'Prievidza'),
  ('Veľká Čierna', 'Žilinský kraj', 'Žilina'),
  ('Veľká Dolina', 'Nitriansky kraj', 'Nitra'),
  ('Veľká Franková', 'Prešovský kraj', 'Kežmarok'),
  ('Veľká Hradná', 'Trenčiansky kraj', 'Trenčín'),
  ('Veľká Ida', 'Košický kraj', 'Košice-okolie'),
  ('Veľká Lehota', 'Banskobystrický kraj', 'Žarnovica'),
  ('Veľká Lesná', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Veľká Lodina', 'Košický kraj', 'Košice-okolie'),
  ('Veľká Lomnica', 'Prešovský kraj', 'Kežmarok'),
  ('Veľká Lúka', 'Banskobystrický kraj', 'Zvolen'),
  ('Veľká Mača', 'Trnavský kraj', 'Galanta'),
  ('Veľká nad Ipľom', 'Banskobystrický kraj', 'Lučenec'),
  ('Veľká Paka', 'Trnavský kraj', 'Dunajská Streda'),
  ('Veľká Tŕňa', 'Košický kraj', 'Trebišov'),
  ('Veľká Ves', 'Banskobystrický kraj', 'Poltár'),
  ('Veľká Ves nad Ipľom', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Veľké Bierovce', 'Trenčiansky kraj', 'Trenčín'),
  ('Veľké Blahovo', 'Trnavský kraj', 'Dunajská Streda'),
  ('Veľké Borové', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Veľké Dravce', 'Banskobystrický kraj', 'Lučenec'),
  ('Veľké Držkovce', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Veľké Dvorany', 'Nitriansky kraj', 'Topoľčany'),
  ('Veľké Dvorníky', 'Trnavský kraj', 'Dunajská Streda'),
  ('Veľké Hoste', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Veľké Chlievany', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Veľké Chyndice', 'Nitriansky kraj', 'Nitra'),
  ('Veľké Kapušany', 'Košický kraj', 'Michalovce'),
  ('Veľké Kosihy', 'Nitriansky kraj', 'Komárno'),
  ('Veľké Kostoľany', 'Trnavský kraj', 'Piešťany'),
  ('Veľké Kozmálovce', 'Nitriansky kraj', 'Levice'),
  ('Veľké Kršteňany', 'Trenčiansky kraj', 'Partizánske'),
  ('Veľké Leváre', 'Bratislavský kraj', 'Malacky'),
  ('Veľké Lovce', 'Nitriansky kraj', 'Nové Zámky'),
  ('Veľké Ludince', 'Nitriansky kraj', 'Levice'),
  ('Veľké Orvište', 'Trnavský kraj', 'Piešťany'),
  ('Veľké Ozorovce', 'Košický kraj', 'Trebišov'),
  ('Veľké Pole', 'Banskobystrický kraj', 'Žarnovica'),
  ('Veľké Raškovce', 'Košický kraj', 'Michalovce'),
  ('Veľké Revištia', 'Košický kraj', 'Sobrance'),
  ('Veľké Ripňany', 'Nitriansky kraj', 'Topoľčany'),
  ('Veľké Rovné', 'Žilinský kraj', 'Bytča'),
  ('Veľké Slemence', 'Košický kraj', 'Michalovce'),
  ('Veľké Straciny', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Veľké Teriakovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Veľké Trakany', 'Košický kraj', 'Trebišov'),
  ('Veľké Turovce', 'Nitriansky kraj', 'Levice'),
  ('Veľké Uherce', 'Trenčiansky kraj', 'Partizánske'),
  ('Veľké Úľany', 'Trnavský kraj', 'Galanta'),
  ('Veľké Vozokany', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Veľké Zálužie', 'Nitriansky kraj', 'Nitra'),
  ('Veľké Zlievce', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Veľkrop', 'Prešovský kraj', 'Stropkov'),
  ('Veľký Biel', 'Bratislavský kraj', 'Senec'),
  ('Veľký Blh', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Veľký Cetín', 'Nitriansky kraj', 'Nitra'),
  ('Veľký Čepčín', 'Žilinský kraj', 'Turčianske Teplice'),
  ('Veľký Ďur', 'Nitriansky kraj', 'Levice'),
  ('Veľký Folkmar', 'Košický kraj', 'Gelnica'),
  ('Veľký Grob', 'Trnavský kraj', 'Galanta'),
  ('Veľký Horeš', 'Košický kraj', 'Trebišov'),
  ('Veľký Kamenec', 'Košický kraj', 'Trebišov'),
  ('Veľký Klíž', 'Trenčiansky kraj', 'Partizánske'),
  ('Veľký Krtíš', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Veľký Kýr', 'Nitriansky kraj', 'Nové Zámky'),
  ('Veľký Lapáš', 'Nitriansky kraj', 'Nitra'),
  ('Veľký Lipník', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Veľký Lom', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Veľký Meder', 'Trnavský kraj', 'Dunajská Streda'),
  ('Veľký Slavkov', 'Prešovský kraj', 'Poprad'),
  ('Veľký Slivník', 'Prešovský kraj', 'Prešov'),
  ('Veľký Šariš', 'Prešovský kraj', 'Prešov'),
  ('Veľopolie', 'Prešovský kraj', 'Humenné'),
  ('Vernár', 'Prešovský kraj', 'Poprad'),
  ('Veselé', 'Trnavský kraj', 'Piešťany'),
  ('Veterná Poruba', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Vidiná', 'Banskobystrický kraj', 'Lučenec'),
  ('Vieska', 'Trnavský kraj', 'Dunajská Streda'),
  ('Vieska', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Vieska nad Blhom', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Vieska nad Žitavou', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Vígľaš', 'Banskobystrický kraj', 'Detva'),
  ('Vígľašská Huta-Kalinka', 'Banskobystrický kraj', 'Detva'),
  ('Vikartovce', 'Prešovský kraj', 'Poprad'),
  ('Vinica', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Viničky', 'Košický kraj', 'Trebišov'),
  ('Viničné', 'Bratislavský kraj', 'Pezinok'),
  ('Vinné', 'Košický kraj', 'Michalovce'),
  ('Vinodol', 'Nitriansky kraj', 'Nitra'),
  ('Vinohrady nad Váhom', 'Trnavský kraj', 'Galanta'),
  ('Vinosady', 'Bratislavský kraj', 'Pezinok'),
  ('Virt', 'Nitriansky kraj', 'Komárno'),
  ('Vislanka', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Vislava', 'Prešovský kraj', 'Stropkov'),
  ('Visolaje', 'Trenčiansky kraj', 'Púchov'),
  ('Višňov', 'Košický kraj', 'Trebišov'),
  ('Višňové', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Višňové', 'Banskobystrický kraj', 'Revúca'),
  ('Višňové', 'Žilinský kraj', 'Žilina'),
  ('Vištuk', 'Bratislavský kraj', 'Pezinok'),
  ('Vitanová', 'Žilinský kraj', 'Tvrdošín'),
  ('Vítkovce', 'Košický kraj', 'Spišská Nová Ves'),
  ('Víťaz', 'Prešovský kraj', 'Prešov'),
  ('Víťazovce', 'Prešovský kraj', 'Humenné'),
  ('Vlača', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Vladiča', 'Prešovský kraj', 'Stropkov'),
  ('Vlachovo', 'Košický kraj', 'Rožňava'),
  ('Vlachy', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Vlčany', 'Nitriansky kraj', 'Šaľa'),
  ('Vlčkovce', 'Trnavský kraj', 'Trnava'),
  ('Vlkanová', 'Banskobystrický kraj', 'Banská Bystrica'),
  ('Vlkas', 'Nitriansky kraj', 'Nové Zámky'),
  ('Vlková', 'Prešovský kraj', 'Kežmarok'),
  ('Vlkovce', 'Prešovský kraj', 'Kežmarok'),
  ('Vlky', 'Bratislavský kraj', 'Senec'),
  ('Vlkyňa', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Voderady', 'Trnavský kraj', 'Trnava'),
  ('Vojany', 'Košický kraj', 'Michalovce'),
  ('Vojčice', 'Košický kraj', 'Trebišov'),
  ('Vojka', 'Košický kraj', 'Trebišov'),
  ('Vojka nad Dunajom', 'Trnavský kraj', 'Dunajská Streda'),
  ('Vojkovce', 'Košický kraj', 'Spišská Nová Ves'),
  ('Vojnatina', 'Košický kraj', 'Sobrance'),
  ('Vojňany', 'Prešovský kraj', 'Kežmarok'),
  ('Vojtovce', 'Prešovský kraj', 'Stropkov'),
  ('Volica', 'Prešovský kraj', 'Medzilaborce'),
  ('Volkovce', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Voľa', 'Košický kraj', 'Michalovce'),
  ('Voznica', 'Banskobystrický kraj', 'Žarnovica'),
  ('Vozokany', 'Trnavský kraj', 'Galanta'),
  ('Vozokany', 'Nitriansky kraj', 'Topoľčany'),
  ('Vráble', 'Nitriansky kraj', 'Nitra'),
  ('Vrádište', 'Trnavský kraj', 'Skalica'),
  ('Vrakúň', 'Trnavský kraj', 'Dunajská Streda'),
  ('Vranov nad Topľou', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Vrbnica', 'Košický kraj', 'Michalovce'),
  ('Vrbov', 'Prešovský kraj', 'Kežmarok'),
  ('Vrbovce', 'Trenčiansky kraj', 'Myjava'),
  ('Vrbová nad Váhom', 'Nitriansky kraj', 'Komárno'),
  ('Vrbové', 'Trnavský kraj', 'Piešťany'),
  ('Vrbovka', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Vrchteplá', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Vrícko', 'Žilinský kraj', 'Martin'),
  ('Vršatské Podhradie', 'Trenčiansky kraj', 'Ilava'),
  ('Vrútky', 'Žilinský kraj', 'Martin'),
  ('Vtáčkovce', 'Košický kraj', 'Košice-okolie'),
  ('Výborná', 'Prešovský kraj', 'Kežmarok'),
  ('Výčapy-Opatovce', 'Nitriansky kraj', 'Nitra'),
  ('Vydrany', 'Trnavský kraj', 'Dunajská Streda'),
  ('Vydrná', 'Trenčiansky kraj', 'Púchov'),
  ('Vydrník', 'Prešovský kraj', 'Poprad'),
  ('Vyhne', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Východná', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Výrava', 'Prešovský kraj', 'Medzilaborce'),
  ('Vysočany', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Vysoká', 'Banskobystrický kraj', 'Banská Štiavnica'),
  ('Vysoká', 'Prešovský kraj', 'Sabinov'),
  ('Vysoká nad Kysucou', 'Žilinský kraj', 'Čadca'),
  ('Vysoká nad Uhom', 'Košický kraj', 'Michalovce'),
  ('Vysoká pri Morave', 'Bratislavský kraj', 'Malacky'),
  ('Vysoké Tatry', 'Prešovský kraj', 'Poprad'),
  ('Vyškovce', 'Prešovský kraj', 'Stropkov'),
  ('Vyškovce nad Ipľom', 'Nitriansky kraj', 'Levice'),
  ('Vyšná Boca', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Vyšná Hutka', 'Košický kraj', 'Košice-okolie'),
  ('Vyšná Jablonka', 'Prešovský kraj', 'Humenné'),
  ('Vyšná Jedľová', 'Prešovský kraj', 'Svidník'),
  ('Vyšná Kamenica', 'Košický kraj', 'Košice-okolie'),
  ('Vyšná Myšľa', 'Košický kraj', 'Košice-okolie'),
  ('Vyšná Olšava', 'Prešovský kraj', 'Stropkov'),
  ('Vyšná Pisaná', 'Prešovský kraj', 'Svidník'),
  ('Vyšná Polianka', 'Prešovský kraj', 'Bardejov'),
  ('Vyšná Rybnica', 'Košický kraj', 'Sobrance'),
  ('Vyšná Sitnica', 'Prešovský kraj', 'Humenné'),
  ('Vyšná Slaná', 'Košický kraj', 'Rožňava'),
  ('Vyšná Šebastová', 'Prešovský kraj', 'Prešov'),
  ('Vyšná Voľa', 'Prešovský kraj', 'Bardejov'),
  ('Vyšné Ladičkovce', 'Prešovský kraj', 'Humenné'),
  ('Vyšné nad Hronom', 'Nitriansky kraj', 'Levice'),
  ('Vyšné Nemecké', 'Košický kraj', 'Sobrance'),
  ('Vyšné Remety', 'Košický kraj', 'Sobrance'),
  ('Vyšné Repaše', 'Prešovský kraj', 'Levoča'),
  ('Vyšné Ružbachy', 'Prešovský kraj', 'Stará Ľubovňa'),
  ('Vyšné Valice', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Vyšný Čaj', 'Košický kraj', 'Košice-okolie'),
  ('Vyšný Hrabovec', 'Prešovský kraj', 'Stropkov'),
  ('Vyšný Hrušov', 'Prešovský kraj', 'Humenné'),
  ('Vyšný Kazimír', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Vyšný Klátov', 'Košický kraj', 'Košice-okolie'),
  ('Vyšný Komárnik', 'Prešovský kraj', 'Svidník'),
  ('Vyšný Kručov', 'Prešovský kraj', 'Bardejov'),
  ('Vyšný Kubín', 'Žilinský kraj', 'Dolný Kubín'),
  ('Vyšný Medzev', 'Košický kraj', 'Košice-okolie'),
  ('Vyšný Mirošov', 'Prešovský kraj', 'Svidník'),
  ('Vyšný Orlík', 'Prešovský kraj', 'Svidník'),
  ('Vyšný Skálnik', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Vyšný Slavkov', 'Prešovský kraj', 'Levoča'),
  ('Vyšný Tvarožec', 'Prešovský kraj', 'Bardejov'),
  ('Vyšný Žipov', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Zábiedovo', 'Žilinský kraj', 'Tvrdošín'),
  ('Záborie', 'Žilinský kraj', 'Martin'),
  ('Záborské', 'Prešovský kraj', 'Prešov'),
  ('Zádiel', 'Košický kraj', 'Košice-okolie'),
  ('Zádor', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Záhor', 'Košický kraj', 'Sobrance'),
  ('Záhorce', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Záhorie (vojenský obvod)', 'Bratislavský kraj', 'Malacky'),
  ('Záhorská Ves', 'Bratislavský kraj', 'Malacky'),
  ('Záhradné', 'Prešovský kraj', 'Prešov'),
  ('Zacharovce', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Zákamenné', 'Žilinský kraj', 'Námestovo'),
  ('Zákopčie', 'Žilinský kraj', 'Čadca'),
  ('Zalaba', 'Nitriansky kraj', 'Levice'),
  ('Zálesie', 'Bratislavský kraj', 'Senec'),
  ('Zálesie', 'Prešovský kraj', 'Kežmarok'),
  ('Zalužice', 'Košický kraj', 'Michalovce'),
  ('Zamarovce', 'Trenčiansky kraj', 'Trenčín'),
  ('Zámutov', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Záriečie', 'Trenčiansky kraj', 'Púchov'),
  ('Záskalie', 'Trenčiansky kraj', 'Považská Bystrica'),
  ('Zatín', 'Košický kraj', 'Trebišov'),
  ('Závada', 'Nitriansky kraj', 'Topoľčany'),
  ('Závada', 'Prešovský kraj', 'Humenné'),
  ('Závada', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Závadka', 'Prešovský kraj', 'Humenné'),
  ('Závadka', 'Košický kraj', 'Gelnica'),
  ('Závadka', 'Košický kraj', 'Michalovce'),
  ('Závadka nad Hronom', 'Banskobystrický kraj', 'Brezno'),
  ('Zavar', 'Trnavský kraj', 'Trnava'),
  ('Závažná Poruba', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Závod', 'Bratislavský kraj', 'Malacky'),
  ('Zázrivá', 'Žilinský kraj', 'Dolný Kubín'),
  ('Zbehňov', 'Košický kraj', 'Trebišov'),
  ('Zbehy', 'Nitriansky kraj', 'Nitra'),
  ('Zboj', 'Prešovský kraj', 'Snina'),
  ('Zbojné', 'Prešovský kraj', 'Medzilaborce'),
  ('Zborov', 'Prešovský kraj', 'Bardejov'),
  ('Zborov nad Bystricou', 'Žilinský kraj', 'Čadca'),
  ('Zbrojníky', 'Nitriansky kraj', 'Levice'),
  ('Zbudská Belá', 'Prešovský kraj', 'Medzilaborce'),
  ('Zbudské Dlhé', 'Prešovský kraj', 'Humenné'),
  ('Zbudza', 'Košický kraj', 'Michalovce'),
  ('Zbyňov', 'Žilinský kraj', 'Žilina'),
  ('Zeleneč', 'Trnavský kraj', 'Trnava'),
  ('Zemianska Olča', 'Nitriansky kraj', 'Komárno'),
  ('Zemianske Kostoľany', 'Trenčiansky kraj', 'Prievidza'),
  ('Zemianske Podhradie', 'Trenčiansky kraj', 'Nové Mesto nad Váhom'),
  ('Zemianske Sady', 'Trnavský kraj', 'Galanta'),
  ('Zemiansky Vrbovok', 'Banskobystrický kraj', 'Krupina'),
  ('Zemné', 'Nitriansky kraj', 'Nové Zámky'),
  ('Zemplín', 'Košický kraj', 'Trebišov'),
  ('Zemplínska Nová Ves', 'Košický kraj', 'Trebišov'),
  ('Zemplínska Široká', 'Košický kraj', 'Michalovce'),
  ('Zemplínska Teplica', 'Košický kraj', 'Trebišov'),
  ('Zemplínske Hámre', 'Prešovský kraj', 'Snina'),
  ('Zemplínske Hradište', 'Košický kraj', 'Trebišov'),
  ('Zemplínske Jastrabie', 'Košický kraj', 'Trebišov'),
  ('Zemplínske Kopčany', 'Košický kraj', 'Michalovce'),
  ('Zemplínsky Branč', 'Košický kraj', 'Trebišov'),
  ('Zlatá Baňa', 'Prešovský kraj', 'Prešov'),
  ('Zlatá Idka', 'Košický kraj', 'Košice-okolie'),
  ('Zlaté', 'Prešovský kraj', 'Bardejov'),
  ('Zlaté Klasy', 'Trnavský kraj', 'Dunajská Streda'),
  ('Zlaté Moravce', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Zlatná na Ostrove', 'Nitriansky kraj', 'Komárno'),
  ('Zlatník', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Zlatníky', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Zlatno', 'Banskobystrický kraj', 'Poltár'),
  ('Zlatno', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Zliechov', 'Trenčiansky kraj', 'Ilava'),
  ('Zohor', 'Bratislavský kraj', 'Malacky'),
  ('Zombor', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Zubák', 'Trenčiansky kraj', 'Púchov'),
  ('Zuberec', 'Žilinský kraj', 'Tvrdošín'),
  ('Zubné', 'Prešovský kraj', 'Humenné'),
  ('Zubrohlava', 'Žilinský kraj', 'Námestovo'),
  ('Zvolen', 'Banskobystrický kraj', 'Zvolen'),
  ('Zvolenská Slatina', 'Banskobystrický kraj', 'Zvolen'),
  ('Zvončín', 'Trnavský kraj', 'Trnava'),
  ('Žabokreky', 'Žilinský kraj', 'Martin'),
  ('Žabokreky nad Nitrou', 'Trenčiansky kraj', 'Partizánske'),
  ('Žakarovce', 'Košický kraj', 'Gelnica'),
  ('Žakovce', 'Prešovský kraj', 'Kežmarok'),
  ('Žalobín', 'Prešovský kraj', 'Vranov nad Topľou'),
  ('Žarnov', 'Košický kraj', 'Košice-okolie'),
  ('Žarnovica', 'Banskobystrický kraj', 'Žarnovica'),
  ('Žaškov', 'Žilinský kraj', 'Dolný Kubín'),
  ('Žbince', 'Košický kraj', 'Michalovce'),
  ('Ždaňa', 'Košický kraj', 'Košice-okolie'),
  ('Ždiar', 'Prešovský kraj', 'Poprad'),
  ('Žehňa', 'Prešovský kraj', 'Prešov'),
  ('Žehra', 'Košický kraj', 'Spišská Nová Ves'),
  ('Železná Breznica', 'Banskobystrický kraj', 'Zvolen'),
  ('Železník', 'Prešovský kraj', 'Svidník'),
  ('Želiezovce', 'Nitriansky kraj', 'Levice'),
  ('Želmanovce', 'Prešovský kraj', 'Svidník'),
  ('Želovce', 'Banskobystrický kraj', 'Veľký Krtíš'),
  ('Žemberovce', 'Nitriansky kraj', 'Levice'),
  ('Žemliare', 'Nitriansky kraj', 'Levice'),
  ('Žiar', 'Žilinský kraj', 'Liptovský Mikuláš'),
  ('Žiar', 'Banskobystrický kraj', 'Revúca'),
  ('Žiar nad Hronom', 'Banskobystrický kraj', 'Žiar nad Hronom'),
  ('Žibritov', 'Banskobystrický kraj', 'Krupina'),
  ('Žihárec', 'Nitriansky kraj', 'Šaľa'),
  ('Žikava', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Žilina', 'Žilinský kraj', 'Žilina'),
  ('Žíp', 'Banskobystrický kraj', 'Rimavská Sobota'),
  ('Žipov', 'Prešovský kraj', 'Prešov'),
  ('Žirany', 'Nitriansky kraj', 'Nitra'),
  ('Žitavany', 'Nitriansky kraj', 'Zlaté Moravce'),
  ('Žitavce', 'Nitriansky kraj', 'Nitra'),
  ('Žitná-Radiša', 'Trenčiansky kraj', 'Bánovce nad Bebravou'),
  ('Žlkovce', 'Trnavský kraj', 'Hlohovec'),
  ('Župčany', 'Prešovský kraj', 'Prešov'),
  ('Župkov', 'Banskobystrický kraj', 'Žarnovica');

-- -----------------------------------------------------------------------------
-- Source: 20260507120200_search_sk_municipalities_rpc.sql
-- -----------------------------------------------------------------------------

-- RPC for accent-insensitive municipality search (used by Nest /api/locations/sk-municipalities).

create or replace function public.search_sk_municipalities(p_query text, p_limit int)
returns table (id bigint, name text, kraj text, okres text)
language sql
stable
parallel safe
as $$
  select m.id, m.name, m.kraj, m.okres
  from public.sk_municipalities m
  where length(trim(coalesce(p_query, ''))) >= 2
    and public.jobbie_unaccent(m.name) ilike '%' || public.jobbie_unaccent(trim(p_query)) || '%'
  order by
    case
      when public.jobbie_unaccent(m.name) ilike public.jobbie_unaccent(trim(p_query)) || '%' then 0
      else 1
    end,
    m.name
  limit least(greatest(coalesce(p_limit, 50), 1), 80);
$$;

comment on function public.search_sk_municipalities(text, int) is 'Prefix-prioritized search over sk_municipalities.name using jobbie_unaccent.';

grant execute on function public.search_sk_municipalities(text, int) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260508130000_profile_public_contact_email.sql
-- -----------------------------------------------------------------------------

-- Allow users to opt in to showing their login email on the public profile / firm detail.

alter table public.profiles
  add column if not exists public_show_account_email boolean not null default false;

comment on column public.profiles.public_show_account_email is
  'When true, GET /profiles/:id may include contact_email from auth.users for visitors.';

-- -----------------------------------------------------------------------------
-- Source: 20260509120000_profile_registry_verified_at.sql
-- -----------------------------------------------------------------------------

-- RPO-backed employer verification: set by Nest after ŠÚ SR register lookup; never client-writable.
alter table public.profiles
  add column if not exists registry_verified_at timestamptz null;

comment on column public.profiles.registry_verified_at is
  'When set, the employer IČO was found as an active subject in the Slovak RPO (api.statistics.sk). Cleared when registration_number changes.';

-- -----------------------------------------------------------------------------
-- Source: 20260510120000_subscription_monthly_credits.sql
-- -----------------------------------------------------------------------------

-- Monthly subscription credits per plan + idempotent grant ledger + default free subscription on signup.

alter table public.subscription_plans
  add column if not exists monthly_credits integer not null default 0;

comment on column public.subscription_plans.monthly_credits is
  'Credits granted each billing cycle (paid via Stripe invoice.paid) or monthly for free (cron).';

update public.subscription_plans set monthly_credits = 5 where slug = 'zadarmo';
update public.subscription_plans set monthly_credits = 10 where slug = 'basic';
update public.subscription_plans set monthly_credits = 20 where slug = 'standard';
update public.subscription_plans set monthly_credits = 45 where slug = 'premium';

create table if not exists public.subscription_period_credit_grants (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  credits integer not null check (credits > 0),
  grant_source text not null check (grant_source in ('stripe_invoice', 'free_monthly_cron')),
  stripe_invoice_id text,
  period_yyyymm text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_subscription_credit_grants_stripe_invoice
  on public.subscription_period_credit_grants (stripe_invoice_id)
  where stripe_invoice_id is not null;

create unique index if not exists idx_subscription_credit_grants_free_month
  on public.subscription_period_credit_grants (user_id, period_yyyymm)
  where grant_source = 'free_monthly_cron';

create index if not exists idx_subscription_credit_grants_user_id
  on public.subscription_period_credit_grants (user_id);

comment on table public.subscription_period_credit_grants is
  'Idempotent log of monthly subscription credit grants (Stripe invoice id or calendar month for free).';

alter table public.subscription_period_credit_grants enable row level security;

grant select, insert on public.subscription_period_credit_grants to service_role;

-- Default free subscription for existing profiles missing a row.
insert into public.user_subscriptions (user_id, plan_id, status)
select p.id, sp.id, 'active'
from public.profiles p
cross join lateral (
  select id from public.subscription_plans where slug = 'zadarmo' limit 1
) sp
where not exists (
  select 1 from public.user_subscriptions us where us.user_id = p.id
);

-- Signup: attach zadarmo plan after profile insert.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
  meta jsonb;
  v_display_name text;
  v_company_name text;
  v_first_name text;
  v_last_name text;
  v_registered_office text;
  v_registration_number text;
  v_tax_id text;
  v_vat_id text;
  v_job_interests text;
  v_location text;
  v_sector text;
begin
  set local row_security = off;
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role := coalesce(meta->>'role', 'individual');
  if user_role not in ('company', 'individual') then
    user_role := 'individual';
  end if;

  v_display_name := coalesce(
    meta->>'display_name',
    meta->>'name',
    trim(coalesce(meta->>'first_name', '') || ' ' || coalesce(meta->>'last_name', ''))
  );
  v_company_name := nullif(trim(meta->>'company_name'), '');
  v_first_name := nullif(trim(meta->>'first_name'), '');
  v_last_name := nullif(trim(meta->>'last_name'), '');
  v_registered_office := nullif(trim(meta->>'registered_office'), '');
  v_registration_number := nullif(trim(meta->>'ico'), '');
  v_tax_id := nullif(trim(meta->>'dic'), '');
  v_vat_id := nullif(trim(meta->>'ic_dph'), '');
  v_job_interests := nullif(trim(meta->>'job_interests'), '');
  v_location := nullif(trim(meta->>'location'), '');
  v_sector := nullif(trim(meta->>'sector'), '');

  insert into public.profiles (
    id,
    role,
    display_name,
    company_name,
    first_name,
    last_name,
    registered_office,
    registration_number,
    tax_id,
    vat_id,
    job_interests,
    location,
    sector
  )
  values (
    new.id,
    user_role,
    nullif(trim(v_display_name), ''),
    v_company_name,
    v_first_name,
    v_last_name,
    v_registered_office,
    v_registration_number,
    v_tax_id,
    v_vat_id,
    v_job_interests,
    v_location,
    v_sector
  )
  on conflict (id) do update set
    role = excluded.role,
    display_name = coalesce(excluded.display_name, profiles.display_name),
    company_name = coalesce(excluded.company_name, profiles.company_name),
    first_name = coalesce(excluded.first_name, profiles.first_name),
    last_name = coalesce(excluded.last_name, profiles.last_name),
    registered_office = coalesce(excluded.registered_office, profiles.registered_office),
    registration_number = coalesce(excluded.registration_number, profiles.registration_number),
    tax_id = coalesce(excluded.tax_id, profiles.tax_id),
    vat_id = coalesce(excluded.vat_id, profiles.vat_id),
    job_interests = coalesce(excluded.job_interests, profiles.job_interests),
    location = coalesce(excluded.location, profiles.location),
    sector = coalesce(excluded.sector, profiles.sector),
    updated_at = now();

  insert into public.user_subscriptions (user_id, plan_id, status)
  select new.id, p.id, 'active'
  from public.subscription_plans p
  where p.slug = 'zadarmo'
  limit 1
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- -----------------------------------------------------------------------------
-- Source: 20260515120000_profile_avatars_storage_bucket.sql
-- -----------------------------------------------------------------------------

-- Public bucket for profile avatars (path: {user_id}/avatar.jpg). RLS: users may only write under their uid.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile-avatars: owner insert" on storage.objects;
create policy "profile-avatars: owner insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (auth.uid())::text
);

drop policy if exists "profile-avatars: owner update" on storage.objects;
create policy "profile-avatars: owner update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (auth.uid())::text
);

drop policy if exists "profile-avatars: owner delete" on storage.objects;
create policy "profile-avatars: owner delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (auth.uid())::text
);

drop policy if exists "profile-avatars: public read" on storage.objects;
create policy "profile-avatars: public read"
on storage.objects
for select
to public
using (bucket_id = 'profile-avatars');

-- -----------------------------------------------------------------------------
-- Source: 20260516120000_chat_media_bucket_relaxed_constraints.sql
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Source: 20260516130000_chat_media_storage_rls_security_definer.sql
-- -----------------------------------------------------------------------------

-- Fix chat-media storage RLS: policies that subquery public.chat_rooms under the invoker
-- can fail (nested RLS / evaluation context). Use SECURITY DEFINER helpers to validate
-- room membership reliably. Also reaffirm bucket MIME (null = any) and 15 MB limit.

-- ---------------------------------------------------------------------------
-- Helpers (bypass RLS on chat_rooms only inside these controlled checks)
-- ---------------------------------------------------------------------------
create or replace function public.chat_media_user_can_upload_object(object_path text, uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  segs text[];
begin
  if uid is null then
    return false;
  end if;
  segs := storage.foldername(object_path);
  if coalesce(cardinality(segs), 0) < 3 then
    return false;
  end if;
  if segs[2] is distinct from uid::text then
    return false;
  end if;
  return exists (
    select 1
    from public.chat_rooms r
    where r.id::text = segs[1]
      and (r.company_id = uid or r.individual_id = uid)
  );
end;
$$;

create or replace function public.chat_media_user_can_read_object(object_path text, uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  segs text[];
begin
  if uid is null then
    return false;
  end if;
  segs := storage.foldername(object_path);
  if coalesce(cardinality(segs), 0) < 2 then
    return false;
  end if;
  return exists (
    select 1
    from public.chat_rooms r
    where r.id::text = segs[1]
      and (r.company_id = uid or r.individual_id = uid)
  );
end;
$$;

create or replace function public.chat_media_user_can_delete_object(object_path text, uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  segs text[];
begin
  if uid is null then
    return false;
  end if;
  segs := storage.foldername(object_path);
  if coalesce(cardinality(segs), 0) < 3 then
    return false;
  end if;
  if segs[2] is distinct from uid::text then
    return false;
  end if;
  return exists (
    select 1
    from public.chat_rooms r
    where r.id::text = segs[1]
      and (r.company_id = uid or r.individual_id = uid)
  );
end;
$$;

revoke all on function public.chat_media_user_can_upload_object(text, uuid) from public;
revoke all on function public.chat_media_user_can_read_object(text, uuid) from public;
revoke all on function public.chat_media_user_can_delete_object(text, uuid) from public;

grant execute on function public.chat_media_user_can_upload_object(text, uuid) to authenticated, service_role;
grant execute on function public.chat_media_user_can_read_object(text, uuid) to authenticated, service_role;
grant execute on function public.chat_media_user_can_delete_object(text, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- storage.objects policies for chat-media
-- ---------------------------------------------------------------------------
drop policy if exists "chat-media insert room participants" on storage.objects;
drop policy if exists "chat-media select room participants" on storage.objects;
drop policy if exists "chat-media delete own prefix" on storage.objects;

create policy "chat-media insert room participants"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-media'
  and public.chat_media_user_can_upload_object(name, auth.uid())
);

create policy "chat-media select room participants"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-media'
  and public.chat_media_user_can_read_object(name, auth.uid())
);

create policy "chat-media delete own prefix"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-media'
  and public.chat_media_user_can_delete_object(name, auth.uid())
);

-- ---------------------------------------------------------------------------
-- Bucket: any MIME + 15 MB (matches PWA MAX_CHAT_FILE_BYTES)
-- ---------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Source: 20260517140000_profiles_soft_delete_account_closure.sql
-- -----------------------------------------------------------------------------

-- Account closure uses profiles.is_deleted + PII scrub + auth ban (no auth.users delete).
-- FKs to profiles remain valid so job_offers, applications, chat_rooms, and chat_messages stay intact.

comment on column public.profiles.is_deleted is
  'When true, the user closed their account: PII cleared, auth user banned, Typesense profile/jobs removed; relational rows kept for counterparties.';

-- -----------------------------------------------------------------------------
-- Source: 20260518120000_newsletter_subscribers.sql
-- -----------------------------------------------------------------------------

-- Marketing newsletter subscribers (backend inserts via service_role only).

create table if not exists public.subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  name text,
  consent boolean not null,
  mailerlite_status text not null default 'pending'
    check (mailerlite_status in ('pending', 'synced', 'failed')),
  created_at timestamptz not null default now(),
  unique (email)
);

create index if not exists idx_subscribers_mailerlite_status on public.subscribers (mailerlite_status)
  where mailerlite_status in ('pending', 'failed');

comment on table public.subscribers is 'Newsletter signups; GDPR consent required; MailerLite sync tracked in mailerlite_status.';
comment on column public.subscribers.consent is 'Must be true at signup (GDPR).';
comment on column public.subscribers.mailerlite_status is 'pending: not yet synced; synced: MailerLite OK; failed: ML error (retried by cron).';

alter table public.subscribers enable row level security;

-- No policies for anon/authenticated: only service_role (Nest backend) bypasses RLS and uses grants below.

grant select, insert, update on table public.subscribers to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260519120000_saved_companies.sql
-- -----------------------------------------------------------------------------

-- Bookmarks for company profiles (not company_ads). user saves profiles.id of a company.

create table if not exists public.saved_companies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, company_id)
);

create index if not exists idx_saved_companies_user_id on public.saved_companies(user_id);
create index if not exists idx_saved_companies_user_company on public.saved_companies(user_id, company_id);

alter table public.saved_companies enable row level security;

create policy "Users can insert own saved_companies"
  on public.saved_companies for insert
  with check (auth.uid() = user_id);

create policy "Users can read own saved_companies"
  on public.saved_companies for select
  using (auth.uid() = user_id);

create policy "Users can delete own saved_companies"
  on public.saved_companies for delete
  using (auth.uid() = user_id);

comment on table public.saved_companies is 'User bookmarks of company profiles (profiles.id where role=company), not company ads.';

grant select, insert, update, delete on public.saved_companies to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260520120000_user_cv.sql
-- -----------------------------------------------------------------------------

-- Virtual CV / Resume builder: one CV per user with normalized child sections.
-- Editing/writing handled by Nest backend (service role). RLS policies act as
-- defense-in-depth so direct PostgREST clients can also read public CVs but
-- can only mutate their own rows.

create table if not exists public.user_cvs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  full_name text,
  headline text,
  bio text,
  phone text,
  email text,
  location text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_cvs_user_id on public.user_cvs (user_id);

create table if not exists public.cv_experience (
  id uuid primary key default uuid_generate_v4(),
  cv_id uuid not null references public.user_cvs(id) on delete cascade,
  company text not null,
  position text not null,
  start_date date,
  end_date date,
  current boolean not null default false,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cv_experience_cv_order on public.cv_experience (cv_id, sort_order);

create table if not exists public.cv_education (
  id uuid primary key default uuid_generate_v4(),
  cv_id uuid not null references public.user_cvs(id) on delete cascade,
  school text not null,
  degree text,
  field text,
  start_date date,
  end_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cv_education_cv_order on public.cv_education (cv_id, sort_order);

create table if not exists public.cv_skills (
  id uuid primary key default uuid_generate_v4(),
  cv_id uuid not null references public.user_cvs(id) on delete cascade,
  skill_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (cv_id, skill_name)
);

create index if not exists idx_cv_skills_cv_order on public.cv_skills (cv_id, sort_order);

create table if not exists public.cv_languages (
  id uuid primary key default uuid_generate_v4(),
  cv_id uuid not null references public.user_cvs(id) on delete cascade,
  language text not null,
  level text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_cv_languages_cv_order on public.cv_languages (cv_id, sort_order);

create table if not exists public.cv_certifications (
  id uuid primary key default uuid_generate_v4(),
  cv_id uuid not null references public.user_cvs(id) on delete cascade,
  name text not null,
  issuer text,
  issued_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_cv_certifications_cv_order on public.cv_certifications (cv_id, sort_order);

create table if not exists public.cv_links (
  id uuid primary key default uuid_generate_v4(),
  cv_id uuid not null references public.user_cvs(id) on delete cascade,
  type text not null check (type in ('linkedin', 'website', 'github', 'behance', 'twitter', 'instagram', 'other')),
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_cv_links_cv_order on public.cv_links (cv_id, sort_order);

-- Row level security
alter table public.user_cvs enable row level security;
alter table public.cv_experience enable row level security;
alter table public.cv_education enable row level security;
alter table public.cv_skills enable row level security;
alter table public.cv_languages enable row level security;
alter table public.cv_certifications enable row level security;
alter table public.cv_links enable row level security;

-- Public read for CV content (browsing job seekers' CVs).
drop policy if exists "Public can read user_cvs" on public.user_cvs;
create policy "Public can read user_cvs"
  on public.user_cvs for select
  using (true);

drop policy if exists "Owner can insert user_cvs" on public.user_cvs;
create policy "Owner can insert user_cvs"
  on public.user_cvs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Owner can update user_cvs" on public.user_cvs;
create policy "Owner can update user_cvs"
  on public.user_cvs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owner can delete user_cvs" on public.user_cvs;
create policy "Owner can delete user_cvs"
  on public.user_cvs for delete
  using (auth.uid() = user_id);

-- Helper expression: user owns the parent CV.
-- Repeated per child table for portability (no security definer fn needed).

drop policy if exists "Public can read cv_experience" on public.cv_experience;
create policy "Public can read cv_experience"
  on public.cv_experience for select
  using (true);

drop policy if exists "Owner can mutate cv_experience" on public.cv_experience;
create policy "Owner can mutate cv_experience"
  on public.cv_experience for all
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_experience.cv_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_experience.cv_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Public can read cv_education" on public.cv_education;
create policy "Public can read cv_education"
  on public.cv_education for select
  using (true);

drop policy if exists "Owner can mutate cv_education" on public.cv_education;
create policy "Owner can mutate cv_education"
  on public.cv_education for all
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_education.cv_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_education.cv_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Public can read cv_skills" on public.cv_skills;
create policy "Public can read cv_skills"
  on public.cv_skills for select
  using (true);

drop policy if exists "Owner can mutate cv_skills" on public.cv_skills;
create policy "Owner can mutate cv_skills"
  on public.cv_skills for all
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_skills.cv_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_skills.cv_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Public can read cv_languages" on public.cv_languages;
create policy "Public can read cv_languages"
  on public.cv_languages for select
  using (true);

drop policy if exists "Owner can mutate cv_languages" on public.cv_languages;
create policy "Owner can mutate cv_languages"
  on public.cv_languages for all
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_languages.cv_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_languages.cv_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Public can read cv_certifications" on public.cv_certifications;
create policy "Public can read cv_certifications"
  on public.cv_certifications for select
  using (true);

drop policy if exists "Owner can mutate cv_certifications" on public.cv_certifications;
create policy "Owner can mutate cv_certifications"
  on public.cv_certifications for all
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_certifications.cv_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_certifications.cv_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Public can read cv_links" on public.cv_links;
create policy "Public can read cv_links"
  on public.cv_links for select
  using (true);

drop policy if exists "Owner can mutate cv_links" on public.cv_links;
create policy "Owner can mutate cv_links"
  on public.cv_links for all
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_links.cv_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_links.cv_id and c.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.user_cvs to anon, authenticated, service_role;
grant select, insert, update, delete on public.cv_experience to anon, authenticated, service_role;
grant select, insert, update, delete on public.cv_education to anon, authenticated, service_role;
grant select, insert, update, delete on public.cv_skills to anon, authenticated, service_role;
grant select, insert, update, delete on public.cv_languages to anon, authenticated, service_role;
grant select, insert, update, delete on public.cv_certifications to anon, authenticated, service_role;
grant select, insert, update, delete on public.cv_links to anon, authenticated, service_role;

comment on table public.user_cvs is 'Per-user virtual CV / resume header (one row per profile). Children: cv_experience, cv_education, cv_skills, cv_languages, cv_certifications, cv_links.';
comment on column public.user_cvs.photo_url is 'CV photo (typically same Supabase storage bucket as profile-avatars).';

-- -----------------------------------------------------------------------------
-- Source: 20260521120000_cv_builder_redesign.sql
-- -----------------------------------------------------------------------------

-- CV builder v2: Kariera.sk-style structured fields, employment types, education kinds,
-- courses, soft skills, driving licenses, consents, employer visibility.

-- ---------------------------------------------------------------------------
-- user_cvs: extended header + settings + consents
-- ---------------------------------------------------------------------------
alter table public.user_cvs
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists show_academic_title boolean not null default false,
  add column if not exists academic_title text,
  add column if not exists birth_date date,
  add column if not exists linkedin_url text,
  add column if not exists show_contact_details boolean not null default true,
  add column if not exists address_country text,
  add column if not exists address_postal_code text,
  add column if not exists address_district text,
  add column if not exists address_city text,
  add column if not exists address_street text,
  add column if not exists about_me text,
  add column if not exists cv_title text,
  add column if not exists visible_to_employers boolean not null default true,
  add column if not exists driving_license_categories text[] not null default '{}',
  add column if not exists approximate_km_driven integer,
  add column if not exists additional_skills_info text,
  add column if not exists highest_education_level text,
  add column if not exists gdpr_consent boolean not null default false,
  add column if not exists terms_consent boolean not null default false,
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists draft_saved_at timestamptz;

comment on column public.user_cvs.about_me is 'Niečo o sebe (textarea); legacy bio may be copied on read.';
comment on column public.user_cvs.driving_license_categories is 'Selected categories e.g. AM, B, C1E.';
comment on column public.user_cvs.visible_to_employers is 'When false, public CV API hides content from non-owners.';

-- ---------------------------------------------------------------------------
-- cv_experience: employment vs volunteer
-- ---------------------------------------------------------------------------
alter table public.cv_experience
  add column if not exists entry_type text not null default 'employment'
    check (entry_type in ('employment', 'volunteer'));

-- ---------------------------------------------------------------------------
-- cv_education: secondary vs university rows
-- ---------------------------------------------------------------------------
alter table public.cv_education
  add column if not exists education_kind text not null default 'university'
    check (education_kind in ('secondary', 'university'));

-- ---------------------------------------------------------------------------
-- cv_courses: kurzy a školenia
-- ---------------------------------------------------------------------------
create table if not exists public.cv_courses (
  id uuid primary key default uuid_generate_v4(),
  cv_id uuid not null references public.user_cvs(id) on delete cascade,
  title text not null,
  institution text,
  year integer,
  certificate_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cv_courses_cv_order on public.cv_courses (cv_id, sort_order);

-- ---------------------------------------------------------------------------
-- cv_soft_skills: mäkké zručnosti (separate from cv_skills = znalosti)
-- ---------------------------------------------------------------------------
create table if not exists public.cv_soft_skills (
  id uuid primary key default uuid_generate_v4(),
  cv_id uuid not null references public.user_cvs(id) on delete cascade,
  skill_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (cv_id, skill_name)
);

create index if not exists idx_cv_soft_skills_cv_order on public.cv_soft_skills (cv_id, sort_order);

-- RLS + grants (match existing CV child tables)
alter table public.cv_courses enable row level security;
alter table public.cv_soft_skills enable row level security;

drop policy if exists "Public can read cv_courses" on public.cv_courses;
create policy "Public can read cv_courses"
  on public.cv_courses for select
  using (true);

drop policy if exists "Owner can mutate cv_courses" on public.cv_courses;
create policy "Owner can mutate cv_courses"
  on public.cv_courses for all
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_courses.cv_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_courses.cv_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Public can read cv_soft_skills" on public.cv_soft_skills;
create policy "Public can read cv_soft_skills"
  on public.cv_soft_skills for select
  using (true);

drop policy if exists "Owner can mutate cv_soft_skills" on public.cv_soft_skills;
create policy "Owner can mutate cv_soft_skills"
  on public.cv_soft_skills for all
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_soft_skills.cv_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_soft_skills.cv_id and c.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.cv_courses to anon, authenticated, service_role;
grant select, insert, update, delete on public.cv_soft_skills to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260522100000_employer_applicants_module.sql
-- -----------------------------------------------------------------------------

-- Employer applicants: interview_invited status, history, auto-message templates, idempotency log, realtime.

-- ---------------------------------------------------------------------------
-- applications.status: add interview_invited
-- ---------------------------------------------------------------------------
alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in ('pending', 'accepted', 'rejected', 'withdrawn', 'interview_invited'));

-- ---------------------------------------------------------------------------
-- application_status_history
-- ---------------------------------------------------------------------------
create table if not exists public.application_status_history (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid not null references public.applications(id) on delete cascade,
  old_status text not null,
  new_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  source text not null default 'employer_ui'
    check (source in ('employer_ui', 'system'))
);

create index if not exists idx_application_status_history_app_changed
  on public.application_status_history (application_id, changed_at desc);

alter table public.application_status_history enable row level security;

drop policy if exists "service role full application_status_history" on public.application_status_history;
create policy "service role full application_status_history"
  on public.application_status_history
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- company_applicant_message_templates
-- ---------------------------------------------------------------------------
create table if not exists public.company_applicant_message_templates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.profiles(id) on delete cascade,
  status_type text not null
    check (status_type in ('rejected', 'interview_invited', 'accepted')),
  message_text text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, status_type)
);

create index if not exists idx_company_applicant_msg_templates_company
  on public.company_applicant_message_templates (company_id);

create trigger company_applicant_message_templates_updated_at
  before update on public.company_applicant_message_templates
  for each row execute function public.set_updated_at();

alter table public.company_applicant_message_templates enable row level security;

drop policy if exists "service role full company_applicant_message_templates" on public.company_applicant_message_templates;
create policy "service role full company_applicant_message_templates"
  on public.company_applicant_message_templates
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- application_auto_messages (idempotency: one auto message per app per target status)
-- ---------------------------------------------------------------------------
create table if not exists public.application_auto_messages (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid not null references public.applications(id) on delete cascade,
  target_status text not null
    check (target_status in ('rejected', 'interview_invited', 'accepted')),
  message_id uuid references public.chat_messages(id) on delete set null,
  sent_at timestamptz not null default now(),
  unique (application_id, target_status)
);

create index if not exists idx_application_auto_messages_application
  on public.application_auto_messages (application_id);

alter table public.application_auto_messages enable row level security;

drop policy if exists "service role full application_auto_messages" on public.application_auto_messages;
create policy "service role full application_auto_messages"
  on public.application_auto_messages
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Atomic status update + history (called by Nest with service role)
-- ---------------------------------------------------------------------------
create or replace function public.employer_set_application_status(
  p_application_id uuid,
  p_new_status text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app record;
  v_company_id uuid;
begin
  if p_new_status not in ('pending', 'rejected', 'interview_invited', 'accepted') then
    raise exception 'invalid_status';
  end if;

  select a.id, a.job_id, a.individual_id, a.status, a.is_deleted
  into v_app
  from public.applications a
  where a.id = p_application_id;

  if not found then
    raise exception 'not_found';
  end if;

  if v_app.is_deleted then
    raise exception 'not_found';
  end if;

  if v_app.status = 'withdrawn' then
    raise exception 'withdrawn';
  end if;

  select j.company_id into v_company_id
  from public.job_offers j
  where j.id = v_app.job_id and not j.is_deleted;

  if v_company_id is null or v_company_id <> p_actor_id then
    raise exception 'forbidden';
  end if;

  if v_app.status = p_new_status then
    return jsonb_build_object(
      'id', v_app.id,
      'status', v_app.status,
      'unchanged', true
    );
  end if;

  insert into public.application_status_history (
    application_id, old_status, new_status, changed_by, source
  ) values (
    p_application_id, v_app.status, p_new_status, p_actor_id, 'employer_ui'
  );

  update public.applications
  set status = p_new_status, updated_at = now()
  where id = p_application_id;

  return jsonb_build_object(
    'id', p_application_id,
    'status', p_new_status,
    'old_status', v_app.status,
    'unchanged', false
  );
end;
$$;

revoke all on function public.employer_set_application_status(uuid, text, uuid) from public;
grant execute on function public.employer_set_application_status(uuid, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Realtime: applications changes for employer dashboards
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Grants (API uses service role; explicit for migrations consistency)
grant select, insert, update, delete on public.application_status_history to service_role;
grant select, insert, update, delete on public.company_applicant_message_templates to service_role;
grant select, insert, update, delete on public.application_auto_messages to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260523120000_virtual_cv_builder_digital_only.sql
-- -----------------------------------------------------------------------------

-- Virtual CV builder completion: digital-only structured CV fields.
-- Existing drafts remain intact; new fields support the full Slovak CV form.

alter table public.user_cvs
  add column if not exists title_before_name text,
  add column if not exists title_after_name text,
  add column if not exists show_birth_date boolean not null default false;

alter table public.user_cvs
  alter column visible_to_employers set default false;

comment on column public.user_cvs.title_before_name is 'Academic title shown before name when enabled.';
comment on column public.user_cvs.title_after_name is 'Academic title shown after name when enabled.';
comment on column public.user_cvs.show_birth_date is 'When true, birth_date may appear in the public/live CV preview.';

alter table public.cv_experience
  add column if not exists achievements text;

comment on column public.cv_experience.achievements is 'Optional measurable results / achievements for employment entries.';

alter table public.cv_education
  add column if not exists city text,
  add column if not exists faculty text,
  add column if not exists study_level text,
  add column if not exists start_year integer,
  add column if not exists end_year integer,
  add column if not exists has_graduation boolean not null default false,
  add column if not exists currently_studying boolean not null default false,
  add column if not exists description text;

comment on column public.cv_education.city is 'Secondary school city.';
comment on column public.cv_education.faculty is 'University faculty.';
comment on column public.cv_education.study_level is 'University study level.';
comment on column public.cv_education.has_graduation is 'Secondary school graduation / maturita flag.';
comment on column public.cv_education.currently_studying is 'University currently studying flag.';

alter table public.cv_courses
  add column if not exists completion_date date,
  add column if not exists certificate_url text,
  add column if not exists certificate_file_url text,
  add column if not exists description text;

comment on column public.cv_courses.completion_date is 'Course completion date, or first day of year when only year is known.';
comment on column public.cv_courses.certificate_url is 'Optional public certificate URL.';
comment on column public.cv_courses.certificate_file_url is 'Optional uploaded certificate file URL.';

-- Restrict direct Supabase reads to the owner or authenticated employer-style accounts.
drop policy if exists "Public can read user_cvs" on public.user_cvs;
drop policy if exists "Owner or employer can read user_cvs" on public.user_cvs;
create policy "Owner or employer can read user_cvs"
  on public.user_cvs for select
  using (
    auth.uid() = user_id
    or (
      visible_to_employers = true
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and (p.customer_role = true or p.provider_role = true or p.role = 'company')
      )
    )
  );

drop policy if exists "Public can read cv_experience" on public.cv_experience;
drop policy if exists "Owner or employer can read cv_experience" on public.cv_experience;
create policy "Owner or employer can read cv_experience"
  on public.cv_experience for select
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_experience.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );

drop policy if exists "Public can read cv_education" on public.cv_education;
drop policy if exists "Owner or employer can read cv_education" on public.cv_education;
create policy "Owner or employer can read cv_education"
  on public.cv_education for select
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_education.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );

drop policy if exists "Public can read cv_courses" on public.cv_courses;
drop policy if exists "Owner or employer can read cv_courses" on public.cv_courses;
create policy "Owner or employer can read cv_courses"
  on public.cv_courses for select
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_courses.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );

drop policy if exists "Public can read cv_skills" on public.cv_skills;
drop policy if exists "Owner or employer can read cv_skills" on public.cv_skills;
create policy "Owner or employer can read cv_skills"
  on public.cv_skills for select
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_skills.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );

drop policy if exists "Public can read cv_soft_skills" on public.cv_soft_skills;
drop policy if exists "Owner or employer can read cv_soft_skills" on public.cv_soft_skills;
create policy "Owner or employer can read cv_soft_skills"
  on public.cv_soft_skills for select
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_soft_skills.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );

drop policy if exists "Public can read cv_languages" on public.cv_languages;
drop policy if exists "Owner or employer can read cv_languages" on public.cv_languages;
create policy "Owner or employer can read cv_languages"
  on public.cv_languages for select
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_languages.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );

drop policy if exists "Public can read cv_certifications" on public.cv_certifications;
drop policy if exists "Owner or employer can read cv_certifications" on public.cv_certifications;
create policy "Owner or employer can read cv_certifications"
  on public.cv_certifications for select
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_certifications.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );

drop policy if exists "Public can read cv_links" on public.cv_links;
drop policy if exists "Owner or employer can read cv_links" on public.cv_links;
create policy "Owner or employer can read cv_links"
  on public.cv_links for select
  using (
    exists (
      select 1 from public.user_cvs c
      where c.id = cv_links.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cv_languages_level_allowed'
      and conrelid = 'public.cv_languages'::regclass
  ) then
    alter table public.cv_languages
      add constraint cv_languages_level_allowed
      check (
        level is null
        or level in (
          'Začiatočník',
          'Mierne pokročilý',
          'Pokročilý',
          'Expert',
          'Rodený hovorca'
        )
      )
      not valid;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Source: 20260524120000_cv_wizard_v3.sql
-- -----------------------------------------------------------------------------

alter table public.user_cvs
  add column if not exists template_key text not null default 'modern',
  add column if not exists wizard_step text not null default 'template',
  add column if not exists wizard_section text,
  add column if not exists gender text,
  add column if not exists birth_day integer,
  add column if not exists birth_month integer,
  add column if not exists birth_year integer,
  add column if not exists address_optional_collapsed boolean not null default false,
  add column if not exists photo_storage_path text,
  add column if not exists photo_original_mime text,
  add column if not exists desired_positions text[] not null default '{}',
  add column if not exists desired_locations text[] not null default '{}',
  add column if not exists employment_types text[] not null default '{}',
  add column if not exists start_availability text,
  add column if not exists salary_min integer,
  add column if not exists salary_currency text not null default 'EUR',
  add column if not exists salary_period text not null default 'monthly',
  add column if not exists weekend_work boolean,
  add column if not exists night_work boolean,
  add column if not exists has_disability boolean not null default false,
  add column if not exists email_job_alerts boolean not null default false,
  add column if not exists pdf_settings jsonb not null default '{}';

alter table public.cv_experience
  add column if not exists city text;

alter table public.cv_skills
  add column if not exists level text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cv_skills_level_allowed'
      and conrelid = 'public.cv_skills'::regclass
  ) then
    alter table public.cv_skills
      add constraint cv_skills_level_allowed
      check (level is null or level in ('Zaciatocnik','Mierne pokrocily','Pokrocily','Expert'))
      not valid;
  end if;
end $$;

alter table public.cv_education
  drop constraint if exists cv_education_education_kind_check;
alter table public.cv_education
  add constraint cv_education_education_kind_check
  check (education_kind in ('secondary','university','course_certificate'));

alter table public.cv_languages
  drop constraint if exists cv_languages_level_allowed;
alter table public.cv_languages
  add constraint cv_languages_level_allowed
  check (
    level is null
    or level in ('A1','A2','B1','B2','C1','C2','Rodeny hovorca')
  );

-- -----------------------------------------------------------------------------
-- Source: 20260525100000_cv_multi_cvs_normalize.sql
-- -----------------------------------------------------------------------------

-- Multi-CV support: rename user_cvs -> cvs, drop one-CV-per-user constraint,
-- normalize personal + job preferences, new sections, education/course merge,
-- volunteering split, portfolio/awards/references, RLS policy table renames.

-- ---------------------------------------------------------------------------
-- 1) Rename core table
-- ---------------------------------------------------------------------------
alter table if exists public.user_cvs rename to cvs;

-- FK references from children keep working; update policy bodies below.

-- ---------------------------------------------------------------------------
-- 2) Drop one-row-per-user constraint and add multi-CV metadata
-- ---------------------------------------------------------------------------
alter table public.cvs drop constraint if exists user_cvs_user_id_key;
alter table public.cvs drop constraint if exists cvs_user_id_key;

alter table public.cvs
  add column if not exists display_title text,
  add column if not exists is_default_for_profile boolean not null default true,
  add column if not exists optional_sections jsonb not null default '{}'::jsonb;

-- cv_title from 20260521120000_cv_builder_redesign may be missing on older DBs or after a partial run.
alter table public.cvs add column if not exists cv_title text;

do $backfill_display_title$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cvs'
      and column_name = 'cv_title'
  ) then
    update public.cvs
    set display_title = coalesce(nullif(trim(cv_title), ''), 'Životopis')
    where display_title is null;
  else
    update public.cvs
    set display_title = 'Životopis'
    where display_title is null;
  end if;
end
$backfill_display_title$;

alter table public.cvs alter column display_title set not null;

drop index if exists public.cvs_one_default_per_user;
create unique index cvs_one_default_per_user
  on public.cvs (user_id)
  where is_default_for_profile = true;

-- ---------------------------------------------------------------------------
-- 3) cv_personal_info (1:1) — create and backfill from cvs
-- ---------------------------------------------------------------------------
create table if not exists public.cv_personal_info (
  cv_id uuid primary key references public.cvs(id) on delete cascade,
  gender text,
  first_name text,
  last_name text,
  show_academic_title boolean not null default false,
  academic_title text,
  title_before_name text,
  title_after_name text,
  birth_date date,
  show_birth_date boolean not null default false,
  email text,
  phone text,
  linkedin_url text,
  show_contact_details boolean not null default true,
  address_country text,
  address_postal_code text,
  address_district text,
  address_city text,
  address_street text,
  about_me text,
  cv_title text,
  birth_day integer,
  birth_month integer,
  birth_year integer,
  address_optional_collapsed boolean not null default false,
  driving_license_categories text[] not null default '{}',
  approximate_km_driven integer,
  additional_skills_info text,
  highest_education_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $backfill_cv_personal_info$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cvs'
      and column_name = 'first_name'
  ) then
    return;
  end if;

  insert into public.cv_personal_info (
    cv_id,
    gender,
    first_name,
    last_name,
    show_academic_title,
    academic_title,
    title_before_name,
    title_after_name,
    birth_date,
    show_birth_date,
    email,
    phone,
    linkedin_url,
    show_contact_details,
    address_country,
    address_postal_code,
    address_district,
    address_city,
    address_street,
    about_me,
    cv_title,
    birth_day,
    birth_month,
    birth_year,
    address_optional_collapsed,
    driving_license_categories,
    approximate_km_driven,
    additional_skills_info,
    highest_education_level
  )
  select
    c.id,
    c.gender,
    c.first_name,
    c.last_name,
    coalesce(c.show_academic_title, false),
    c.academic_title,
    c.title_before_name,
    c.title_after_name,
    c.birth_date,
    coalesce(c.show_birth_date, false),
    c.email,
    c.phone,
    c.linkedin_url,
    coalesce(c.show_contact_details, true),
    c.address_country,
    c.address_postal_code,
    c.address_district,
    c.address_city,
    c.address_street,
    c.about_me,
    c.cv_title,
    c.birth_day,
    c.birth_month,
    c.birth_year,
    coalesce(c.address_optional_collapsed, false),
    coalesce(c.driving_license_categories, '{}'),
    c.approximate_km_driven,
    c.additional_skills_info,
    c.highest_education_level
  from public.cvs c
  on conflict (cv_id) do nothing;
end
$backfill_cv_personal_info$;

-- Drop migrated columns from cvs (keep listing + shell fields)
alter table public.cvs drop column if exists gender;
alter table public.cvs drop column if exists first_name;
alter table public.cvs drop column if exists last_name;
alter table public.cvs drop column if exists show_academic_title;
alter table public.cvs drop column if exists academic_title;
alter table public.cvs drop column if exists title_before_name;
alter table public.cvs drop column if exists title_after_name;
alter table public.cvs drop column if exists birth_date;
alter table public.cvs drop column if exists show_birth_date;
alter table public.cvs drop column if exists email;
alter table public.cvs drop column if exists phone;
alter table public.cvs drop column if exists linkedin_url;
alter table public.cvs drop column if exists show_contact_details;
alter table public.cvs drop column if exists address_country;
alter table public.cvs drop column if exists address_postal_code;
alter table public.cvs drop column if exists address_district;
alter table public.cvs drop column if exists address_city;
alter table public.cvs drop column if exists address_street;
alter table public.cvs drop column if exists about_me;
alter table public.cvs drop column if exists cv_title;
alter table public.cvs drop column if exists birth_day;
alter table public.cvs drop column if exists birth_month;
alter table public.cvs drop column if exists birth_year;
alter table public.cvs drop column if exists address_optional_collapsed;
alter table public.cvs drop column if exists driving_license_categories;
alter table public.cvs drop column if exists approximate_km_driven;
alter table public.cvs drop column if exists additional_skills_info;
alter table public.cvs drop column if exists highest_education_level;

-- ---------------------------------------------------------------------------
-- 4) cv_job_preferences (1:1)
-- ---------------------------------------------------------------------------
create table if not exists public.cv_job_preferences (
  cv_id uuid primary key references public.cvs(id) on delete cascade,
  desired_positions text[] not null default '{}',
  desired_locations text[] not null default '{}',
  employment_types text[] not null default '{}',
  start_availability text,
  salary_min integer,
  salary_currency text not null default 'EUR',
  salary_period text not null default 'monthly',
  weekend_work boolean,
  night_work boolean,
  has_disability boolean not null default false,
  email_job_alerts boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $backfill_cv_job_preferences$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cvs'
      and column_name = 'desired_positions'
  ) then
    insert into public.cv_job_preferences (
      cv_id,
      desired_positions,
      desired_locations,
      employment_types,
      start_availability,
      salary_min,
      salary_currency,
      salary_period,
      weekend_work,
      night_work,
      has_disability,
      email_job_alerts
    )
    select
      c.id,
      coalesce(c.desired_positions, '{}'),
      coalesce(c.desired_locations, '{}'),
      coalesce(c.employment_types, '{}'),
      c.start_availability,
      c.salary_min,
      coalesce(c.salary_currency, 'EUR'),
      coalesce(c.salary_period, 'monthly'),
      c.weekend_work,
      c.night_work,
      coalesce(c.has_disability, false),
      coalesce(c.email_job_alerts, false)
    from public.cvs c
    on conflict (cv_id) do nothing;
  else
    insert into public.cv_job_preferences (
      cv_id,
      desired_positions,
      desired_locations,
      employment_types
    )
    select c.id, '{}', '{}', '{}'
    from public.cvs c
    where not exists (
      select 1
      from public.cv_job_preferences j
      where j.cv_id = c.id
    );
  end if;
end
$backfill_cv_job_preferences$;

alter table public.cvs drop column if exists desired_positions;
alter table public.cvs drop column if exists desired_locations;
alter table public.cvs drop column if exists employment_types;
alter table public.cvs drop column if exists start_availability;
alter table public.cvs drop column if exists salary_min;
alter table public.cvs drop column if exists salary_currency;
alter table public.cvs drop column if exists salary_period;
alter table public.cvs drop column if exists weekend_work;
alter table public.cvs drop column if exists night_work;
alter table public.cvs drop column if exists has_disability;
alter table public.cvs drop column if exists email_job_alerts;

-- ---------------------------------------------------------------------------
-- 5) Work experience: country + bullets; employment-only after volunteer migration
-- ---------------------------------------------------------------------------
alter table public.cv_experience
  add column if not exists country text,
  add column if not exists bullets jsonb not null default '[]'::jsonb;

create table if not exists public.cv_volunteering (
  id uuid primary key default uuid_generate_v4(),
  cv_id uuid not null references public.cvs(id) on delete cascade,
  role_title text not null,
  organization text not null,
  city text,
  country text,
  start_date date,
  end_date date,
  current boolean not null default false,
  description text,
  bullets jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cv_volunteering_cv_order on public.cv_volunteering (cv_id, sort_order);

insert into public.cv_volunteering (
  cv_id,
  role_title,
  organization,
  city,
  country,
  start_date,
  end_date,
  current,
  description,
  bullets,
  sort_order,
  created_at,
  updated_at
)
select
  e.cv_id,
  coalesce(nullif(trim(e.position), ''), 'Dobrovoľník'),
  coalesce(nullif(trim(e.company), ''), 'Organizácia'),
  e.city,
  null,
  e.start_date,
  e.end_date,
  e.current,
  e.description,
  case
    when e.achievements is not null and length(trim(e.achievements)) > 0
    then jsonb_build_array(e.achievements)
    else '[]'::jsonb
  end,
  e.sort_order,
  e.created_at,
  e.updated_at
from public.cv_experience e
where e.entry_type = 'volunteer';

delete from public.cv_experience where entry_type = 'volunteer';

alter table public.cv_experience drop constraint if exists cv_experience_entry_type_check;
alter table public.cv_experience
  add constraint cv_experience_entry_type_check
  check (entry_type = 'employment');

-- ---------------------------------------------------------------------------
-- 6) Education: add fields for unified layout + course merge
-- ---------------------------------------------------------------------------
alter table public.cv_education
  add column if not exists country text,
  add column if not exists institution text,
  add column if not exists bullets jsonb not null default '[]'::jsonb,
  add column if not exists certificate_name text,
  add column if not exists certificate_url text,
  add column if not exists certificate_file_url text,
  add column if not exists issued_year integer;

-- Migrate courses into cv_education (only when legacy table exists)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'cv_courses'
  ) then
    insert into public.cv_education (
  cv_id,
  education_kind,
  school,
  degree,
  field,
  start_date,
  end_date,
  city,
  faculty,
  study_level,
  start_year,
  end_year,
  has_graduation,
  currently_studying,
  description,
  sort_order,
  created_at,
  updated_at,
  country,
  institution,
  bullets,
  certificate_name,
  certificate_url,
  certificate_file_url,
  issued_year
)
select
  cr.cv_id,
  'course_certificate',
  coalesce(nullif(trim(cr.title), ''), 'Kurz'),
  null,
  cr.certificate_name,
  null,
  cr.completion_date,
  null,
  null,
  null,
  cr.year,
  null,
  false,
  false,
  cr.description,
  cr.sort_order + 100000,
  cr.created_at,
  cr.updated_at,
  null,
  cr.institution,
  '[]'::jsonb,
  cr.certificate_name,
  cr.certificate_url,
  cr.certificate_file_url,
  cr.year
from public.cv_courses cr;
  end if;
end $$;

drop table if exists public.cv_courses cascade;

-- ---------------------------------------------------------------------------
-- 7) Certifications extension
-- ---------------------------------------------------------------------------
alter table public.cv_certifications
  add column if not exists description text,
  add column if not exists certificate_url text,
  add column if not exists certificate_file_url text,
  add column if not exists issued_year integer;

-- ---------------------------------------------------------------------------
-- 8) Portfolio, awards, references
-- ---------------------------------------------------------------------------
create table if not exists public.cv_portfolio_links (
  id uuid primary key default uuid_generate_v4(),
  cv_id uuid not null references public.cvs(id) on delete cascade,
  label text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cv_portfolio_links_cv_order on public.cv_portfolio_links (cv_id, sort_order);

create table if not exists public.cv_awards (
  id uuid primary key default uuid_generate_v4(),
  cv_id uuid not null references public.cvs(id) on delete cascade,
  title text not null,
  issuer text,
  issued_year integer,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cv_awards_cv_order on public.cv_awards (cv_id, sort_order);

create table if not exists public.cv_references (
  id uuid primary key default uuid_generate_v4(),
  cv_id uuid not null references public.cvs(id) on delete cascade,
  person_name text not null,
  organization text,
  position text,
  email text,
  phone text,
  relationship_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cv_references_cv_order on public.cv_references (cv_id, sort_order);

-- ---------------------------------------------------------------------------
-- 9) Language levels: A1–C2 only
-- ---------------------------------------------------------------------------
alter table public.cv_languages drop constraint if exists cv_languages_level_allowed;
alter table public.cv_languages
  add constraint cv_languages_level_allowed
  check (
    level is null
    or level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')
  )
  not valid;
alter table public.cv_languages validate constraint cv_languages_level_allowed;

-- Normalize legacy values
update public.cv_languages set level = null
where level is not null
  and level not in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- ---------------------------------------------------------------------------
-- 10) Skill levels (display Slovak with diacritics in app; DB accepts both)
-- ---------------------------------------------------------------------------
alter table public.cv_skills drop constraint if exists cv_skills_level_allowed;
alter table public.cv_skills
  add constraint cv_skills_level_allowed
  check (
    level is null
    or level in (
      'Zaciatocnik',
      'Mierne pokrocily',
      'Pokrocily',
      'Expert',
      'Začiatočník',
      'Mierne pokročilý',
      'Pokročilý'
    )
  )
  not valid;
alter table public.cv_skills validate constraint cv_skills_level_allowed;

-- ---------------------------------------------------------------------------
-- 11) RLS — replace user_cvs with cvs in policy definitions
-- ---------------------------------------------------------------------------
alter table public.cv_personal_info enable row level security;
alter table public.cv_job_preferences enable row level security;
alter table public.cv_volunteering enable row level security;
alter table public.cv_portfolio_links enable row level security;
alter table public.cv_awards enable row level security;
alter table public.cv_references enable row level security;

-- cvs table policies (drop old names referencing user_cvs)
drop policy if exists "Public can read user_cvs" on public.cvs;
drop policy if exists "Owner can insert user_cvs" on public.cvs;
drop policy if exists "Owner can update user_cvs" on public.cvs;
drop policy if exists "Owner can delete user_cvs" on public.cvs;
drop policy if exists "Owner or employer can read user_cvs" on public.cvs;

drop policy if exists "Owner or employer can read cvs" on public.cvs;
create policy "Owner or employer can read cvs"
  on public.cvs for select
  using (
    auth.uid() = user_id
    or (
      visible_to_employers = true
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and (p.customer_role = true or p.provider_role = true or p.role = 'company')
      )
    )
  );

drop policy if exists "Owner can insert cvs" on public.cvs;
create policy "Owner can insert cvs"
  on public.cvs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Owner can update cvs" on public.cvs;
create policy "Owner can update cvs"
  on public.cvs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owner can delete cvs" on public.cvs;
create policy "Owner can delete cvs"
  on public.cvs for delete
  using (auth.uid() = user_id);

-- Helper macro pattern: owner or visible+employer via parent cvs
drop policy if exists "Owner or employer can read cv_personal_info" on public.cv_personal_info;
create policy "Owner or employer can read cv_personal_info"
  on public.cv_personal_info for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_personal_info.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );

drop policy if exists "Owner can mutate cv_personal_info" on public.cv_personal_info;
create policy "Owner can mutate cv_personal_info"
  on public.cv_personal_info for all
  using (exists (select 1 from public.cvs c where c.id = cv_personal_info.cv_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cvs c where c.id = cv_personal_info.cv_id and c.user_id = auth.uid()));

drop policy if exists "Owner or employer can read cv_job_preferences" on public.cv_job_preferences;
create policy "Owner or employer can read cv_job_preferences"
  on public.cv_job_preferences for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_job_preferences.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );

drop policy if exists "Owner can mutate cv_job_preferences" on public.cv_job_preferences;
create policy "Owner can mutate cv_job_preferences"
  on public.cv_job_preferences for all
  using (exists (select 1 from public.cvs c where c.id = cv_job_preferences.cv_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cvs c where c.id = cv_job_preferences.cv_id and c.user_id = auth.uid()));

-- Child tables: replace user_cvs with cvs in policies
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'cv_experience',
        'cv_education',
        'cv_skills',
        'cv_soft_skills',
        'cv_languages',
        'cv_certifications',
        'cv_links',
        'cv_volunteering',
        'cv_portfolio_links',
        'cv_awards',
        'cv_references'
      )
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- cv_experience
create policy "Owner or employer can read cv_experience"
  on public.cv_experience for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_experience.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );
create policy "Owner can mutate cv_experience"
  on public.cv_experience for all
  using (exists (select 1 from public.cvs c where c.id = cv_experience.cv_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cvs c where c.id = cv_experience.cv_id and c.user_id = auth.uid()));

-- cv_education
create policy "Owner or employer can read cv_education"
  on public.cv_education for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_education.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );
create policy "Owner can mutate cv_education"
  on public.cv_education for all
  using (exists (select 1 from public.cvs c where c.id = cv_education.cv_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cvs c where c.id = cv_education.cv_id and c.user_id = auth.uid()));

-- cv_skills
create policy "Owner or employer can read cv_skills"
  on public.cv_skills for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_skills.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );
create policy "Owner can mutate cv_skills"
  on public.cv_skills for all
  using (exists (select 1 from public.cvs c where c.id = cv_skills.cv_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cvs c where c.id = cv_skills.cv_id and c.user_id = auth.uid()));

-- cv_soft_skills
create policy "Owner or employer can read cv_soft_skills"
  on public.cv_soft_skills for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_soft_skills.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );
create policy "Owner can mutate cv_soft_skills"
  on public.cv_soft_skills for all
  using (exists (select 1 from public.cvs c where c.id = cv_soft_skills.cv_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cvs c where c.id = cv_soft_skills.cv_id and c.user_id = auth.uid()));

-- cv_languages
create policy "Owner or employer can read cv_languages"
  on public.cv_languages for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_languages.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );
create policy "Owner can mutate cv_languages"
  on public.cv_languages for all
  using (exists (select 1 from public.cvs c where c.id = cv_languages.cv_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cvs c where c.id = cv_languages.cv_id and c.user_id = auth.uid()));

-- cv_certifications
create policy "Owner or employer can read cv_certifications"
  on public.cv_certifications for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_certifications.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );
create policy "Owner can mutate cv_certifications"
  on public.cv_certifications for all
  using (exists (select 1 from public.cvs c where c.id = cv_certifications.cv_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cvs c where c.id = cv_certifications.cv_id and c.user_id = auth.uid()));

-- cv_links
create policy "Owner or employer can read cv_links"
  on public.cv_links for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_links.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );
create policy "Owner can mutate cv_links"
  on public.cv_links for all
  using (exists (select 1 from public.cvs c where c.id = cv_links.cv_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cvs c where c.id = cv_links.cv_id and c.user_id = auth.uid()));

-- New tables RLS (same pattern)
drop policy if exists "Owner or employer can read cv_volunteering" on public.cv_volunteering;
drop policy if exists "Owner can mutate cv_volunteering" on public.cv_volunteering;
create policy "Owner or employer can read cv_volunteering"
  on public.cv_volunteering for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_volunteering.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );
create policy "Owner can mutate cv_volunteering"
  on public.cv_volunteering for all
  using (exists (select 1 from public.cvs c where c.id = cv_volunteering.cv_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cvs c where c.id = cv_volunteering.cv_id and c.user_id = auth.uid()));

drop policy if exists "Owner or employer can read cv_portfolio_links" on public.cv_portfolio_links;
drop policy if exists "Owner can mutate cv_portfolio_links" on public.cv_portfolio_links;
create policy "Owner or employer can read cv_portfolio_links"
  on public.cv_portfolio_links for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_portfolio_links.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );
create policy "Owner can mutate cv_portfolio_links"
  on public.cv_portfolio_links for all
  using (exists (select 1 from public.cvs c where c.id = cv_portfolio_links.cv_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cvs c where c.id = cv_portfolio_links.cv_id and c.user_id = auth.uid()));

drop policy if exists "Owner or employer can read cv_awards" on public.cv_awards;
drop policy if exists "Owner can mutate cv_awards" on public.cv_awards;
create policy "Owner or employer can read cv_awards"
  on public.cv_awards for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_awards.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );
create policy "Owner can mutate cv_awards"
  on public.cv_awards for all
  using (exists (select 1 from public.cvs c where c.id = cv_awards.cv_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cvs c where c.id = cv_awards.cv_id and c.user_id = auth.uid()));

drop policy if exists "Owner or employer can read cv_references" on public.cv_references;
drop policy if exists "Owner can mutate cv_references" on public.cv_references;
create policy "Owner or employer can read cv_references"
  on public.cv_references for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_references.cv_id
        and (
          c.user_id = auth.uid()
          or (
            c.visible_to_employers = true
            and exists (
              select 1 from public.profiles p
              where p.id = auth.uid()
                and (p.customer_role = true or p.provider_role = true or p.role = 'company')
            )
          )
        )
    )
  );
create policy "Owner can mutate cv_references"
  on public.cv_references for all
  using (exists (select 1 from public.cvs c where c.id = cv_references.cv_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.cvs c where c.id = cv_references.cv_id and c.user_id = auth.uid()));

grant select, insert, update, delete on public.cv_personal_info to anon, authenticated, service_role;
grant select, insert, update, delete on public.cv_job_preferences to anon, authenticated, service_role;
grant select, insert, update, delete on public.cv_volunteering to anon, authenticated, service_role;
grant select, insert, update, delete on public.cv_portfolio_links to anon, authenticated, service_role;
grant select, insert, update, delete on public.cv_awards to anon, authenticated, service_role;
grant select, insert, update, delete on public.cv_references to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260525120000_applicant_auto_response_templates_delta.sql
-- -----------------------------------------------------------------------------

-- Delta: applicant auto-response template defaults.
-- Guarded so it no-ops when the applicants module table is not present.

do $$
begin
  if to_regclass('public.company_applicant_message_templates') is null then
    return;
  end if;

  comment on table public.company_applicant_message_templates is
    'Product name: company_auto_response_templates (automatic applicant response templates by status).';

  create index if not exists idx_application_auto_messages_app_status
    on public.application_auto_messages (application_id, target_status);

  with default_templates as (
    select *
    from (
      values
        ('rejected'::text, 'Dobry den {{candidateName}}, je nam to luto, ale na poziciu {{jobTitle}} sme sa rozhodli prijat ineho uchadzaca. S pozdravom {{companyName}}.'::text),
        ('interview_invited'::text, 'Dobry den {{candidateName}}, po posudeni uchadzacov sme sa rozhodli pozvat Vas na pohovor na poziciu {{jobTitle}}. Prosim, kontaktujte nas, aby sme si dohodli datum a cas. S pozdravom {{companyName}}.'::text),
        ('accepted'::text, 'Dobry den {{candidateName}}, gratulujeme, boli ste prijaty na poziciu {{jobTitle}}. S pozdravom {{companyName}}.'::text)
    ) as t(status_type, template_text)
  ),
  company_ids as (
    select distinct company_id from public.company_applicant_message_templates
    union
    select distinct company_id from public.job_offers where company_id is not null and is_deleted = false
  )
  insert into public.company_applicant_message_templates (company_id, status_type, enabled, message_text)
  select c.company_id, d.status_type, false, d.template_text
  from company_ids c
  cross join default_templates d
  left join public.company_applicant_message_templates ex
    on ex.company_id = c.company_id and ex.status_type = d.status_type
  where ex.id is null;

  update public.company_applicant_message_templates
  set message_text = d.template_text,
      updated_at = now()
  from (
    values
      ('rejected'::text, 'Dobry den {{candidateName}}, je nam to luto, ale na poziciu {{jobTitle}} sme sa rozhodli prijat ineho uchadzaca. S pozdravom {{companyName}}.'::text),
      ('interview_invited'::text, 'Dobry den {{candidateName}}, po posudeni uchadzacov sme sa rozhodli pozvat Vas na pohovor na poziciu {{jobTitle}}. Prosim, kontaktujte nas, aby sme si dohodli datum a cas. S pozdravom {{companyName}}.'::text),
      ('accepted'::text, 'Dobry den {{candidateName}}, gratulujeme, boli ste prijaty na poziciu {{jobTitle}}. S pozdravom {{companyName}}.'::text)
  ) as d(status_type, template_text)
  where public.company_applicant_message_templates.status_type = d.status_type
    and (
      public.company_applicant_message_templates.message_text is null
      or btrim(public.company_applicant_message_templates.message_text) = ''
      or public.company_applicant_message_templates.message_text in (
        'Prepacte, ale rozhodli sme sa pokracovat s inymi kandidatmi.',
        'Radi by sme vas pozvali na pohovor.',
        'Gratulujeme, boli ste prijaty.'
      )
    );
end $$;

-- -----------------------------------------------------------------------------
-- Source: 20260526120000_cv_personal_hobbies.sql
-- -----------------------------------------------------------------------------

-- Optional hobbies textarea for CV builder (separate from personal summary / about_me).
alter table public.cv_personal_info
  add column if not exists hobbies text;

comment on column public.cv_personal_info.hobbies is 'Free-text hobbies; shown when optional section enabled.';

-- -----------------------------------------------------------------------------
-- Source: 20260527130000_job_email_alerts.sql
-- -----------------------------------------------------------------------------

-- Job email alerts: per-user saved criteria + sent job dedupe for digest emails.

alter table public.job_offers
  add column if not exists work_mode text;

update public.job_offers
set work_mode = 'on_site'
where work_mode is null;

alter table public.job_offers
  alter column work_mode set default 'on_site';

alter table public.job_offers
  alter column work_mode set not null;

alter table public.job_offers
  drop constraint if exists job_offers_work_mode_check;

alter table public.job_offers
  add constraint job_offers_work_mode_check
  check (work_mode in ('on_site', 'hybrid', 'remote'));

comment on column public.job_offers.work_mode is 'Work arrangement: on_site, hybrid, remote.';

create table if not exists public.job_email_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  keywords text not null default '',
  location text not null default '',
  category text,
  employment_types text[] not null default '{}'::text[],
  salary_min numeric,
  work_mode text,
  frequency text not null,
  is_active boolean not null default true,
  criteria_hash text not null,
  last_dispatch_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_email_alerts_frequency_check
    check (frequency in ('daily', 'weekly', 'immediate')),
  constraint job_email_alerts_work_mode_check
    check (work_mode is null or work_mode in ('on_site', 'hybrid', 'remote')),
  constraint job_email_alerts_employment_subset_check
    check (
      cardinality(employment_types) = 0
      or employment_types <@ array[
        'full_time',
        'part_time',
        'brigada',
        'zivnost',
        'internship'
      ]::text[]
    ),
  unique (user_id, criteria_hash)
);

create index if not exists idx_job_email_alerts_user_id on public.job_email_alerts (user_id);
create index if not exists idx_job_email_alerts_user_active on public.job_email_alerts (user_id, is_active)
  where is_active = true;

drop trigger if exists job_email_alerts_updated_at on public.job_email_alerts;

create trigger job_email_alerts_updated_at
  before update on public.job_email_alerts
  for each row execute function public.set_updated_at();

create table if not exists public.job_email_alert_sent_jobs (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.job_email_alerts (id) on delete cascade,
  job_id uuid not null references public.job_offers (id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique (alert_id, job_id)
);

create index if not exists idx_job_email_alert_sent_jobs_alert on public.job_email_alert_sent_jobs (alert_id, sent_at desc);

alter table public.job_email_alerts enable row level security;
alter table public.job_email_alert_sent_jobs enable row level security;

drop policy if exists "Users manage own job email alerts" on public.job_email_alerts;

create policy "Users manage own job email alerts"
  on public.job_email_alerts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage sent jobs for own alerts" on public.job_email_alert_sent_jobs;

create policy "Users manage sent jobs for own alerts"
  on public.job_email_alert_sent_jobs
  for all
  using (
    exists (
      select 1
      from public.job_email_alerts a
      where a.id = alert_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.job_email_alerts a
      where a.id = alert_id and a.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.job_email_alerts to anon, authenticated, service_role;
grant select, insert, update, delete on public.job_email_alert_sent_jobs to anon, authenticated, service_role;

comment on table public.job_email_alerts is 'User-defined job alert criteria; backend dispatches emails and records sent jobs.';
comment on table public.job_email_alert_sent_jobs is 'Dedupe: which job_ids were emailed for which alert.';

-- -----------------------------------------------------------------------------
-- Source: 20260528000000_job_offers_and_alerts_worki_fields.sql
-- -----------------------------------------------------------------------------

-- Worki-style fields on job_offers (job postings) and job_email_alerts (saved criteria).
-- Adds rich filterable attributes so email alerts can match on them end-to-end.

-- ---------------------------------------------------------------------------
-- 1. job_offers: new columns capturing rich job attributes
-- ---------------------------------------------------------------------------

alter table public.job_offers
  add column if not exists work_from_home boolean not null default false,
  add column if not exists salary_type text,
  add column if not exists salary_min numeric,
  add column if not exists salary_max numeric,
  add column if not exists education_levels int[] not null default '{}'::int[],
  add column if not exists benefits int[] not null default '{}'::int[],
  add column if not exists suitable_for int[] not null default '{}'::int[],
  add column if not exists driver_licenses int[] not null default '{}'::int[],
  add column if not exists work_shift_modes int[] not null default '{}'::int[],
  add column if not exists languages jsonb not null default '[]'::jsonb,
  add column if not exists pc_skills jsonb not null default '[]'::jsonb,
  add column if not exists start_type text,
  add column if not exists start_date date;

alter table public.job_offers
  drop constraint if exists job_offers_salary_type_check;

alter table public.job_offers
  add constraint job_offers_salary_type_check
  check (salary_type is null or salary_type in ('monthly', 'hourly'));

alter table public.job_offers
  drop constraint if exists job_offers_start_type_check;

alter table public.job_offers
  add constraint job_offers_start_type_check
  check (start_type is null or start_type in ('asap', 'by_agreement', 'date'));

comment on column public.job_offers.work_from_home is 'Position can be performed (partly) from home.';
comment on column public.job_offers.salary_type is 'Pay period of salary_min/salary_max: monthly or hourly.';
comment on column public.job_offers.salary_min is 'Minimum gross salary in salary_type units.';
comment on column public.job_offers.salary_max is 'Maximum gross salary in salary_type units.';
comment on column public.job_offers.education_levels is 'Required education levels (stable IDs 1-9 per app/utils/job-alert-options).';
comment on column public.job_offers.benefits is 'Offered benefits (stable IDs per app/utils/job-alert-options).';
comment on column public.job_offers.suitable_for is 'Groups the position is suitable for (stable IDs).';
comment on column public.job_offers.driver_licenses is 'Required driver license categories (stable IDs).';
comment on column public.job_offers.work_shift_modes is 'Work shift modes (one/two/three-shift, continuous, flexible, etc.).';
comment on column public.job_offers.languages is 'Required languages as [{language_id, level}].';
comment on column public.job_offers.pc_skills is 'Required digital skills as [{skill_id, level}].';
comment on column public.job_offers.start_type is 'Start: asap, by_agreement, or date (use start_date when date).';
comment on column public.job_offers.start_date is 'Concrete start date when start_type = date.';

create index if not exists idx_job_offers_work_from_home on public.job_offers (work_from_home) where work_from_home = true;
create index if not exists idx_job_offers_salary_type on public.job_offers (salary_type);
create index if not exists idx_job_offers_start_type on public.job_offers (start_type);
create index if not exists idx_job_offers_education_levels_gin on public.job_offers using gin (education_levels);
create index if not exists idx_job_offers_benefits_gin on public.job_offers using gin (benefits);
create index if not exists idx_job_offers_suitable_for_gin on public.job_offers using gin (suitable_for);
create index if not exists idx_job_offers_driver_licenses_gin on public.job_offers using gin (driver_licenses);
create index if not exists idx_job_offers_work_shift_modes_gin on public.job_offers using gin (work_shift_modes);

-- ---------------------------------------------------------------------------
-- 2. job_email_alerts: mirror criteria fields (all nullable / empty defaults)
-- ---------------------------------------------------------------------------

alter table public.job_email_alerts
  add column if not exists salary_type text,
  add column if not exists salary_max numeric,
  add column if not exists work_from_home boolean not null default false,
  add column if not exists education_levels int[] not null default '{}'::int[],
  add column if not exists benefits int[] not null default '{}'::int[],
  add column if not exists suitable_for int[] not null default '{}'::int[],
  add column if not exists driver_licenses int[] not null default '{}'::int[],
  add column if not exists work_shift_modes int[] not null default '{}'::int[],
  add column if not exists language_filters jsonb not null default '[]'::jsonb,
  add column if not exists pc_skill_filters jsonb not null default '[]'::jsonb,
  add column if not exists start_types text[] not null default '{}'::text[],
  add column if not exists start_date_from date,
  add column if not exists newsletter boolean not null default false;

alter table public.job_email_alerts
  drop constraint if exists job_email_alerts_salary_type_check;

alter table public.job_email_alerts
  add constraint job_email_alerts_salary_type_check
  check (salary_type is null or salary_type in ('monthly', 'hourly'));

alter table public.job_email_alerts
  drop constraint if exists job_email_alerts_start_types_check;

alter table public.job_email_alerts
  add constraint job_email_alerts_start_types_check
  check (
    cardinality(start_types) = 0
    or start_types <@ array['asap', 'by_agreement']::text[]
  );

-- Relax the employment_subset check to include the extended set used by the
-- new Worki-style alert form (parity with /app/add).
alter table public.job_email_alerts
  drop constraint if exists job_email_alerts_employment_subset_check;

alter table public.job_email_alerts
  add constraint job_email_alerts_employment_subset_check
  check (
    cardinality(employment_types) = 0
    or employment_types <@ array[
      'full_time',
      'part_time',
      'brigada',
      'zivnost',
      'internship',
      'agreement',
      'student_agreement',
      'home_work',
      'volunteer'
    ]::text[]
  );

comment on column public.job_email_alerts.salary_type is 'Pay period that salary_min/salary_max are expressed in.';
comment on column public.job_email_alerts.salary_max is 'Upper bound on salary (in salary_type units).';
comment on column public.job_email_alerts.work_from_home is 'Match only jobs that allow home office.';
comment on column public.job_email_alerts.education_levels is 'Match jobs whose required education_levels intersect with this set.';
comment on column public.job_email_alerts.benefits is 'Match jobs whose benefits include all of these.';
comment on column public.job_email_alerts.suitable_for is 'Match jobs whose suitable_for intersects with this set.';
comment on column public.job_email_alerts.driver_licenses is 'Match jobs requiring any of these driver license categories.';
comment on column public.job_email_alerts.work_shift_modes is 'Match jobs whose work_shift_modes intersects with this set.';
comment on column public.job_email_alerts.language_filters is 'Required languages with minimum level [{language_id, level}].';
comment on column public.job_email_alerts.pc_skill_filters is 'Required digital skills with minimum level [{skill_id, level}].';
comment on column public.job_email_alerts.start_types is 'Accepted job start types (asap / by_agreement).';
comment on column public.job_email_alerts.start_date_from is 'Earliest acceptable concrete start date.';
comment on column public.job_email_alerts.newsletter is 'Subscribe to marketing newsletter alongside alert emails.';

-- -----------------------------------------------------------------------------
-- Source: 20260528140000_cv_job_preferences_relocate_remote.sql
-- -----------------------------------------------------------------------------

-- CV job preferences: relocate/commute and remote-only flags (wizard step 3).

alter table public.cv_job_preferences
  add column if not exists open_to_relocate_commute boolean,
  add column if not exists remote_work_only boolean;

comment on column public.cv_job_preferences.open_to_relocate_commute is
  'Candidate open to relocation or longer commute for work.';
comment on column public.cv_job_preferences.remote_work_only is
  'Candidate prefers work from home only.';

-- -----------------------------------------------------------------------------
-- Source: 20260529100000_cv_skills_allow_multiple_empty.sql
-- -----------------------------------------------------------------------------

-- Allow multiple draft skill rows with empty skill_name (UI uses placeholders only).
-- Keep uniqueness only for non-empty names per CV (case-insensitive).

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'cv_skills'
      and c.contype = 'u'
  loop
    execute format('alter table public.cv_skills drop constraint if exists %I', r.conname);
  end loop;
end $$;

create unique index if not exists cv_skills_cv_nonempty_skill_lower_key
  on public.cv_skills (cv_id, lower(trim(skill_name)))
  where length(trim(skill_name)) > 0;

-- -----------------------------------------------------------------------------
-- Source: 20260529120000_company_ads_structured_fields.sql
-- -----------------------------------------------------------------------------

-- Structured fields for company/service ads (Firmy builder upgrade).

-- Drop old status check and replace with expanded lifecycle.
alter table public.company_ads
  drop constraint if exists company_ads_status_check;

alter table public.company_ads
  add column if not exists profile_type text not null default 'company',
  add column if not exists tagline text,
  add column if not exists region text,
  add column if not exists city text,
  add column if not exists street_address text,
  add column if not exists postal_code text,
  add column if not exists show_exact_address boolean not null default false,
  add column if not exists price_type text default 'negotiable',
  add column if not exists price_min numeric,
  add column if not exists price_max numeric,
  add column if not exists price_negotiable boolean not null default false,
  add column if not exists price_note text,
  add column if not exists availability text,
  add column if not exists works_weekends boolean not null default false,
  add column if not exists evening_hours boolean not null default false,
  add column if not exists emergency_service boolean not null default false,
  add column if not exists contact_person text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists website text,
  add column if not exists preferred_contact_method text not null default 'platform',
  add column if not exists show_phone_publicly boolean not null default false,
  add column if not exists show_email_publicly boolean not null default false,
  add column if not exists ico text,
  add column if not exists dic text,
  add column if not exists ic_dph text,
  add column if not exists founded_year int,
  add column if not exists employee_count text,
  add column if not exists duration_months int,
  add column if not exists services text[] not null default '{}'::text[],
  add column if not exists specializations text[] not null default '{}'::text[],
  add column if not exists certifications text[] not null default '{}'::text[],
  add column if not exists service_areas text[] not null default '{}'::text[],
  add column if not exists custom_service_areas text[] not null default '{}'::text[],
  add column if not exists gallery_items jsonb not null default '[]'::jsonb;

alter table public.company_ads
  add constraint company_ads_status_check
  check (status in ('draft', 'active', 'paused', 'archived', 'expired'));

alter table public.company_ads
  drop constraint if exists company_ads_profile_type_check;

alter table public.company_ads
  add constraint company_ads_profile_type_check
  check (profile_type in ('company', 'sole_trader', 'freelancer'));

alter table public.company_ads
  drop constraint if exists company_ads_price_type_check;

alter table public.company_ads
  add constraint company_ads_price_type_check
  check (
    price_type is null
    or price_type in ('hourly', 'per_sqm', 'per_project', 'per_unit', 'negotiable', 'hidden')
  );

alter table public.company_ads
  drop constraint if exists company_ads_availability_check;

alter table public.company_ads
  add constraint company_ads_availability_check
  check (
    availability is null
    or availability in ('immediate', '7d', '14d', '30d', 'by_agreement', 'busy')
  );

alter table public.company_ads
  drop constraint if exists company_ads_preferred_contact_method_check;

alter table public.company_ads
  add constraint company_ads_preferred_contact_method_check
  check (
    preferred_contact_method in ('platform', 'phone', 'email', 'website')
  );

alter table public.company_ads
  drop constraint if exists company_ads_employee_count_check;

alter table public.company_ads
  add constraint company_ads_employee_count_check
  check (
    employee_count is null
    or employee_count in ('1', '2-5', '6-10', '11-50', '51-200', '200+')
  );

alter table public.company_ads
  drop constraint if exists company_ads_title_length_check;

alter table public.company_ads
  add constraint company_ads_title_length_check
  check (char_length(title) <= 120);

comment on column public.company_ads.profile_type is 'company | sole_trader | freelancer';
comment on column public.company_ads.services is 'Offered services (tags) for search and cards.';
comment on column public.company_ads.service_areas is 'local_city | region | slovakia | online | custom';
comment on column public.company_ads.gallery_items is 'Portfolio images: [{url, caption?}].';

create index if not exists idx_company_ads_region on public.company_ads (region);
create index if not exists idx_company_ads_city on public.company_ads (city);
create index if not exists idx_company_ads_price_type on public.company_ads (price_type);
create index if not exists idx_company_ads_availability on public.company_ads (availability);
create index if not exists idx_company_ads_profile_type on public.company_ads (profile_type);
create index if not exists idx_company_ads_services_gin on public.company_ads using gin (services);
create index if not exists idx_company_ads_service_areas_gin on public.company_ads using gin (service_areas);

-- -----------------------------------------------------------------------------
-- Source: 20260529120000_job_email_alerts_radius_categories_work_modes.sql
-- -----------------------------------------------------------------------------

-- Job email alerts: radius (metadata + matching hints), multi work mode, multi category.

alter table public.job_email_alerts
  add column if not exists radius_km int,
  add column if not exists work_modes text[] not null default '{}'::text[],
  add column if not exists categories text[] not null default '{}'::text[];

alter table public.job_email_alerts
  drop constraint if exists job_email_alerts_radius_km_check;

alter table public.job_email_alerts
  add constraint job_email_alerts_radius_km_check
  check (radius_km is null or radius_km in (0, 10, 25, 50, 100));

alter table public.job_email_alerts
  drop constraint if exists job_email_alerts_work_modes_subset_check;

alter table public.job_email_alerts
  add constraint job_email_alerts_work_modes_subset_check
  check (
    cardinality(work_modes) = 0
    or work_modes <@ array['on_site', 'hybrid', 'remote']::text[]
  );

comment on column public.job_email_alerts.radius_km is
  'Search radius from location: 0 exact city, 10/25/50/100 km, null = whole Slovakia (no location filter).';
comment on column public.job_email_alerts.work_modes is
  'Match jobs whose work_mode is any of these (OR). Empty = any.';
comment on column public.job_email_alerts.categories is
  'Match jobs in any of these categories (OR). Empty falls back to legacy category column.';

update public.job_email_alerts
set work_modes = array[work_mode]::text[]
where cardinality(work_modes) = 0
  and work_mode is not null
  and trim(work_mode) <> '';

update public.job_email_alerts
set categories = array[trim(category)]::text[]
where cardinality(categories) = 0
  and category is not null
  and trim(category) <> ''
  and trim(category) <> 'all';

-- -----------------------------------------------------------------------------
-- Source: 20260529180000_blog_posts.sql
-- -----------------------------------------------------------------------------

-- Marketing blog posts (public catalog; Nest service_role only for DML).

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  excerpt text,
  body_html text not null default '',
  cover_image_url text,
  category text not null default 'tipy'
    check (category in ('tipy', 'kariera', 'brigady', 'firmy', 'novinky')),
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  published_at timestamptz,
  reading_time_minutes int
    check (reading_time_minutes is null or (reading_time_minutes >= 1 and reading_time_minutes <= 120)),
  author_name text not null,
  author_role text,
  author_bio text,
  author_avatar_color text,
  tags text[] not null default '{}',
  seo_title text,
  seo_description text,
  is_featured boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_slug_unique unique (slug)
);

create index if not exists idx_blog_posts_published_list
  on public.blog_posts (published_at desc, id desc)
  where status = 'published';

create index if not exists idx_blog_posts_category_published
  on public.blog_posts (category, published_at desc, id desc)
  where status = 'published';

create index if not exists idx_blog_posts_featured
  on public.blog_posts (is_featured, published_at desc)
  where status = 'published' and is_featured = true;

comment on table public.blog_posts is 'Marketing blog; public read via Nest GET /api/blog; admin CRUD via jobbie-admin API.';
comment on column public.blog_posts.body_html is 'Sanitized HTML from Nest/admin before persist.';
comment on column public.blog_posts.published_at is 'Set when status becomes published; used for list ordering.';

alter table public.blog_posts enable row level security;

-- No policies for anon/authenticated — reads/writes via service_role (Nest) only.

grant select, insert, update, delete on table public.blog_posts to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260529190000_blog_posts_relax_author_fields.sql
-- -----------------------------------------------------------------------------

-- Deprecate blog author/excerpt/tags in admin UI; keep columns for legacy rows.

alter table public.blog_posts
  alter column author_name drop not null;

alter table public.blog_posts
  alter column author_name set default 'Redakcia Jobbie';

alter table public.blog_posts
  alter column tags set default '{}';

comment on column public.blog_posts.author_name is 'Legacy; optional. Public site no longer surfaces author block.';
comment on column public.blog_posts.excerpt is 'Legacy; optional. List cards use title only.';
comment on column public.blog_posts.tags is 'Legacy; optional. Not shown on public blog.';

-- -----------------------------------------------------------------------------
-- Source: 20260529190100_blog_covers_storage_bucket.sql
-- -----------------------------------------------------------------------------

-- Blog cover images (public read; writes via jobbie-admin API service_role only).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-covers',
  'blog-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "blog-covers: public read" on storage.objects;
create policy "blog-covers: public read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'blog-covers');

-- No authenticated insert/update — Nest admin API uses service_role signed uploads.

-- -----------------------------------------------------------------------------
-- Source: 20260529190200_blog_content_storage_bucket.sql
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Source: 20260530110000_content_reports_and_account_status.sql
-- -----------------------------------------------------------------------------

-- content_reports + profiles.account_status must exist before admin analytics SQL RPCs
-- (20260530120000_admin_analytics_extended.sql validates column/table refs at CREATE time).

alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'closed'));

comment on column public.profiles.account_status is
  'active | suspended (admin) | closed (self-delete or admin).';

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in (
    'job_offer', 'company_profile', 'banner_ad', 'company_review', 'chat_message'
  )),
  target_id text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  resolution_code text,
  claimed_at timestamptz,
  claimed_by uuid references public.profiles (id) on delete set null
);

create index if not exists idx_content_reports_status
  on public.content_reports (status, created_at desc);

create index if not exists idx_content_reports_open_oldest
  on public.content_reports (created_at asc)
  where status = 'open';

alter table public.content_reports enable row level security;

drop policy if exists "deny all content_reports" on public.content_reports;
create policy "deny all content_reports"
  on public.content_reports for all using (false) with check (false);

grant select, insert, update on public.content_reports to service_role;

comment on column public.content_reports.resolution_code is
  'spam | harassment | duplicate | false_report | other — set when dismissed/reviewed';

-- -----------------------------------------------------------------------------
-- Source: 20260530120000_admin_analytics_extended.sql
-- -----------------------------------------------------------------------------

-- Extended admin analytics RPCs (service_role only). Europe/Bratislava for daily buckets.

-- Search aggregates for admin dashboard (jobs entity)
create or replace function public.search_analytics_summary(p_since timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_searches',
      (select count(*)::bigint from search_query_logs s
       where s.created_at >= p_since and s.entity = 'jobs'),
    'zero_result_searches',
      (select count(*)::bigint from search_query_logs s
       where s.created_at >= p_since and s.entity = 'jobs' and s.result_count = 0),
    'zero_result_rate',
      case
        when (select count(*) from search_query_logs s
              where s.created_at >= p_since and s.entity = 'jobs') > 0
        then round(
          (select count(*)::numeric from search_query_logs s
           where s.created_at >= p_since and s.entity = 'jobs' and s.result_count = 0)
          / (select count(*)::numeric from search_query_logs s
             where s.created_at >= p_since and s.entity = 'jobs'),
          4
        )
        else null
      end
  );
$$;

-- Daily timeseries (UTC calendar days)
create or replace function public.admin_analytics_timeseries_daily(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select d::date as day
    from generate_series(
      date_trunc('day', p_from at time zone 'UTC'),
      date_trunc('day', p_to at time zone 'UTC'),
      interval '1 day'
    ) d
  ),
  signups as (
    select date_trunc('day', p.created_at at time zone 'UTC')::date as day, count(*)::bigint as n
    from profiles p
    where p.created_at >= p_from and p.created_at <= p_to and not p.is_deleted
    group by 1
  ),
  applications_daily as (
    select date_trunc('day', a.created_at at time zone 'UTC')::date as day, count(*)::bigint as n
    from public.applications a
    where a.created_at >= p_from and a.created_at <= p_to and not a.is_deleted
    group by 1
  ),
  hires_daily as (
    select date_trunc('day', a.created_at at time zone 'UTC')::date as day, count(*)::bigint as n
    from public.applications a
    where not a.is_deleted
      and a.status = 'accepted'
      and a.created_at >= p_from
      and a.created_at <= p_to
    group by 1
  ),
  credit_purchases as (
    select date_trunc('day', cl.created_at at time zone 'UTC')::date as day,
      count(distinct cl.user_id)::bigint as n
    from credit_ledger cl
    where cl.created_at >= p_from and cl.created_at <= p_to
      and cl.delta > 0
      and (
        cl.reason = 'credit_package_purchase'
        or cl.reason = 'stripe_payment_intent'
        or cl.transaction_type = 'purchase'
      )
    group by 1
  ),
  jobs_published as (
    select date_trunc('day', j.created_at at time zone 'UTC')::date as day, count(*)::bigint as n
    from job_offers j
    where j.created_at >= p_from and j.created_at <= p_to
      and not j.is_deleted and j.is_active
    group by 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'day', to_char(days.day, 'YYYY-MM-DD'),
        'signups', coalesce(s.n, 0),
        'applications', coalesce(ap.n, 0),
        'accepted_hires', coalesce(h.n, 0),
        'credit_purchases_distinct_users', coalesce(cp.n, 0),
        'jobs_published', coalesce(jp.n, 0)
      )
      order by days.day
    ),
    '[]'::jsonb
  )
  from days
  left join signups s on s.day = days.day
  left join applications_daily ap on ap.day = days.day
  left join hires_daily h on h.day = days.day
  left join credit_purchases cp on cp.day = days.day
  left join jobs_published jp on jp.day = days.day;
$$;

create or replace function public.admin_analytics_marketplace_snapshot(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'jobs_published_in_period',
      (select count(*)::bigint from job_offers j
       where not j.is_deleted and j.is_active
         and j.created_at >= p_from and j.created_at <= p_to),
    'active_jobs_now',
      (select count(*)::bigint from job_offers j
       where not j.is_deleted and j.is_active),
    'company_ads_published_in_period',
      (select count(*)::bigint from company_ads ca
       where ca.status = 'active'
         and ca.created_at >= p_from and ca.created_at <= p_to),
    'active_company_ads_now',
      (select count(*)::bigint from company_ads ca
       where ca.status = 'active' and ca.ends_at is not null and ca.ends_at > now()),
    'cvs_visible_to_employers_now',
      (select count(*)::bigint from cvs c where c.visible_to_employers = true),
    'blog_posts_published_in_period',
      (select count(*)::bigint from blog_posts bp
       where bp.status = 'published'
         and bp.published_at >= p_from and bp.published_at <= p_to),
    'blog_posts_published_now',
      (select count(*)::bigint from blog_posts bp where bp.status = 'published'),
    'chat_messages_in_period',
      (select count(*)::bigint from chat_messages cm
       where cm.created_at >= p_from and cm.created_at <= p_to),
    'content_reports_open_now',
      (select count(*)::bigint from content_reports cr where cr.status = 'open'),
    'content_reports_opened_in_period',
      (select count(*)::bigint from content_reports cr
       where cr.created_at >= p_from and cr.created_at <= p_to and cr.status = 'open')
  );
$$;

create or replace function public.admin_analytics_users_breakdown(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'signups_company',
      (select count(*)::bigint from profiles p
       where p.created_at >= p_from and p.created_at <= p_to
         and not p.is_deleted and p.role = 'company'),
    'signups_individual',
      (select count(*)::bigint from profiles p
       where p.created_at >= p_from and p.created_at <= p_to
         and not p.is_deleted and p.role = 'individual'),
    'active_users_distinct',
      (select count(distinct l.user_id)::bigint from api_request_logs l
       where l.occurred_at >= p_from and l.occurred_at <= p_to
         and l.user_id is not null),
    'suspended_accounts_now',
      (select count(*)::bigint from profiles p
       where p.account_status = 'suspended' and not p.is_deleted),
    'closed_accounts_now',
      (select count(*)::bigint from profiles p
       where p.account_status = 'closed' and not p.is_deleted)
  );
$$;

create or replace function public.admin_analytics_revenue_period(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'credit_pack_purchases_count',
      (select count(*)::bigint from stripe_credit_fulfillments scf
       where scf.created_at >= p_from and scf.created_at <= p_to),
    'credit_pack_credits_sold',
      (select coalesce(sum(scf.credits), 0)::bigint from stripe_credit_fulfillments scf
       where scf.created_at >= p_from and scf.created_at <= p_to),
    'new_subscriptions_in_period',
      (select count(*)::bigint from user_subscriptions us
       where us.created_at >= p_from and us.created_at <= p_to),
    'subscription_canceled_in_period',
      (select count(*)::bigint from user_subscriptions us
       where us.status = 'canceled'
         and us.updated_at >= p_from and us.updated_at <= p_to)
  );
$$;

-- Searches per day for chart
create or replace function public.search_analytics_daily(p_since timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'day', to_char(d.day, 'YYYY-MM-DD'),
          'searches', d.searches,
          'zero_results', d.zero_results
        )
        order by d.day
      )
      from (
        select
          date_trunc('day', s.created_at at time zone 'UTC')::date as day,
          count(*)::bigint as searches,
          count(*) filter (where s.result_count = 0)::bigint as zero_results
        from search_query_logs s
        where s.created_at >= p_since and s.entity = 'jobs'
        group by 1
      ) d
    ),
    '[]'::jsonb
  );
$$;

revoke all on function public.search_analytics_summary(timestamptz) from public;
revoke all on function public.admin_analytics_timeseries_daily(timestamptz, timestamptz) from public;
revoke all on function public.admin_analytics_marketplace_snapshot(timestamptz, timestamptz) from public;
revoke all on function public.admin_analytics_users_breakdown(timestamptz, timestamptz) from public;
revoke all on function public.admin_analytics_revenue_period(timestamptz, timestamptz) from public;
revoke all on function public.search_analytics_daily(timestamptz) from public;

grant execute on function public.search_analytics_summary(timestamptz) to service_role;
grant execute on function public.admin_analytics_timeseries_daily(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_analytics_marketplace_snapshot(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_analytics_users_breakdown(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_analytics_revenue_period(timestamptz, timestamptz) to service_role;
grant execute on function public.search_analytics_daily(timestamptz) to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260530120100_admin_analytics_funnel_hires_timestamp.sql
-- -----------------------------------------------------------------------------

-- Hire metrics: applications with status accepted and created_at in range.
-- (Accurate accept-date needs application_status_history from 20260522100000.)

create or replace function public.admin_analytics_funnel(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_signups bigint;
  v_credit_users bigint;
  v_apply_users bigint;
  v_hire_users bigint;
begin
  select count(*)::bigint into v_signups
  from profiles p
  where p.created_at >= p_from and p.created_at <= p_to and not p.is_deleted;

  select count(distinct cl.user_id)::bigint into v_credit_users
  from credit_ledger cl
  where cl.created_at >= p_from and cl.created_at <= p_to
    and cl.delta > 0
    and (
      cl.reason = 'credit_package_purchase'
      or cl.reason = 'stripe_payment_intent'
      or cl.transaction_type = 'purchase'
    );

  select count(distinct a.individual_id)::bigint into v_apply_users
  from applications a
  where a.created_at >= p_from and a.created_at <= p_to
    and not a.is_deleted;

  select count(distinct a.individual_id)::bigint into v_hire_users
  from applications a
  where not a.is_deleted
    and a.status = 'accepted'
    and a.created_at >= p_from
    and a.created_at <= p_to;

  return jsonb_build_object(
    'signups', v_signups,
    'credit_purchases_distinct_users', v_credit_users,
    'applicants_distinct', v_apply_users,
    'hires_distinct', v_hire_users,
    'conversion_signup_to_credit',
      case when v_signups > 0 then round(v_credit_users::numeric / v_signups, 6) else null end,
    'conversion_signup_to_apply',
      case when v_signups > 0 then round(v_apply_users::numeric / v_signups, 6) else null end,
    'conversion_apply_to_hire',
      case when v_apply_users > 0 then round(v_hire_users::numeric / v_apply_users, 6) else null end
  );
end;
$$;

revoke all on function public.admin_analytics_funnel(timestamptz, timestamptz) from public;
grant execute on function public.admin_analytics_funnel(timestamptz, timestamptz) to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260530120300_search_query_logs_service_role_grants.sql
-- -----------------------------------------------------------------------------

-- Nest (service_role) must INSERT search_query_logs; RLS denies clients but grants were missing.

grant select, insert on public.search_query_logs to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260530140000_pricing_catalog_cleanup.sql
-- -----------------------------------------------------------------------------

-- Pricing catalog cleanup: deactivate agentura tiers, CV DB monthly quotas, usage tracking.
-- credit_packs agentura deactivation: 20260620120000_billing_cennik.sql (table created there).

-- ---------------------------------------------------------------------------
-- subscription_plans: public catalog flag + CV monthly limits
-- ---------------------------------------------------------------------------
alter table public.subscription_plans
  add column if not exists active boolean not null default true;

alter table public.subscription_plans
  add column if not exists max_cv_unlocks_monthly integer;

alter table public.subscription_plans
  add column if not exists max_cv_contacts_monthly integer;

alter table public.subscription_plans
  add column if not exists max_cv_pdf_downloads_monthly integer;

comment on column public.subscription_plans.active is
  'When false, plan is hidden from public pricing/checkout (existing subscribers may retain plan_id).';

comment on column public.subscription_plans.max_cv_unlocks_monthly is
  'Included unlocks per calendar month on free tier; NULL = unlimited included (paid plans).';

update public.subscription_plans set
  max_cv_unlocks_monthly = 10,
  max_cv_contacts_monthly = 5,
  max_cv_pdf_downloads_monthly = 5
where slug = 'zadarmo';

-- start/plus/pro limits + agentura deactivation: after slug renames in billing_cennik.

-- ---------------------------------------------------------------------------
-- employer_cv_monthly_usage (service_role only)
-- ---------------------------------------------------------------------------
create table if not exists public.employer_cv_monthly_usage (
  company_id uuid not null references public.profiles (id) on delete cascade,
  period_month date not null,
  unlocks_count integer not null default 0 check (unlocks_count >= 0),
  contacts_count integer not null default 0 check (contacts_count >= 0),
  pdf_downloads_count integer not null default 0 check (pdf_downloads_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, period_month)
);

create index if not exists idx_employer_cv_monthly_usage_period
  on public.employer_cv_monthly_usage (period_month);

drop trigger if exists employer_cv_monthly_usage_updated_at on public.employer_cv_monthly_usage;
create trigger employer_cv_monthly_usage_updated_at
  before update on public.employer_cv_monthly_usage
  for each row execute function public.set_updated_at();

alter table public.employer_cv_monthly_usage enable row level security;

drop policy if exists "deny all employer_cv_monthly_usage" on public.employer_cv_monthly_usage;
create policy "deny all employer_cv_monthly_usage"
  on public.employer_cv_monthly_usage for all using (false) with check (false);

revoke all on public.employer_cv_monthly_usage from anon, authenticated;
grant select, insert, update, delete on public.employer_cv_monthly_usage to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260530150000_sk_cv_skill_catalog.sql
-- -----------------------------------------------------------------------------

-- Shared CV skill names for autocomplete (search + user write-through via ensure_sk_cv_skill).

create table if not exists public.sk_cv_skills (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz not null default now(),
  constraint sk_cv_skills_name_len check (
    char_length(trim(name)) >= 2 and char_length(name) <= 200
  )
);

comment on table public.sk_cv_skills is
  'Catalog of CV skill/znalosť labels for autocomplete; extended when users enter custom names.';

create unique index if not exists sk_cv_skills_name_norm_uidx
  on public.sk_cv_skills ((public.jobbie_unaccent(lower(trim(name)))));

create index if not exists idx_sk_cv_skills_name_unaccent_trgm
  on public.sk_cv_skills
  using gin (public.jobbie_unaccent(name) gin_trgm_ops);

alter table public.sk_cv_skills enable row level security;

create policy sk_cv_skills_select_authenticated
  on public.sk_cv_skills
  for select
  to authenticated
  using (true);

create policy sk_cv_skills_select_anon
  on public.sk_cv_skills
  for select
  to anon
  using (true);

grant select on public.sk_cv_skills to anon, authenticated, service_role;

create or replace function public.search_sk_cv_skills(p_query text, p_limit int)
returns table (id bigint, name text)
language sql
stable
parallel safe
as $$
  select s.id, s.name
  from public.sk_cv_skills s
  where length(trim(coalesce(p_query, ''))) >= 2
    and public.jobbie_unaccent(s.name) ilike '%' || public.jobbie_unaccent(trim(p_query)) || '%'
  order by
    case
      when public.jobbie_unaccent(s.name) ilike public.jobbie_unaccent(trim(p_query)) || '%' then 0
      else 1
    end,
    s.name
  limit least(greatest(coalesce(p_limit, 50), 1), 80);
$$;

comment on function public.search_sk_cv_skills(text, int) is
  'Accent-insensitive skill name search for CV znalosti picker.';

grant execute on function public.search_sk_cv_skills(text, int) to anon, authenticated, service_role;

create or replace function public.ensure_sk_cv_skill(p_name text)
returns table (id bigint, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_norm text;
  v_id bigint;
  v_out_name text;
begin
  if char_length(v_name) < 2 then
    raise exception 'cv_skill_name_too_short' using errcode = '22023';
  end if;
  if char_length(v_name) > 200 then
    raise exception 'cv_skill_name_too_long' using errcode = '22023';
  end if;

  v_norm := public.jobbie_unaccent(lower(v_name));

  select s.id, s.name
  into v_id, v_out_name
  from public.sk_cv_skills s
  where public.jobbie_unaccent(lower(trim(s.name))) = v_norm
  order by s.id
  limit 1;

  if v_id is not null then
    return query select v_id, v_out_name;
    return;
  end if;

  begin
    insert into public.sk_cv_skills (name)
    values (v_name);
  exception
    when unique_violation then
      null;
  end;

  return query
  select s.id, s.name
  from public.sk_cv_skills s
  where public.jobbie_unaccent(lower(trim(s.name))) = v_norm
  order by s.id
  limit 1;
end;
$$;

comment on function public.ensure_sk_cv_skill(text) is
  'Return existing catalog skill by normalized name, or insert for reuse by others.';

revoke all on function public.ensure_sk_cv_skill(text) from public;
grant execute on function public.ensure_sk_cv_skill(text) to service_role;

-- Seed starter labels + backfill distinct names already used on CVs (non-draft).
insert into public.sk_cv_skills (name)
values
  ('Excel'),
  ('Microsoft Word'),
  ('Microsoft PowerPoint'),
  ('Komunikácia'),
  ('Angličtina'),
  ('Vedenie vozidla'),
  ('AutoCAD'),
  ('Python'),
  ('SQL'),
  ('Projektové riadenie')
on conflict ((public.jobbie_unaccent(lower(trim(name))))) do nothing;

insert into public.sk_cv_skills (name)
select distinct trim(cs.skill_name)
from public.cv_skills cs
where length(trim(cs.skill_name)) >= 2
  and trim(cs.skill_name) not like '__jb_draft:%'
on conflict ((public.jobbie_unaccent(lower(trim(name))))) do nothing;

-- -----------------------------------------------------------------------------
-- Source: 20260530150100_ensure_sk_cv_skill_fix.sql
-- -----------------------------------------------------------------------------

-- Fix ensure_sk_cv_skill: reliable insert when name not yet in catalog (FOUND after RETURN QUERY was unreliable).

create or replace function public.ensure_sk_cv_skill(p_name text)
returns table (id bigint, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_norm text;
  v_id bigint;
  v_out_name text;
begin
  if char_length(v_name) < 2 then
    raise exception 'cv_skill_name_too_short' using errcode = '22023';
  end if;
  if char_length(v_name) > 200 then
    raise exception 'cv_skill_name_too_long' using errcode = '22023';
  end if;

  v_norm := public.jobbie_unaccent(lower(v_name));

  select s.id, s.name
  into v_id, v_out_name
  from public.sk_cv_skills s
  where public.jobbie_unaccent(lower(trim(s.name))) = v_norm
  order by s.id
  limit 1;

  if v_id is not null then
    return query select v_id, v_out_name;
    return;
  end if;

  begin
    insert into public.sk_cv_skills (name)
    values (v_name);
  exception
    when unique_violation then
      null;
  end;

  return query
  select s.id, s.name
  from public.sk_cv_skills s
  where public.jobbie_unaccent(lower(trim(s.name))) = v_norm
  order by s.id
  limit 1;
end;
$$;

-- -----------------------------------------------------------------------------
-- Source: 20260530150200_ensure_sk_cv_skill_insert_fix.sql
-- -----------------------------------------------------------------------------

-- Reliable insert for custom CV skill catalog names (expression ON CONFLICT was brittle).

create or replace function public.ensure_sk_cv_skill(p_name text)
returns table (id bigint, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_norm text;
  v_id bigint;
  v_out_name text;
begin
  if char_length(v_name) < 2 then
    raise exception 'cv_skill_name_too_short' using errcode = '22023';
  end if;
  if char_length(v_name) > 200 then
    raise exception 'cv_skill_name_too_long' using errcode = '22023';
  end if;

  v_norm := public.jobbie_unaccent(lower(v_name));

  select s.id, s.name
  into v_id, v_out_name
  from public.sk_cv_skills s
  where public.jobbie_unaccent(lower(trim(s.name))) = v_norm
  order by s.id
  limit 1;

  if v_id is not null then
    return query select v_id, v_out_name;
    return;
  end if;

  begin
    insert into public.sk_cv_skills (name)
    values (v_name);
  exception
    when unique_violation then
      null;
  end;

  return query
  select s.id, s.name
  from public.sk_cv_skills s
  where public.jobbie_unaccent(lower(trim(s.name))) = v_norm
  order by s.id
  limit 1;
end;
$$;

-- -----------------------------------------------------------------------------
-- Source: 20260530160000_job_impressions_dedupe_and_unique.sql
-- -----------------------------------------------------------------------------

-- Cap job_impressions disk: one row per (user_id, job_id), service_role writes only.

-- 1) Dedupe: keep latest shown_at per user/job (tie-break by id).
delete from public.job_impressions ji
where exists (
  select 1
  from public.job_impressions newer
  where newer.user_id = ji.user_id
    and newer.job_id = ji.job_id
    and (
      newer.shown_at > ji.shown_at
      or (newer.shown_at = ji.shown_at and newer.id > ji.id)
    )
);

-- 2) Drop unused column.
alter table public.job_impressions drop column if exists list_session_id;

-- 3) Unique key for upsert.
alter table public.job_impressions
  add constraint job_impressions_user_job_unique unique (user_id, job_id);

-- 4) Employer stats: filter by job_id + shown_at range.
create index if not exists idx_job_impressions_job_id_shown_at
  on public.job_impressions (job_id, shown_at desc);

-- 5) Nest service_role only (clients use POST /api/jobs/impressions).
revoke insert, update, delete on public.job_impressions from anon;
revoke insert, update, delete on public.job_impressions from authenticated;

grant select, insert, update, delete on public.job_impressions to service_role;

-- Retention cron deletes old search analytics rows.
grant delete on public.search_query_logs to service_role;

comment on table public.job_impressions is
  'One row per (user_id, job_id): last list impression time. Purged after ENGAGEMENT_RETENTION_DAYS.';

-- -----------------------------------------------------------------------------
-- Source: 20260530170000_content_reports_sla.sql
-- -----------------------------------------------------------------------------

-- Moderation SLA: claim, resolution, handler tracking (admin API service_role only).
-- Base table + SLA columns: 20260530110000_content_reports_and_account_status.sql

alter table public.content_reports
  add column if not exists handled_by uuid references public.profiles (id) on delete set null,
  add column if not exists handled_at timestamptz,
  add column if not exists resolution_code text,
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_by uuid references public.profiles (id) on delete set null;

comment on column public.content_reports.resolution_code is
  'spam | harassment | duplicate | false_report | other — set when dismissed/reviewed';

create index if not exists idx_content_reports_open_oldest
  on public.content_reports (created_at asc)
  where status = 'open';

-- -----------------------------------------------------------------------------
-- Source: 20260530170100_profiles_admin_role.sql
-- -----------------------------------------------------------------------------

-- Desktop admin RBAC: null = legacy super_admin for app_role=admin.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type public.admin_role as enum ('super_admin', 'moderator', 'analyst');
  end if;
end $$;

alter table public.profiles
  add column if not exists admin_role public.admin_role;

comment on column public.profiles.admin_role is
  'Desktop admin scope: analyst (read), moderator (+moderation), super_admin (all). Null + app_role=admin => super_admin.';

-- -----------------------------------------------------------------------------
-- Source: 20260531120000_subscription_pricing_cv_quotas.sql
-- -----------------------------------------------------------------------------

-- Subscription pricing: zadarmo monthly credits; CV DB quotas per paid tier.

update public.subscription_plans set
  monthly_credits = 5,
  updated_at = now()
where slug = 'zadarmo';

update public.subscription_plans set
  max_cv_unlocks_monthly = 50,
  max_cv_contacts_monthly = 25,
  max_cv_pdf_downloads_monthly = 25,
  updated_at = now()
where slug = 'start';

update public.subscription_plans set
  max_cv_unlocks_monthly = 75,
  max_cv_contacts_monthly = 50,
  max_cv_pdf_downloads_monthly = 50,
  updated_at = now()
where slug = 'plus';

update public.subscription_plans set
  max_cv_unlocks_monthly = null,
  max_cv_contacts_monthly = null,
  max_cv_pdf_downloads_monthly = null,
  updated_at = now()
where slug = 'pro';

-- -----------------------------------------------------------------------------
-- Source: 20260531180000_user_subscriptions_cancel_at_period_end.sql
-- -----------------------------------------------------------------------------

-- Track scheduled subscription cancellation (Stripe cancel_at_period_end).
alter table public.user_subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;

-- -----------------------------------------------------------------------------
-- Source: 20260531190000_blog_posts_backfill_cover_excerpt.sql
-- -----------------------------------------------------------------------------

-- Backfill blog cover from first inline storage image when cover was never persisted.

update public.blog_posts bp
set cover_image_url = sub.src
from (
  select
    id,
    (regexp_match(
      body_html,
      'src="(https://[^"]+/storage/v1/object/public/(?:blog-content|blog-covers)/[^"]+)"'
    ))[1] as src
  from public.blog_posts
  where cover_image_url is null
    and body_html ~ 'storage/v1/object/public/(blog-content|blog-covers)/'
) sub
where bp.id = sub.id
  and sub.src is not null;

-- Backfill excerpt from plain body text when perex was left empty.

update public.blog_posts
set excerpt = trim(left(
  regexp_replace(
    regexp_replace(body_html, '<[^>]+>', ' ', 'g'),
    '\s+',
    ' ',
    'g'
  ),
  280
))
where (excerpt is null or btrim(excerpt) = '')
  and btrim(regexp_replace(regexp_replace(body_html, '<[^>]+>', ' ', 'g'), '\s+', ' ', 'g')) <> '';

comment on column public.blog_posts.excerpt is 'Perex for cards and post header; auto-derived from SEO/body on save when empty.';

-- -----------------------------------------------------------------------------
-- Source: 20260531200000_job_offers_foreign_and_turnus.sql
-- -----------------------------------------------------------------------------

-- Foreign job listings + turnus employment type + search filter.

alter table public.job_offers
  add column if not exists is_foreign boolean not null default false;

comment on column public.job_offers.is_foreign is
  'When true, job appears on zahraničné pracovné ponuky catalog only.';

create index if not exists idx_job_offers_active_foreign_created
  on public.job_offers (created_at desc)
  where is_deleted = false
    and is_active = true
    and coalesce(is_draft, false) = false
    and is_foreign = true;

create index if not exists idx_job_offers_active_domestic_created
  on public.job_offers (created_at desc)
  where is_deleted = false
    and is_active = true
    and coalesce(is_draft, false) = false
    and is_foreign = false;

alter table public.job_offers
  add column if not exists employment_types text[] not null default '{}'::text[];

alter table public.job_offers
  drop constraint if exists job_offers_employment_types_subset_check;

alter table public.job_offers
  add constraint job_offers_employment_types_subset_check
  check (
    cardinality(employment_types) = 0
    or employment_types <@ array[
      'full_time',
      'part_time',
      'brigada',
      'zivnost',
      'internship',
      'agreement',
      'student_agreement',
      'home_work',
      'volunteer',
      'one_off',
      'turnus'
    ]::text[]
  );

drop function if exists public.search_jobs_hybrid(
  text,
  text,
  text,
  text,
  boolean,
  int,
  int,
  numeric,
  numeric,
  timestamptz,
  text
);

create or replace function public.search_jobs_hybrid(
  p_q text default '',
  p_category text default null,
  p_job_type text default null,
  p_location text default null,
  p_urgent_only boolean default false,
  p_limit int default 20,
  p_offset int default 0,
  p_min_compensation numeric default null,
  p_max_compensation numeric default null,
  p_created_after timestamptz default null,
  p_skills text default null,
  p_is_foreign boolean default null
)
returns setof public.job_offers
language sql
stable
as $$
  with base as (
    select j.*
    from public.job_offers j
    where j.is_deleted = false
      and j.is_active = true
      and coalesce(j.is_draft, false) = false
      and (p_is_foreign is null or j.is_foreign = p_is_foreign)
      and (
        p_category is null
        or trim(p_category) = ''
        or j.category = any (
          select trim(x)
          from unnest(string_to_array(p_category, ',')) as x
          where trim(x) <> ''
        )
      )
      and (
        p_job_type is null
        or trim(p_job_type) = ''
        or j.job_type = p_job_type
        or p_job_type = any (j.employment_types)
      )
      and (not p_urgent_only or j.is_urgent = true)
      and (
        p_location is null
        or trim(p_location) = ''
        or public.jobbie_unaccent(coalesce(j.location, '')) ilike '%' || public.jobbie_unaccent(trim(p_location)) || '%'
        or public.jobbie_unaccent(coalesce(j.location_address, '')) ilike '%' || public.jobbie_unaccent(trim(p_location)) || '%'
      )
      and (
        p_min_compensation is null
        or (
          j.compensation_amount is not null
          and j.compensation_amount >= p_min_compensation
        )
      )
      and (
        p_max_compensation is null
        or (
          j.compensation_amount is not null
          and j.compensation_amount <= p_max_compensation
        )
      )
      and (p_created_after is null or j.created_at >= p_created_after)
      and (
        p_skills is null
        or trim(p_skills) = ''
        or exists (
          select 1
          from unnest(string_to_array(p_skills, ',')) as tok(raw)
          where trim(raw) <> ''
            and (
              public.jobbie_unaccent(coalesce(j.requirements, '')) ilike '%'
                || public.jobbie_unaccent(trim(raw)) || '%'
              or public.jobbie_unaccent(coalesce(j.description, '')) ilike '%'
                || public.jobbie_unaccent(trim(raw)) || '%'
            )
        )
      )
  ),
  ranked as (
    select
      b.*,
      case
        when trim(coalesce(p_q, '')) = '' then 0::float
        else ts_rank_cd(
          to_tsvector(
            'simple',
            public.jobbie_unaccent(
              coalesce(b.title, '') || ' ' ||
              coalesce(b.description, '') || ' ' ||
              coalesce(b.location, '') || ' ' ||
              coalesce(b.location_address, '')
            )
          ),
          websearch_to_tsquery('simple', public.jobbie_unaccent(trim(p_q)))
        )
      end as fts_score,
      case
        when trim(coalesce(p_q, '')) = '' then 0::float
        else greatest(
          similarity(public.jobbie_unaccent(coalesce(b.title, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.description, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.location, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.location_address, '')), public.jobbie_unaccent(trim(p_q)))
        )
      end as trigram_score
    from base b
    where
      trim(coalesce(p_q, '')) = ''
      or to_tsvector(
            'simple',
            public.jobbie_unaccent(
              coalesce(b.title, '') || ' ' ||
              coalesce(b.description, '') || ' ' ||
              coalesce(b.location, '') || ' ' ||
              coalesce(b.location_address, '')
            )
         ) @@ websearch_to_tsquery('simple', public.jobbie_unaccent(trim(p_q)))
      or similarity(public.jobbie_unaccent(coalesce(b.title, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.description, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.location, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.location_address, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
  )
  select j.*
  from ranked r
  join public.job_offers j on j.id = r.id
  order by
    (0.75 * r.fts_score + 0.25 * r.trigram_score + case when j.is_urgent then 0.03 else 0 end) desc,
    j.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.search_jobs_hybrid(
  text,
  text,
  text,
  text,
  boolean,
  int,
  int,
  numeric,
  numeric,
  timestamptz,
  text,
  boolean
) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260531210000_normalize_work_category_slugs.sql
-- -----------------------------------------------------------------------------

-- Normalize legacy Base44 / English job and company-ad category values to canonical slugs.

update public.job_offers
set category = 'stavba'
where lower(trim(category)) in ('construction');

update public.job_offers
set category = 'stahovanie'
where lower(trim(category)) in ('moving');

update public.job_offers
set category = 'domacnost'
where lower(trim(category)) in ('cleaning');

update public.job_offers
set category = 'sklad'
where lower(trim(category)) in ('warehouse');

update public.job_offers
set category = 'zahrada'
where lower(trim(category)) in ('garden');

update public.job_offers
set category = 'eventy'
where lower(trim(category)) in ('events');

update public.job_offers
set category = 'starostlivost'
where lower(trim(category)) in ('care');

update public.job_offers
set category = 'gastro'
where lower(trim(category)) in ('food', 'restaurant');

update public.job_offers
set category = 'auto'
where lower(trim(category)) in ('transport', 'logistics', 'doprava');

update public.job_offers
set category = 'ine'
where lower(trim(category)) in ('other');

update public.company_ads
set category = 'stavba'
where lower(trim(category)) in ('construction');

update public.company_ads
set category = 'stahovanie'
where lower(trim(category)) in ('moving');

update public.company_ads
set category = 'domacnost'
where lower(trim(category)) in ('cleaning');

update public.company_ads
set category = 'sklad'
where lower(trim(category)) in ('warehouse');

update public.company_ads
set category = 'zahrada'
where lower(trim(category)) in ('garden');

update public.company_ads
set category = 'eventy'
where lower(trim(category)) in ('events');

update public.company_ads
set category = 'starostlivost'
where lower(trim(category)) in ('care');

update public.company_ads
set category = 'gastro'
where lower(trim(category)) in ('food', 'restaurant');

update public.company_ads
set category = 'auto'
where lower(trim(category)) in ('transport', 'logistics', 'doprava');

update public.company_ads
set category = 'ine'
where lower(trim(category)) in ('other');

update public.job_email_alerts
set category = 'stavba'
where category is not null and lower(trim(category)) in ('construction');

update public.job_email_alerts
set category = 'stahovanie'
where category is not null and lower(trim(category)) in ('moving');

update public.job_email_alerts
set category = 'domacnost'
where category is not null and lower(trim(category)) in ('cleaning');

update public.job_email_alerts
set category = 'sklad'
where category is not null and lower(trim(category)) in ('warehouse');

update public.job_email_alerts
set category = 'zahrada'
where category is not null and lower(trim(category)) in ('garden');

update public.job_email_alerts
set category = 'eventy'
where category is not null and lower(trim(category)) in ('events');

update public.job_email_alerts
set category = 'starostlivost'
where category is not null and lower(trim(category)) in ('care');

update public.job_email_alerts
set category = 'gastro'
where category is not null and lower(trim(category)) in ('food', 'restaurant');

update public.job_email_alerts
set category = 'auto'
where category is not null and lower(trim(category)) in ('transport', 'logistics', 'doprava');

update public.job_email_alerts
set category = 'ine'
where category is not null and lower(trim(category)) in ('other');

-- Multi-category column: replace legacy tokens inside arrays.
update public.job_email_alerts
set categories = (
  select coalesce(array_agg(distinct mapped order by mapped), '{}'::text[])
  from (
    select case lower(trim(c))
      when 'construction' then 'stavba'
      when 'moving' then 'stahovanie'
      when 'cleaning' then 'domacnost'
      when 'warehouse' then 'sklad'
      when 'garden' then 'zahrada'
      when 'events' then 'eventy'
      when 'care' then 'starostlivost'
      when 'food' then 'gastro'
      when 'restaurant' then 'gastro'
      when 'transport' then 'auto'
      when 'logistics' then 'auto'
      when 'doprava' then 'auto'
      when 'other' then 'ine'
      else lower(trim(c))
    end as mapped
    from unnest(categories) as c
    where trim(c) <> ''
  ) s
)
where categories is not null and cardinality(categories) > 0;

-- -----------------------------------------------------------------------------
-- Source: 20260601120000_job_email_alerts_monthly_frequency.sql
-- -----------------------------------------------------------------------------

-- Allow monthly frequency on job email alerts (ponuky na e-mail).

alter table public.job_email_alerts
  drop constraint if exists job_email_alerts_frequency_check;

alter table public.job_email_alerts
  add constraint job_email_alerts_frequency_check
  check (frequency in ('daily', 'weekly', 'monthly', 'immediate'));

comment on column public.job_email_alerts.frequency is
  'Digest cadence: daily, weekly, monthly, or legacy immediate (deprecated in API).';

-- -----------------------------------------------------------------------------
-- Source: 20260619120000_job_offers_structured_fields.sql
-- -----------------------------------------------------------------------------

-- Structured job post fields for filters, alerts, and public display.

alter table public.job_offers
  add column if not exists employment_types text[] not null default '{}'::text[],
  add column if not exists work_modes text[] not null default '{}'::text[],
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists show_exact_address boolean not null default false,
  add column if not exists salary_negotiable boolean not null default false,
  add column if not exists required_experience text,
  add column if not exists weekly_hours numeric,
  add column if not exists estimated_hours numeric,
  add column if not exists own_car_required boolean not null default false,
  add column if not exists application_method text,
  add column if not exists contact_person text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists show_phone_publicly boolean not null default false,
  add column if not exists application_url text,
  add column if not exists required_documents text[] not null default '{}'::text[],
  add column if not exists responsibilities text,
  add column if not exists requirements_text text,
  add column if not exists offer_text text,
  add column if not exists skill_tags text[] not null default '{}'::text[];

alter table public.job_offers
  drop constraint if exists job_offers_salary_type_check;

alter table public.job_offers
  add constraint job_offers_salary_type_check
  check (
    salary_type is null
    or salary_type in ('monthly', 'hourly', 'one_time', 'task_based', 'negotiable')
  );

alter table public.job_offers
  drop constraint if exists job_offers_required_experience_check;

alter table public.job_offers
  add constraint job_offers_required_experience_check
  check (
    required_experience is null
    or required_experience in ('any', 'none', 'lt1', 'y1_2', 'y3_5', 'y6_plus')
  );

alter table public.job_offers
  drop constraint if exists job_offers_application_method_check;

alter table public.job_offers
  add constraint job_offers_application_method_check
  check (
    application_method is null
    or application_method in ('platform', 'email', 'phone', 'external')
  );

alter table public.job_offers
  drop constraint if exists job_offers_employment_types_subset_check;

alter table public.job_offers
  add constraint job_offers_employment_types_subset_check
  check (
    cardinality(employment_types) = 0
    or employment_types <@ array[
      'full_time',
      'part_time',
      'brigada',
      'zivnost',
      'internship',
      'agreement',
      'student_agreement',
      'home_work',
      'volunteer',
      'one_off'
    ]::text[]
  );

alter table public.job_offers
  drop constraint if exists job_offers_work_modes_subset_check;

alter table public.job_offers
  add constraint job_offers_work_modes_subset_check
  check (
    cardinality(work_modes) = 0
    or work_modes <@ array['on_site', 'hybrid', 'remote']::text[]
  );

alter table public.job_offers
  drop constraint if exists job_offers_required_documents_subset_check;

alter table public.job_offers
  add constraint job_offers_required_documents_subset_check
  check (
    cardinality(required_documents) = 0
    or required_documents <@ array[
      'cv',
      'cover_letter',
      'portfolio',
      'certificate',
      'none'
    ]::text[]
  );

-- Backfill work_modes from legacy work_mode
update public.job_offers
set work_modes = array[work_mode]::text[]
where cardinality(work_modes) = 0
  and work_mode is not null
  and work_mode <> '';

-- Backfill city from location (first segment before comma)
update public.job_offers
set city = trim(split_part(location, ',', 1))
where city is null
  and location is not null
  and trim(location) <> '';

create index if not exists idx_job_offers_employment_types_gin
  on public.job_offers using gin (employment_types);

create index if not exists idx_job_offers_work_modes_gin
  on public.job_offers using gin (work_modes);

create index if not exists idx_job_offers_skill_tags_gin
  on public.job_offers using gin (skill_tags);

-- Extend job_email_alerts employment subset for one_off parity
alter table public.job_email_alerts
  drop constraint if exists job_email_alerts_employment_subset_check;

alter table public.job_email_alerts
  add constraint job_email_alerts_employment_subset_check
  check (
    cardinality(employment_types) = 0
    or employment_types <@ array[
      'full_time',
      'part_time',
      'brigada',
      'zivnost',
      'internship',
      'agreement',
      'student_agreement',
      'home_work',
      'volunteer',
      'one_off'
    ]::text[]
  );

-- -----------------------------------------------------------------------------
-- Source: 20260620120000_billing_cennik.sql
-- -----------------------------------------------------------------------------

-- Cenník: credit packs, plan updates, credit lots, ledger extensions, unlocks, promotions, banners.

-- ---------------------------------------------------------------------------
-- credit_packs (referenced by Nest StripeService)
-- Table may already exist from an older/partial schema without slug — align columns.
-- ---------------------------------------------------------------------------
create table if not exists public.credit_packs (
  id uuid primary key default gen_random_uuid()
);

alter table public.credit_packs add column if not exists slug text;
alter table public.credit_packs add column if not exists name text;
alter table public.credit_packs add column if not exists name_sk text;
alter table public.credit_packs add column if not exists credits integer;
alter table public.credit_packs add column if not exists unit_amount integer;
alter table public.credit_packs add column if not exists currency text default 'eur';
alter table public.credit_packs add column if not exists stripe_price_id text;
alter table public.credit_packs add column if not exists badge text;
alter table public.credit_packs add column if not exists sort_order integer default 0;
alter table public.credit_packs add column if not exists active boolean default true;
alter table public.credit_packs add column if not exists created_at timestamptz default now();
alter table public.credit_packs add column if not exists updated_at timestamptz default now();

-- Legacy table may require stripe_price_id; fill Stripe Price IDs after dashboard setup.
alter table public.credit_packs alter column stripe_price_id drop not null;

-- Legacy column "name" (predates name_sk).
alter table public.credit_packs alter column name drop not null;

-- Legacy rows without slug cannot be upserted; remove before seeding.
delete from public.credit_packs where slug is null;

create unique index if not exists idx_credit_packs_slug on public.credit_packs (slug);

drop trigger if exists credit_packs_updated_at on public.credit_packs;
create trigger credit_packs_updated_at
  before update on public.credit_packs
  for each row execute function public.set_updated_at();

alter table public.credit_packs enable row level security;

drop policy if exists "Anyone can read active credit_packs" on public.credit_packs;
create policy "Anyone can read active credit_packs"
  on public.credit_packs for select using (active = true);

grant select on public.credit_packs to anon, authenticated, service_role;
grant insert, update, delete on public.credit_packs to service_role;

insert into public.credit_packs (slug, name, name_sk, credits, unit_amount, currency, badge, sort_order, active)
values
  ('starter', 'Starter', 'Starter', 5, 500, 'eur', null, 0, true),
  ('popular', 'Najpopulárnejšie', 'Najpopulárnejšie', 12, 1000, 'eur', 'popular', 1, true),
  ('value', 'Výhodné', 'Výhodné', 30, 2000, 'eur', 'value', 2, true),
  ('firmy', 'Pre firmy', 'Pre firmy', 75, 4500, 'eur', null, 3, true),
  ('agentura', 'Agentúra', 'Agentúra', 150, 8000, 'eur', null, 4, true)
on conflict (slug) do update set
  name = excluded.name,
  name_sk = excluded.name_sk,
  credits = excluded.credits,
  unit_amount = excluded.unit_amount,
  badge = excluded.badge,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();

update public.credit_packs
set active = false, updated_at = now()
where slug = 'agentura';

-- ---------------------------------------------------------------------------
-- subscription_plans: rename slugs + new limits (preserve stripe_price_id)
-- ---------------------------------------------------------------------------
update public.subscription_plans set slug = 'start' where slug = 'basic';
update public.subscription_plans set slug = 'plus' where slug = 'standard';
update public.subscription_plans set slug = 'pro' where slug = 'premium';

update public.subscription_plans set
  name_sk = 'Zadarmo',
  price_monthly_cents = 0,
  monthly_credits = 2,
  max_active_jobs = 1,
  sort_order = 0
where slug = 'zadarmo';

update public.subscription_plans set
  name_sk = 'Štart',
  price_monthly_cents = 499,
  monthly_credits = 10,
  max_active_jobs = 3,
  sort_order = 1
where slug = 'start';

update public.subscription_plans set
  name_sk = 'Plus',
  price_monthly_cents = 999,
  monthly_credits = 25,
  max_active_jobs = 6,
  sort_order = 2
where slug = 'plus';

update public.subscription_plans set
  name_sk = 'Pro',
  price_monthly_cents = 1999,
  monthly_credits = 60,
  max_active_jobs = 15,
  sort_order = 3
where slug = 'pro';

insert into public.subscription_plans (slug, name_sk, price_monthly_cents, max_active_jobs, monthly_credits, sort_order)
values ('agentura', 'Agentúra', 3999, 40, 150, 4)
on conflict (slug) do update set
  name_sk = excluded.name_sk,
  price_monthly_cents = excluded.price_monthly_cents,
  max_active_jobs = excluded.max_active_jobs,
  monthly_credits = excluded.monthly_credits,
  sort_order = excluded.sort_order;

update public.subscription_plans
set active = false, updated_at = now()
where slug = 'agentura';

update public.subscription_plans set
  max_cv_unlocks_monthly = null,
  max_cv_contacts_monthly = null,
  max_cv_pdf_downloads_monthly = null
where slug in ('start', 'plus', 'pro');

-- ---------------------------------------------------------------------------
-- credit_lots (FIFO spend + expiration)
-- ---------------------------------------------------------------------------
create table if not exists public.credit_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount_remaining integer not null check (amount_remaining >= 0),
  amount_initial integer not null check (amount_initial > 0),
  source text not null check (source in ('purchase', 'subscription_grant', 'free_grant', 'adjustment')),
  expires_at timestamptz,
  grant_period text,
  stripe_invoice_id text,
  payment_intent_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_lots_user_expires
  on public.credit_lots (user_id, expires_at nulls last, created_at);

alter table public.credit_lots enable row level security;
create policy "deny all credit_lots" on public.credit_lots for all using (false) with check (false);
grant select, insert, update, delete on public.credit_lots to service_role;

-- ---------------------------------------------------------------------------
-- credit_ledger extensions
-- ---------------------------------------------------------------------------
alter table public.credit_ledger
  add column if not exists lot_id uuid references public.credit_lots (id) on delete set null;

alter table public.credit_ledger
  add column if not exists transaction_type text;

update public.credit_ledger
set transaction_type = case
  when delta > 0 and reason like '%purchase%' then 'purchase'
  when delta > 0 and reason like '%grant%' then 'subscription_grant'
  when delta < 0 then 'spend'
  else 'adjustment'
end
where transaction_type is null;

-- ---------------------------------------------------------------------------
-- cv_contact_unlocks
-- ---------------------------------------------------------------------------
create table if not exists public.cv_contact_unlocks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.profiles (id) on delete cascade,
  cv_id uuid not null,
  unlocked_at timestamptz not null default now(),
  contacted_at timestamptz,
  unique (company_id, cv_id)
);

create index if not exists idx_cv_contact_unlocks_company on public.cv_contact_unlocks (company_id);

alter table public.cv_contact_unlocks enable row level security;
create policy "deny all cv_contact_unlocks" on public.cv_contact_unlocks for all using (false) with check (false);
grant select, insert, update on public.cv_contact_unlocks to service_role;

-- ---------------------------------------------------------------------------
-- job_promotions
-- ---------------------------------------------------------------------------
create table if not exists public.job_promotions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_offers (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in (
    'urgent_badge', 'highlighted_card', 'top_category', 'homepage_featured'
  )),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  credits_spent integer not null check (credits_spent > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_job_promotions_job_kind on public.job_promotions (job_id, kind, ends_at desc);

alter table public.job_promotions enable row level security;
create policy "deny all job_promotions" on public.job_promotions for all using (false) with check (false);
grant select, insert on public.job_promotions to service_role;

-- ---------------------------------------------------------------------------
-- banner_ads (stub)
-- ---------------------------------------------------------------------------
create table if not exists public.banner_ads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  image_url text,
  target_url text,
  placement text not null check (placement in (
    'homepage_large', 'job_list', 'category_page', 'service_directory', 'email'
  )),
  status text not null default 'draft' check (status in (
    'draft', 'pending_review', 'active', 'rejected', 'expired'
  )),
  starts_at timestamptz,
  ends_at timestamptz,
  credits_cost integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger banner_ads_updated_at
  before update on public.banner_ads
  for each row execute function public.set_updated_at();

alter table public.banner_ads enable row level security;
create policy "deny all banner_ads" on public.banner_ads for all using (false) with check (false);
grant select, insert, update on public.banner_ads to service_role;

-- ---------------------------------------------------------------------------
-- Migrate existing profile balances into purchase lots (one-time)
-- ---------------------------------------------------------------------------
insert into public.credit_lots (user_id, amount_remaining, amount_initial, source, expires_at)
select p.id, p.credits, p.credits, 'purchase', null
from public.profiles p
where p.credits > 0
  and not exists (
    select 1 from public.credit_lots cl
    where cl.user_id = p.id and cl.source = 'purchase'
  );

-- ---------------------------------------------------------------------------
-- RPC: spend_credits (FIFO by expires_at nulls last, then created_at)
-- ---------------------------------------------------------------------------
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_audit_event_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer := p_amount;
  v_lot record;
  v_take integer;
  v_balance integer;
  v_ledger_id uuid;
begin
  if p_amount < 1 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0002';
  end if;

  for v_lot in
    select id, amount_remaining
    from credit_lots
    where user_id = p_user_id
      and amount_remaining > 0
      and (expires_at is null or expires_at > now())
    order by expires_at nulls last, created_at asc
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_lot.amount_remaining, v_remaining);
    update credit_lots set amount_remaining = amount_remaining - v_take where id = v_lot.id;
    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  update profiles set credits = v_balance where id = p_user_id;

  insert into credit_ledger (user_id, delta, balance_after, reason, ref_type, ref_id, audit_event_id, transaction_type)
  values (p_user_id, -p_amount, v_balance, p_reason, p_ref_type, p_ref_id, p_audit_event_id, 'spend')
  returning id into v_ledger_id;

  return jsonb_build_object('balance_after', v_balance, 'ledger_id', v_ledger_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: grant_credits
-- ---------------------------------------------------------------------------
create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_source text,
  p_reason text,
  p_expires_at timestamptz default null,
  p_grant_period text default null,
  p_stripe_invoice_id text default null,
  p_payment_intent_id text default null,
  p_audit_event_id uuid default null,
  p_ref_type text default null,
  p_ref_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot_id uuid;
  v_balance integer;
  v_tx text;
begin
  if p_amount < 1 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;
  if p_source not in ('purchase', 'subscription_grant', 'free_grant', 'adjustment') then
    raise exception 'INVALID_SOURCE' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  insert into credit_lots (
    user_id, amount_remaining, amount_initial, source,
    expires_at, grant_period, stripe_invoice_id, payment_intent_id
  ) values (
    p_user_id, p_amount, p_amount, p_source,
    p_expires_at, p_grant_period, p_stripe_invoice_id, p_payment_intent_id
  ) returning id into v_lot_id;

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  update profiles set credits = v_balance where id = p_user_id;

  v_tx := case p_source
    when 'purchase' then 'purchase'
    when 'free_grant' then 'subscription_grant'
    else 'subscription_grant'
  end;

  insert into credit_ledger (
    user_id, delta, balance_after, reason, ref_type, ref_id,
    audit_event_id, lot_id, transaction_type, payment_intent_id
  ) values (
    p_user_id, p_amount, v_balance, p_reason, p_ref_type, p_ref_id,
    p_audit_event_id, v_lot_id, v_tx, p_payment_intent_id
  );

  return jsonb_build_object('balance_after', v_balance, 'lot_id', v_lot_id);
end;
$$;

grant execute on function public.spend_credits to service_role;
grant execute on function public.grant_credits to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260620120000_profile_privacy_billing.sql
-- -----------------------------------------------------------------------------

-- Privacy toggles and billing details for account settings.

alter table public.profiles
  add column if not exists public_profile_enabled boolean not null default true,
  add column if not exists public_show_phone boolean not null default false,
  add column if not exists public_show_address boolean not null default true,
  add column if not exists public_allow_platform_contact boolean not null default true,
  add column if not exists public_show_in_company_search boolean not null default true,
  add column if not exists marketing_processing_consent boolean not null default false,
  add column if not exists billing_details jsonb not null default '{}'::jsonb;

comment on column public.profiles.public_profile_enabled is
  'When false, public profile endpoint returns minimal/disabled visibility.';
comment on column public.profiles.public_show_phone is
  'When true and phone is verified, phone_e164 may appear on public profile.';
comment on column public.profiles.public_show_address is
  'When true, registered_office may appear on public profile.';
comment on column public.profiles.billing_details is
  'Invoice billing address and contact fields (JSON).';

-- -----------------------------------------------------------------------------
-- Source: 20260620130000_credit_packs_schema_align.sql
-- -----------------------------------------------------------------------------

-- Fix credit_packs when table existed before 20260620120000 (missing slug column).
-- Safe to re-run.

alter table public.credit_packs add column if not exists slug text;
alter table public.credit_packs add column if not exists name text;
alter table public.credit_packs add column if not exists name_sk text;
alter table public.credit_packs add column if not exists credits integer;
alter table public.credit_packs add column if not exists unit_amount integer;
alter table public.credit_packs add column if not exists currency text default 'eur';
alter table public.credit_packs add column if not exists stripe_price_id text;
alter table public.credit_packs add column if not exists badge text;
alter table public.credit_packs add column if not exists sort_order integer default 0;
alter table public.credit_packs add column if not exists active boolean default true;
alter table public.credit_packs add column if not exists created_at timestamptz default now();
alter table public.credit_packs add column if not exists updated_at timestamptz default now();

-- Legacy table required stripe_price_id; packs are seeded before Stripe Price IDs exist.
alter table public.credit_packs alter column stripe_price_id drop not null;

-- Legacy column "name" (predates name_sk).
alter table public.credit_packs alter column name drop not null;

update public.credit_packs
set name = coalesce(name_sk, name, slug)
where name is null and (name_sk is not null or slug is not null);

delete from public.credit_packs where slug is null;

create unique index if not exists idx_credit_packs_slug on public.credit_packs (slug);

insert into public.credit_packs (slug, name, name_sk, credits, unit_amount, currency, badge, sort_order, active)
values
  ('starter', 'Starter', 'Starter', 5, 500, 'eur', null, 0, true),
  ('popular', 'Najpopulárnejšie', 'Najpopulárnejšie', 12, 1000, 'eur', 'popular', 1, true),
  ('value', 'Výhodné', 'Výhodné', 30, 2000, 'eur', 'value', 2, true),
  ('firmy', 'Pre firmy', 'Pre firmy', 75, 4500, 'eur', null, 3, true),
  ('agentura', 'Agentúra', 'Agentúra', 150, 8000, 'eur', null, 4, true)
on conflict (slug) do update set
  name = excluded.name,
  name_sk = excluded.name_sk,
  credits = excluded.credits,
  unit_amount = excluded.unit_amount,
  badge = excluded.badge,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- Source: 20260621120000_public_catalog_views.sql
-- -----------------------------------------------------------------------------

-- Public catalog: safe views + restrict direct reads of contact/tax columns via anon.
-- Nest API remains primary; this blocks PostgREST anon scraping of sensitive fields.

-- Job offers: public browse (no employer/contact email/phone)
create or replace view public.job_offers_public
with (security_invoker = true)
as
select
  id,
  company_id,
  title,
  description,
  location,
  location_address,
  location_lat,
  location_lng,
  contract_type,
  requirements,
  salary,
  job_type,
  work_mode,
  expires_at,
  is_draft,
  is_active,
  is_deleted,
  created_at,
  updated_at,
  category,
  is_urgent,
  is_featured,
  compensation_type,
  compensation_amount,
  workers_needed,
  application_deadline,
  completion_deadline,
  employer_name,
  photos,
  applications_count,
  work_from_home,
  salary_type,
  salary_min,
  salary_max,
  education_levels,
  benefits,
  suitable_for,
  driver_licenses,
  work_shift_modes,
  languages,
  pc_skills,
  start_type,
  start_date,
  employment_types,
  work_modes,
  city,
  postal_code,
  show_exact_address,
  salary_negotiable,
  required_experience,
  weekly_hours,
  estimated_hours,
  own_car_required,
  application_method,
  contact_person,
  show_phone_publicly,
  application_url,
  required_documents,
  responsibilities,
  requirements_text,
  offer_text,
  skill_tags
from public.job_offers
where is_active = true
  and is_deleted = false
  and (is_draft is not true);

comment on view public.job_offers_public is
  'Active public job catalog without employer_email, contact_email, or contact_phone.';

-- Company ads: public browse (no contact/tax identifiers)
create or replace view public.company_ads_public
with (security_invoker = true)
as
select
  id,
  owner_id,
  thumbnail_url,
  title,
  body,
  category,
  status,
  starts_at,
  ends_at,
  created_at,
  updated_at,
  profile_type,
  tagline,
  region,
  city,
  street_address,
  postal_code,
  show_exact_address,
  price_type,
  price_min,
  price_max,
  price_negotiable,
  price_note,
  availability,
  works_weekends,
  evening_hours,
  emergency_service,
  contact_person,
  website,
  preferred_contact_method,
  show_phone_publicly,
  show_email_publicly,
  founded_year,
  employee_count,
  duration_months,
  services,
  specializations,
  certifications,
  service_areas,
  custom_service_areas,
  gallery_items
from public.company_ads
where status = 'active'
  and ends_at is not null
  and ends_at > now();

comment on view public.company_ads_public is
  'Active company ads without contact_email, contact_phone, ico, dic, or ic_dph.';

-- Anon: read only via safe views (not base tables)
revoke select on public.job_offers from anon;
revoke select on public.company_ads from anon;
grant select on public.job_offers_public to anon;
grant select on public.company_ads_public to anon;

-- Authenticated: hide sensitive columns on base tables (owners use Nest API for full rows)
revoke select (employer_email, contact_email, contact_phone) on public.job_offers from authenticated;
revoke select (contact_email, contact_phone, ico, dic, ic_dph) on public.company_ads from authenticated;
grant select on public.job_offers_public to authenticated;
grant select on public.company_ads_public to authenticated;

-- -----------------------------------------------------------------------------
-- Source: 20260621120000_security_hardening.sql
-- -----------------------------------------------------------------------------

-- Security hardening: protect billing/profile fields, lock down fulfillments, fix job-photos RLS.

-- ---------------------------------------------------------------------------
-- profiles: block client updates to credits, app_role, permission scopes
-- ---------------------------------------------------------------------------
create or replace function public.profiles_block_sensitive_column_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('request.jwt.claim.role', true) = 'service_role'
     or current_user = 'postgres'
     or session_user = 'service_role' then
    return new;
  end if;

  if new.credits is distinct from old.credits then
    raise exception 'profiles.credits cannot be updated directly';
  end if;

  if new.app_role is distinct from old.app_role then
    raise exception 'profiles.app_role cannot be updated directly';
  end if;

  if new.extra_permission_scopes is distinct from old.extra_permission_scopes then
    raise exception 'profiles.extra_permission_scopes cannot be updated directly';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_block_sensitive_columns on public.profiles;
create trigger profiles_block_sensitive_columns
  before update on public.profiles
  for each row
  execute function public.profiles_block_sensitive_column_updates();

-- ---------------------------------------------------------------------------
-- stripe_credit_fulfillments: backend-only (deny authenticated client access)
-- ---------------------------------------------------------------------------
drop policy if exists authenticated_own_credit_fulfillments
  on public.stripe_credit_fulfillments;

drop policy if exists service_role_full_credit_fulfillments
  on public.stripe_credit_fulfillments;

create policy "deny all stripe_credit_fulfillments"
  on public.stripe_credit_fulfillments
  for all
  using (false)
  with check (false);

revoke insert, update, delete on public.stripe_credit_fulfillments from anon, authenticated;
grant select, insert, update, delete on public.stripe_credit_fulfillments to service_role;

-- ---------------------------------------------------------------------------
-- job-photos: enforce owner folder on insert (was any authenticated path)
-- ---------------------------------------------------------------------------
drop policy if exists "job-photos: authenticated upload" on storage.objects;
create policy "job-photos: authenticated upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- credit_ledger: idempotent spend per ref (prevents double-click double charge)
-- ---------------------------------------------------------------------------
create unique index if not exists idx_credit_ledger_spend_ref_unique
  on public.credit_ledger (user_id, ref_type, ref_id)
  where ref_type is not null
    and ref_id is not null
    and transaction_type = 'spend';

-- spend_credits: return existing result when same ref already spent (idempotent)
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_audit_event_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer := p_amount;
  v_lot record;
  v_take integer;
  v_balance integer;
  v_ledger_id uuid;
  v_existing jsonb;
begin
  if p_amount < 1 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;

  if p_ref_type is not null and p_ref_id is not null then
    select jsonb_build_object(
      'balance_after', cl.balance_after,
      'ledger_id', cl.id
    ) into v_existing
    from credit_ledger cl
    where cl.user_id = p_user_id
      and cl.ref_type = p_ref_type
      and cl.ref_id = p_ref_id
      and cl.transaction_type = 'spend'
    limit 1;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0002';
  end if;

  for v_lot in
    select id, amount_remaining
    from credit_lots
    where user_id = p_user_id
      and amount_remaining > 0
      and (expires_at is null or expires_at > now())
    order by expires_at nulls last, created_at asc
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_lot.amount_remaining, v_remaining);
    update credit_lots set amount_remaining = amount_remaining - v_take where id = v_lot.id;
    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  update profiles set credits = v_balance where id = p_user_id;

  insert into credit_ledger (user_id, delta, balance_after, reason, ref_type, ref_id, audit_event_id, transaction_type)
  values (p_user_id, -p_amount, v_balance, p_reason, p_ref_type, p_ref_id, p_audit_event_id, 'spend')
  returning id into v_ledger_id;

  return jsonb_build_object('balance_after', v_balance, 'ledger_id', v_ledger_id);
exception
  when unique_violation then
    if p_ref_type is not null and p_ref_id is not null then
      select jsonb_build_object(
        'balance_after', cl.balance_after,
        'ledger_id', cl.id
      ) into v_existing
      from credit_ledger cl
      where cl.user_id = p_user_id
        and cl.ref_type = p_ref_type
        and cl.ref_id = p_ref_id
        and cl.transaction_type = 'spend'
      limit 1;
      if v_existing is not null then
        return v_existing;
      end if;
    end if;
    raise;
end;
$$;

-- content_reports table: 20260530110000_content_reports_and_account_status.sql

-- Idempotent credit clawback after Stripe refund (uses spend_credits ledger ref)
create or replace function public.revoke_credits_for_payment_refund(
  p_user_id uuid,
  p_payment_intent_id text,
  p_amount integer,
  p_audit_event_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref text := 'refund:' || p_payment_intent_id;
  v_existing jsonb;
begin
  if p_amount < 1 then
    return jsonb_build_object('skipped', true, 'reason', 'zero_amount');
  end if;

  select jsonb_build_object(
    'balance_after', cl.balance_after,
    'ledger_id', cl.id
  ) into v_existing
  from credit_ledger cl
  where cl.user_id = p_user_id
    and cl.ref_type = 'payment_refund'
    and cl.ref_id = v_ref
    and cl.transaction_type = 'spend'
  limit 1;
  if v_existing is not null then
    return v_existing;
  end if;

  return public.spend_credits(
    p_user_id,
    p_amount,
    'stripe_refund',
    'payment_refund',
    v_ref,
    p_audit_event_id
  );
exception
  when others then
    if sqlerrm like '%INSUFFICIENT_CREDITS%' then
      return jsonb_build_object('skipped', true, 'reason', 'insufficient_balance');
    end if;
    raise;
end;
$$;

revoke all on function public.revoke_credits_for_payment_refund(uuid, text, integer, uuid) from public;
grant execute on function public.revoke_credits_for_payment_refund(uuid, text, integer, uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260621150000_db_security_indexes.sql
-- -----------------------------------------------------------------------------

-- Indexes and unique constraints for search filters, billing idempotency, and lookups.

-- job_offers: structured columns used by indexes (from 20260619120000; safe if already applied)
alter table public.job_offers
  add column if not exists city text;

-- job_offers: common list/filter predicates
create index if not exists idx_job_offers_city_active
  on public.job_offers (city)
  where is_deleted = false and city is not null;

create index if not exists idx_job_offers_salary_range
  on public.job_offers (salary_min, salary_max)
  where is_deleted = false
    and (salary_min is not null or salary_max is not null);

create index if not exists idx_job_offers_list_filter
  on public.job_offers (is_active, is_deleted, is_draft, category, created_at desc);

create index if not exists idx_job_offers_featured
  on public.job_offers (created_at desc)
  where is_featured = true and is_deleted = false and is_active = true;

-- job_email_alerts: ensure array columns exist (from 20260529120000; safe if already applied)
alter table public.job_email_alerts
  add column if not exists radius_km int,
  add column if not exists work_modes text[] not null default '{}'::text[],
  add column if not exists categories text[] not null default '{}'::text[];

-- job_email_alerts: criteria matching
create index if not exists idx_job_email_alerts_criteria_hash
  on public.job_email_alerts (criteria_hash);

create index if not exists idx_job_email_alerts_categories_gin
  on public.job_email_alerts using gin (categories);

create index if not exists idx_job_email_alerts_work_modes_gin
  on public.job_email_alerts using gin (work_modes);

create index if not exists idx_job_email_alerts_employment_types_gin
  on public.job_email_alerts using gin (employment_types);

-- cv_contact_unlocks
create index if not exists idx_cv_contact_unlocks_cv_id
  on public.cv_contact_unlocks (cv_id);

-- Billing idempotency (also supports lookup by Stripe IDs)
create unique index if not exists uq_credit_ledger_payment_intent
  on public.credit_ledger (payment_intent_id)
  where payment_intent_id is not null;

create unique index if not exists uq_credit_lots_payment_intent
  on public.credit_lots (payment_intent_id)
  where payment_intent_id is not null;

create unique index if not exists uq_user_subscriptions_stripe_sub
  on public.user_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- cv_contact_unlocks: FK to cvs (remove orphans first)
delete from public.cv_contact_unlocks u
where not exists (select 1 from public.cvs c where c.id = u.cv_id);

alter table public.cv_contact_unlocks
  drop constraint if exists cv_contact_unlocks_cv_id_fkey;

alter table public.cv_contact_unlocks
  add constraint cv_contact_unlocks_cv_id_fkey
  foreign key (cv_id) references public.cvs (id) on delete cascade;

-- -----------------------------------------------------------------------------
-- Source: 20260621151000_revoke_overbroad_grants.sql
-- -----------------------------------------------------------------------------

-- Revoke DML from anon on service-only tables (RLS denies access; grants should not imply privilege).

revoke insert, update, delete on public.stripe_credit_fulfillments from anon;
revoke insert, update, delete on public.credit_ledger from anon;
revoke insert, update, delete on public.credit_lots from anon;
revoke insert, update, delete on public.audit_events from anon;
revoke insert, update, delete on public.audit_chain_state from anon;
revoke insert, update, delete on public.auth_security_events from anon;
revoke insert, update, delete on public.profile_field_changes from anon;
revoke insert, update, delete on public.stripe_webhook_events from anon;
revoke insert, update, delete on public.stripe_financial_events from anon;
revoke insert, update, delete on public.api_request_logs from anon;
revoke insert, update, delete on public.storage_access_events from anon;
revoke insert, update, delete on public.moderation_decisions from anon;
revoke insert, update, delete on public.client_event_batches from anon;
revoke insert, update, delete on public.push_subscriptions from anon;
revoke insert, update, delete on public.cv_contact_unlocks from anon;
revoke insert, update, delete on public.job_promotions from anon;
revoke insert, update, delete on public.banner_ads from anon;

-- authenticated: same service-only tables (Nest uses service_role)
revoke insert, update, delete on public.stripe_credit_fulfillments from authenticated;
revoke insert, update, delete on public.credit_ledger from authenticated;
revoke insert, update, delete on public.credit_lots from authenticated;
revoke insert, update, delete on public.audit_events from authenticated;
revoke insert, update, delete on public.audit_chain_state from authenticated;
revoke insert, update, delete on public.auth_security_events from authenticated;
revoke insert, update, delete on public.profile_field_changes from authenticated;
revoke insert, update, delete on public.stripe_webhook_events from authenticated;
revoke insert, update, delete on public.stripe_financial_events from authenticated;
revoke insert, update, delete on public.api_request_logs from authenticated;
revoke insert, update, delete on public.storage_access_events from authenticated;
revoke insert, update, delete on public.moderation_decisions from authenticated;
revoke insert, update, delete on public.client_event_batches from authenticated;
revoke insert, update, delete on public.push_subscriptions from authenticated;
revoke insert, update, delete on public.cv_contact_unlocks from authenticated;
revoke insert, update, delete on public.job_promotions from authenticated;
revoke insert, update, delete on public.banner_ads from authenticated;

-- -----------------------------------------------------------------------------
-- Source: 20260621152000_db_security_rpcs.sql
-- -----------------------------------------------------------------------------

-- Credit RPC hardening: spend lot_id traceability, atomic expiration batch.

-- spend_credits: record primary consumed lot_id on ledger row
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_audit_event_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer := p_amount;
  v_lot record;
  v_take integer;
  v_balance integer;
  v_ledger_id uuid;
  v_primary_lot_id uuid;
begin
  if p_amount < 1 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0002';
  end if;

  for v_lot in
    select id, amount_remaining
    from credit_lots
    where user_id = p_user_id
      and amount_remaining > 0
      and (expires_at is null or expires_at > now())
    order by expires_at nulls last, created_at asc
    for update
  loop
    exit when v_remaining <= 0;
    if v_primary_lot_id is null then
      v_primary_lot_id := v_lot.id;
    end if;
    v_take := least(v_lot.amount_remaining, v_remaining);
    update credit_lots set amount_remaining = amount_remaining - v_take where id = v_lot.id;
    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  update profiles set credits = v_balance where id = p_user_id;

  insert into credit_ledger (
    user_id, delta, balance_after, reason, ref_type, ref_id,
    audit_event_id, lot_id, transaction_type
  )
  values (
    p_user_id, -p_amount, v_balance, p_reason, p_ref_type, p_ref_id,
    p_audit_event_id, v_primary_lot_id, 'spend'
  )
  returning id into v_ledger_id;

  return jsonb_build_object(
    'balance_after', v_balance,
    'ledger_id', v_ledger_id,
    'lot_id', v_primary_lot_id
  );
end;
$$;

-- expire_due_credit_lots: atomic per-user expiration (service_role cron)
create or replace function public.expire_due_credit_lots()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_expired integer := 0;
  v_lot record;
  v_total integer;
  v_balance integer;
begin
  for v_user_id in
    select distinct cl.user_id
    from credit_lots cl
    where cl.amount_remaining > 0
      and cl.expires_at is not null
      and cl.expires_at <= now()
  loop
    perform pg_advisory_xact_lock(hashtext(v_user_id::text));

    v_total := 0;
    for v_lot in
      select id, amount_remaining
      from credit_lots
      where user_id = v_user_id
        and amount_remaining > 0
        and expires_at is not null
        and expires_at <= now()
      for update
    loop
      v_total := v_total + v_lot.amount_remaining;
      update credit_lots set amount_remaining = 0 where id = v_lot.id;
    end loop;

    if v_total < 1 then
      continue;
    end if;

    select coalesce(sum(amount_remaining), 0)::integer into v_balance
    from credit_lots
    where user_id = v_user_id
      and amount_remaining > 0
      and (expires_at is null or expires_at > now());

    update profiles set credits = v_balance where id = v_user_id;

    insert into credit_ledger (
      user_id, delta, balance_after, reason, ref_type, ref_id, transaction_type
    )
    values (
      v_user_id, -v_total, v_balance, 'credit_expiration', 'credit_lot', null, 'expiration'
    );

    v_expired := v_expired + 1;
  end loop;

  return v_expired;
end;
$$;

grant execute on function public.spend_credits(
  uuid, integer, text, text, text, uuid
) to service_role;

grant execute on function public.expire_due_credit_lots() to service_role;

-- Admin analytics: match actual purchase reason from Stripe fulfillment
create or replace function public.admin_analytics_funnel(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_signups bigint;
  v_credit_users bigint;
  v_apply_users bigint;
  v_hire_users bigint;
begin
  select count(*)::bigint into v_signups
  from profiles p
  where p.created_at >= p_from and p.created_at <= p_to and not p.is_deleted;

  select count(distinct cl.user_id)::bigint into v_credit_users
  from credit_ledger cl
  where cl.created_at >= p_from and cl.created_at <= p_to
    and cl.delta > 0
    and (
      cl.reason = 'credit_package_purchase'
      or cl.reason = 'stripe_payment_intent'
      or cl.transaction_type = 'purchase'
    );

  select count(distinct a.individual_id)::bigint into v_apply_users
  from applications a
  where a.created_at >= p_from and a.created_at <= p_to
    and not a.is_deleted;

  select count(distinct a.individual_id)::bigint into v_hire_users
  from applications a
  where not a.is_deleted
    and a.status = 'accepted'
    and a.updated_at >= p_from and a.updated_at <= p_to;

  return jsonb_build_object(
    'signups', v_signups,
    'credit_purchases_distinct_users', v_credit_users,
    'applicants_distinct', v_apply_users,
    'hires_distinct', v_hire_users,
    'conversion_signup_to_credit',
      case when v_signups > 0 then round(v_credit_users::numeric / v_signups, 6) else null end,
    'conversion_signup_to_apply',
      case when v_signups > 0 then round(v_apply_users::numeric / v_signups, 6) else null end,
    'conversion_apply_to_hire',
      case when v_apply_users > 0 then round(v_hire_users::numeric / v_apply_users, 6) else null end
  );
end;
$$;

revoke all on function public.expire_due_credit_lots() from public;
grant execute on function public.expire_due_credit_lots() to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260621153000_billing_rpc_idempotent_reverse.sql
-- -----------------------------------------------------------------------------

-- Restore idempotent spend_credits (with lot_id), grant idempotency on PI/invoice,
-- and reverse_spend_for_ref for publish-flow rollback.

alter table public.credit_ledger
  add column if not exists stripe_invoice_id text;

-- Idempotent credit reversal per original spend ref
create unique index if not exists idx_credit_ledger_reversal_ref_unique
  on public.credit_ledger (user_id, ref_type, ref_id)
  where transaction_type = 'adjustment'
    and ref_type = 'spend_reversal';

create unique index if not exists uq_credit_ledger_stripe_invoice_grant
  on public.credit_ledger (stripe_invoice_id)
  where stripe_invoice_id is not null
    and delta > 0;

-- spend_credits: idempotent ref + lot_id traceability
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_audit_event_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer := p_amount;
  v_lot record;
  v_take integer;
  v_balance integer;
  v_ledger_id uuid;
  v_primary_lot_id uuid;
  v_existing jsonb;
begin
  if p_amount < 1 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;

  if p_ref_type is not null and p_ref_id is not null then
    select jsonb_build_object(
      'balance_after', cl.balance_after,
      'ledger_id', cl.id,
      'lot_id', cl.lot_id
    ) into v_existing
    from credit_ledger cl
    where cl.user_id = p_user_id
      and cl.ref_type = p_ref_type
      and cl.ref_id = p_ref_id
      and cl.transaction_type = 'spend'
    limit 1;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0002';
  end if;

  for v_lot in
    select id, amount_remaining
    from credit_lots
    where user_id = p_user_id
      and amount_remaining > 0
      and (expires_at is null or expires_at > now())
    order by expires_at nulls last, created_at asc
    for update
  loop
    exit when v_remaining <= 0;
    if v_primary_lot_id is null then
      v_primary_lot_id := v_lot.id;
    end if;
    v_take := least(v_lot.amount_remaining, v_remaining);
    update credit_lots set amount_remaining = amount_remaining - v_take where id = v_lot.id;
    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  update profiles set credits = v_balance where id = p_user_id;

  insert into credit_ledger (
    user_id, delta, balance_after, reason, ref_type, ref_id,
    audit_event_id, lot_id, transaction_type
  )
  values (
    p_user_id, -p_amount, v_balance, p_reason, p_ref_type, p_ref_id,
    p_audit_event_id, v_primary_lot_id, 'spend'
  )
  returning id into v_ledger_id;

  return jsonb_build_object(
    'balance_after', v_balance,
    'ledger_id', v_ledger_id,
    'lot_id', v_primary_lot_id
  );
exception
  when unique_violation then
    if p_ref_type is not null and p_ref_id is not null then
      select jsonb_build_object(
        'balance_after', cl.balance_after,
        'ledger_id', cl.id,
        'lot_id', cl.lot_id
      ) into v_existing
      from credit_ledger cl
      where cl.user_id = p_user_id
        and cl.ref_type = p_ref_type
        and cl.ref_id = p_ref_id
        and cl.transaction_type = 'spend'
      limit 1;
      if v_existing is not null then
        return v_existing;
      end if;
    end if;
    raise;
end;
$$;

-- grant_credits: idempotent when payment_intent_id or stripe_invoice_id is set
create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_source text,
  p_reason text,
  p_expires_at timestamptz default null,
  p_grant_period text default null,
  p_stripe_invoice_id text default null,
  p_payment_intent_id text default null,
  p_audit_event_id uuid default null,
  p_ref_type text default null,
  p_ref_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot_id uuid;
  v_balance integer;
  v_tx text;
  v_existing jsonb;
begin
  if p_amount < 1 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;
  if p_source not in ('purchase', 'subscription_grant', 'free_grant', 'adjustment') then
    raise exception 'INVALID_SOURCE' using errcode = 'P0001';
  end if;

  if p_payment_intent_id is not null then
    select jsonb_build_object(
      'balance_after', cl.balance_after,
      'lot_id', cl.lot_id
    ) into v_existing
    from credit_ledger cl
    where cl.payment_intent_id = p_payment_intent_id
      and cl.user_id = p_user_id
      and cl.delta > 0
    limit 1;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  if p_stripe_invoice_id is not null then
    select jsonb_build_object(
      'balance_after', cl.balance_after,
      'lot_id', cl.lot_id
    ) into v_existing
    from credit_ledger cl
    where cl.stripe_invoice_id = p_stripe_invoice_id
      and cl.user_id = p_user_id
      and cl.delta > 0
    limit 1;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  insert into credit_lots (
    user_id, amount_remaining, amount_initial, source,
    expires_at, grant_period, stripe_invoice_id, payment_intent_id
  ) values (
    p_user_id, p_amount, p_amount, p_source,
    p_expires_at, p_grant_period, p_stripe_invoice_id, p_payment_intent_id
  ) returning id into v_lot_id;

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  update profiles set credits = v_balance where id = p_user_id;

  v_tx := case p_source
    when 'purchase' then 'purchase'
    when 'adjustment' then 'adjustment'
    when 'free_grant' then 'subscription_grant'
    else 'subscription_grant'
  end;

  insert into credit_ledger (
    user_id, delta, balance_after, reason, ref_type, ref_id,
    audit_event_id, lot_id, transaction_type, payment_intent_id, stripe_invoice_id
  ) values (
    p_user_id, p_amount, v_balance, p_reason, p_ref_type, p_ref_id,
    p_audit_event_id, v_lot_id, v_tx, p_payment_intent_id, p_stripe_invoice_id
  );

  return jsonb_build_object('balance_after', v_balance, 'lot_id', v_lot_id);
exception
  when unique_violation then
    if p_payment_intent_id is not null then
      select jsonb_build_object(
        'balance_after', cl.balance_after,
        'lot_id', cl.lot_id
      ) into v_existing
      from credit_ledger cl
      where cl.payment_intent_id = p_payment_intent_id
        and cl.user_id = p_user_id
        and cl.delta > 0
      limit 1;
      if v_existing is not null then
        return v_existing;
      end if;
    end if;
    if p_stripe_invoice_id is not null then
      select jsonb_build_object(
        'balance_after', cl.balance_after,
        'lot_id', cl.lot_id
      ) into v_existing
      from credit_ledger cl
      where cl.stripe_invoice_id = p_stripe_invoice_id
        and cl.user_id = p_user_id
        and cl.delta > 0
      limit 1;
      if v_existing is not null then
        return v_existing;
      end if;
    end if;
    raise;
end;
$$;

-- reverse_spend_for_ref: compensating grant linked to original spend ref
create or replace function public.reverse_spend_for_ref(
  p_user_id uuid,
  p_ref_type text,
  p_ref_id text,
  p_reason text,
  p_audit_event_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spend record;
  v_reversal_ref text;
  v_existing jsonb;
  v_amount integer;
begin
  if p_ref_type is null or p_ref_id is null then
    raise exception 'REF_REQUIRED' using errcode = 'P0001';
  end if;

  v_reversal_ref := p_ref_type || ':' || p_ref_id;

  select jsonb_build_object(
    'balance_after', cl.balance_after,
    'ledger_id', cl.id,
    'reversed', true
  ) into v_existing
  from credit_ledger cl
  where cl.user_id = p_user_id
    and cl.ref_type = 'spend_reversal'
    and cl.ref_id = v_reversal_ref
    and cl.transaction_type = 'adjustment'
  limit 1;
  if v_existing is not null then
    return v_existing;
  end if;

  select cl.id, abs(cl.delta)::integer as amount
  into v_spend
  from credit_ledger cl
  where cl.user_id = p_user_id
    and cl.ref_type = p_ref_type
    and cl.ref_id = p_ref_id
    and cl.transaction_type = 'spend'
  limit 1;

  if v_spend.id is null then
    return jsonb_build_object('skipped', true, 'reason', 'no_spend');
  end if;

  v_amount := v_spend.amount;
  if v_amount < 1 then
    return jsonb_build_object('skipped', true, 'reason', 'zero_amount');
  end if;

  return public.grant_credits(
    p_user_id,
    v_amount,
    'adjustment',
    p_reason,
    null,
    null,
    null,
    null,
    p_audit_event_id,
    'spend_reversal',
    v_reversal_ref
  );
exception
  when unique_violation then
    select jsonb_build_object(
      'balance_after', cl.balance_after,
      'ledger_id', cl.id,
      'reversed', true
    ) into v_existing
    from credit_ledger cl
    where cl.user_id = p_user_id
      and cl.ref_type = 'spend_reversal'
      and cl.ref_id = v_reversal_ref
      and cl.transaction_type = 'adjustment'
    limit 1;
    if v_existing is not null then
      return v_existing;
    end if;
    raise;
end;
$$;

grant execute on function public.spend_credits(
  uuid, integer, text, text, text, uuid
) to service_role;

grant execute on function public.grant_credits(
  uuid, integer, text, text, timestamptz, text, text, text, uuid, text, text
) to service_role;

revoke all on function public.reverse_spend_for_ref(uuid, text, text, text, uuid) from public;
grant execute on function public.reverse_spend_for_ref(uuid, text, text, text, uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260621153000_scalability_indexes.sql
-- -----------------------------------------------------------------------------

-- Scalability: list/catalog indexes for company ads, employer CV browse, applicants.
-- Follow-up: GIN/trgm on company_ads title/body when text search moves from API to SQL.

-- Public company ads catalog. Predicate cannot use now() (not IMMUTABLE).
-- API/view still filter ends_at > now(); this index covers status = active + sort.
create index if not exists idx_company_ads_active_list
  on public.company_ads (created_at desc)
  where status = 'active' and ends_at is not null;

-- Price filters on active listings (same partial predicate as list index)
create index if not exists idx_company_ads_price_range
  on public.company_ads (price_min, price_max)
  where status = 'active' and ends_at is not null;

-- Employer CV database: visible shells sorted by recency
create index if not exists idx_cvs_employer_visible_updated
  on public.cvs (updated_at desc)
  where visible_to_employers = true;

-- Employer applicants list per job
create index if not exists idx_applications_job_created
  on public.applications (job_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Source: 20260622120000_gdpr_privacy_enforcement.sql
-- -----------------------------------------------------------------------------

-- GDPR / privacy defense-in-depth: CV contact column grants, consent audit, public catalog address redaction.

-- ---------------------------------------------------------------------------
-- profiles.deleted_at + is_deleted retention comment
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists deleted_at timestamptz;

comment on column public.profiles.is_deleted is
  'Soft-delete flag: profile PII scrubbed, auth user banned, job offers deactivated. CV rows remain for FK integrity but must be hidden from employer discovery (visible_to_employers=false). Hard auth.users delete is optional and separate.';
comment on column public.profiles.deleted_at is
  'Timestamp when account closure completed (GDPR erasure request tracking).';

-- ---------------------------------------------------------------------------
-- Employer CV discovery index
-- ---------------------------------------------------------------------------
create index if not exists idx_cvs_employer_visible_user
  on public.cvs (visible_to_employers, user_id)
  where visible_to_employers = true;

-- ---------------------------------------------------------------------------
-- Unlock helper (used by Nest; documents unlock semantics in DB)
-- ---------------------------------------------------------------------------
create or replace function public.employer_has_cv_contact_unlock(
  p_company_id uuid,
  p_cv_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cv_contact_unlocks u
    where u.company_id = p_company_id
      and u.cv_id = p_cv_id
  );
$$;

comment on function public.employer_has_cv_contact_unlock(uuid, uuid) is
  'True when company paid to unlock CV contact. Nest API enforces unlock before returning email/phone; direct PostgREST cannot read contact columns (column grants).';

revoke all on function public.employer_has_cv_contact_unlock(uuid, uuid) from public;
grant execute on function public.employer_has_cv_contact_unlock(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- cv_personal_info: column-level revoke for contact / special-category fields
-- Owners and employers reach contact only via Nest (service_role).
-- ---------------------------------------------------------------------------
revoke select (
  email,
  phone,
  linkedin_url,
  birth_date,
  birth_day,
  birth_month,
  birth_year,
  gender,
  address_street,
  address_postal_code
) on public.cv_personal_info from anon, authenticated;

-- Replace employer read policy (row visibility only; sensitive cols revoked above)
drop policy if exists "Owner or employer can read cv_personal_info" on public.cv_personal_info;

create policy "Owner can read own cv_personal_info"
  on public.cv_personal_info for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_personal_info.cv_id
        and c.user_id = auth.uid()
    )
  );

create policy "Employer can read visible cv_personal_info browse columns"
  on public.cv_personal_info for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_personal_info.cv_id
        and c.visible_to_employers = true
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.is_deleted = false
            and (
              p.customer_role = true
              or p.provider_role = true
              or p.role = 'company'
            )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- consent_events (GDPR accountability; service_role writes only)
-- ---------------------------------------------------------------------------
create table if not exists public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  consent_type text not null,
  granted boolean not null,
  source text,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_consent_events_user_recorded
  on public.consent_events (user_id, recorded_at desc);

comment on table public.consent_events is
  'Append-only consent grant/withdrawal log. Inserts via Nest service_role only.';

alter table public.consent_events enable row level security;

create policy "Users read own consent_events"
  on public.consent_events for select
  using (auth.uid() = user_id);

create policy "deny consent_events mutations for clients"
  on public.consent_events for all
  using (false)
  with check (false);

grant select on public.consent_events to authenticated;
grant select, insert on public.consent_events to service_role;

revoke insert, update, delete on public.consent_events from anon;
revoke insert, update, delete on public.consent_events from authenticated;

-- ---------------------------------------------------------------------------
-- Public catalog views: redact exact address when show_exact_address is false
-- ---------------------------------------------------------------------------
create or replace view public.job_offers_public
with (security_invoker = true)
as
select
  id,
  company_id,
  title,
  description,
  location,
  case when show_exact_address then location_address else null end as location_address,
  location_lat,
  location_lng,
  contract_type,
  requirements,
  salary,
  job_type,
  work_mode,
  expires_at,
  is_draft,
  is_active,
  is_deleted,
  created_at,
  updated_at,
  category,
  is_urgent,
  is_featured,
  compensation_type,
  compensation_amount,
  workers_needed,
  application_deadline,
  completion_deadline,
  employer_name,
  photos,
  applications_count,
  work_from_home,
  salary_type,
  salary_min,
  salary_max,
  education_levels,
  benefits,
  suitable_for,
  driver_licenses,
  work_shift_modes,
  languages,
  pc_skills,
  start_type,
  start_date,
  employment_types,
  work_modes,
  city,
  postal_code,
  show_exact_address,
  salary_negotiable,
  required_experience,
  weekly_hours,
  estimated_hours,
  own_car_required,
  application_method,
  contact_person,
  show_phone_publicly,
  application_url,
  required_documents,
  responsibilities,
  requirements_text,
  offer_text,
  skill_tags
from public.job_offers
where is_active = true
  and is_deleted = false
  and (is_draft is not true);

create or replace view public.company_ads_public
with (security_invoker = true)
as
select
  id,
  owner_id,
  thumbnail_url,
  title,
  body,
  category,
  status,
  starts_at,
  ends_at,
  created_at,
  updated_at,
  profile_type,
  tagline,
  region,
  city,
  case when show_exact_address then street_address else null end as street_address,
  postal_code,
  show_exact_address,
  price_type,
  price_min,
  price_max,
  price_negotiable,
  price_note,
  availability,
  works_weekends,
  evening_hours,
  emergency_service,
  contact_person,
  website,
  preferred_contact_method,
  show_phone_publicly,
  show_email_publicly,
  founded_year,
  employee_count,
  duration_months,
  services,
  specializations,
  certifications,
  service_areas,
  custom_service_areas,
  gallery_items
from public.company_ads
where status = 'active'
  and ends_at is not null
  and ends_at > now();

-- -----------------------------------------------------------------------------
-- Source: 20260622120000_platform_security_enforcement.sql
-- -----------------------------------------------------------------------------

-- Platform security: account enforcement, BFF API sessions, admin MFA marker.

-- ---------------------------------------------------------------------------
-- profiles: account enforcement
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'closed'));

alter table public.profiles
  add column if not exists suspended_at timestamptz;

alter table public.profiles
  add column if not exists suspended_reason text;

alter table public.profiles
  add column if not exists suspended_by uuid references public.profiles (id) on delete set null;

alter table public.profiles
  add column if not exists admin_mfa_enforced_at timestamptz;

comment on column public.profiles.account_status is 'active | suspended (admin) | closed (self-delete or admin).';
comment on column public.profiles.admin_mfa_enforced_at is 'When admin MFA policy was recorded; Supabase MFA is source of truth.';

create index if not exists idx_profiles_account_status
  on public.profiles (account_status)
  where account_status <> 'active';

-- Backfill closed from soft-delete
update public.profiles
set account_status = 'closed'
where is_deleted = true
  and account_status = 'active';

-- Extend sensitive-column guard
create or replace function public.profiles_block_sensitive_column_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('request.jwt.claim.role', true) = 'service_role'
     or current_user = 'postgres'
     or session_user = 'service_role' then
    return new;
  end if;

  if new.credits is distinct from old.credits then
    raise exception 'profiles.credits cannot be updated directly';
  end if;

  if new.app_role is distinct from old.app_role then
    raise exception 'profiles.app_role cannot be updated directly';
  end if;

  if new.extra_permission_scopes is distinct from old.extra_permission_scopes then
    raise exception 'profiles.extra_permission_scopes cannot be updated directly';
  end if;

  if new.account_status is distinct from old.account_status then
    raise exception 'profiles.account_status cannot be updated directly';
  end if;

  if new.suspended_at is distinct from old.suspended_at
     or new.suspended_reason is distinct from old.suspended_reason
     or new.suspended_by is distinct from old.suspended_by then
    raise exception 'profiles suspension fields cannot be updated directly';
  end if;

  if new.admin_mfa_enforced_at is distinct from old.admin_mfa_enforced_at then
    raise exception 'profiles.admin_mfa_enforced_at cannot be updated directly';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- BFF API sessions (refresh token hash only; service_role)
-- ---------------------------------------------------------------------------
create table if not exists public.api_user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  refresh_token_hash text not null,
  device_id text,
  user_agent text,
  last_ip text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_step_up_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_api_user_sessions_user_active
  on public.api_user_sessions (user_id, last_seen_at desc)
  where revoked_at is null;

alter table public.api_user_sessions enable row level security;

create policy "deny all api_user_sessions"
  on public.api_user_sessions for all
  using (false)
  with check (false);

revoke all on public.api_user_sessions from anon, authenticated;
grant select, insert, update, delete on public.api_user_sessions to service_role;

-- content_reports: revoke broad client grants (service_role only)
revoke all on public.content_reports from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Source: 20260622120000_storage_upload_lockdown.sql
-- -----------------------------------------------------------------------------

-- Storage upload lockdown: bucket MIME allowlists and API-only writes for public image buckets.
--
-- Path conventions (Nest service_role uploads):
--   job-photos:        {user_id}/{kind}-{uuid}.jpg
--   profile-avatars:   {user_id}/avatar.jpg  OR  {user_id}/cv/{cv_id}/{uuid}.ext
--   chat-media:        {room_id}/{user_id}/{uuid}.ext  (private; signed URLs)

-- chat-media: enforce MIME allowlist at bucket level (was null = any type).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  15728640,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- job-photos / profile-avatars: writes only via Nest (service_role). Clients may still read public objects.
drop policy if exists "job-photos: authenticated upload" on storage.objects;
drop policy if exists "job-photos: owner update" on storage.objects;

drop policy if exists "profile-avatars: authenticated upload" on storage.objects;
drop policy if exists "profile-avatars: owner update" on storage.objects;
drop policy if exists "profile-avatars: owner delete" on storage.objects;

-- Keep owner delete on job-photos so users can remove their listing photos if needed.
-- (Upload path is API-only; delete may still be used for account cleanup flows.)

-- -----------------------------------------------------------------------------
-- Source: 20260622120500_backfill_api_session_step_up.sql
-- -----------------------------------------------------------------------------

-- Backfill step-up timestamp for sessions created before establishSession set last_step_up_at on all logins.
update public.api_user_sessions
set last_step_up_at = coalesce(last_seen_at, created_at, now())
where revoked_at is null
  and last_step_up_at is null;

-- -----------------------------------------------------------------------------
-- Source: 20260622130000_audit_tables_service_role_grants.sql
-- -----------------------------------------------------------------------------

-- Nest AuditService / retention / payments write these tables via service_role.
-- RLS denies anon/authenticated; table-level grants were never added when audit tables were created
-- (see login_attempt_counters in 20260503120000_enterprise_auth_security.sql for the pattern).

grant select, insert, delete on public.auth_security_events to service_role;
grant select, insert, delete on public.profile_field_changes to service_role;
grant select, insert, delete on public.credit_ledger to service_role;
grant select on public.audit_events to service_role;
grant select, insert, delete on public.client_event_batches to service_role;
grant select, insert, delete on public.api_request_logs to service_role;
grant select, insert, delete on public.storage_access_events to service_role;
grant select, insert, update, delete on public.stripe_webhook_events to service_role;
grant select, insert, delete on public.stripe_financial_events to service_role;
grant select, insert on public.moderation_decisions to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260622140000_employer_applicants_v2.sql
-- -----------------------------------------------------------------------------

-- Employer applicants v2: reviewing status, notes, per-job reply settings, auto-reply log fields.

-- ---------------------------------------------------------------------------
-- applications.status: add reviewing + status_updated_at
-- ---------------------------------------------------------------------------
alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in (
    'pending', 'reviewing', 'rejected', 'withdrawn',
    'interview_invited', 'accepted'
  ));

alter table public.applications
  add column if not exists status_updated_at timestamptz;

create index if not exists idx_applications_job_status
  on public.applications (job_id, status)
  where is_deleted = false;

-- ---------------------------------------------------------------------------
-- application_notes (company-only, via Nest service_role)
-- ---------------------------------------------------------------------------
create table if not exists public.application_notes (
  application_id uuid primary key references public.applications(id) on delete cascade,
  company_id uuid not null references public.profiles(id) on delete cascade,
  note text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_application_notes_company
  on public.application_notes (company_id);

alter table public.application_notes enable row level security;

drop policy if exists "service role full application_notes" on public.application_notes;
create policy "service role full application_notes"
  on public.application_notes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- job_applicant_reply_settings (per job, company-scoped)
-- ---------------------------------------------------------------------------
create table if not exists public.job_applicant_reply_settings (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.job_offers(id) on delete cascade,
  company_id uuid not null references public.profiles(id) on delete cascade,
  rejection_auto_reply_enabled boolean not null default false,
  rejection_subject text not null default 'Vaša reakcia na pracovnú ponuku',
  rejection_template text not null default '',
  interview_auto_reply_enabled boolean not null default false,
  interview_subject text not null default 'Pozvanie na pohovor',
  interview_template text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id)
);

create index if not exists idx_job_applicant_reply_settings_company
  on public.job_applicant_reply_settings (company_id);

drop trigger if exists job_applicant_reply_settings_updated_at on public.job_applicant_reply_settings;
create trigger job_applicant_reply_settings_updated_at
  before update on public.job_applicant_reply_settings
  for each row execute function public.set_updated_at();

alter table public.job_applicant_reply_settings enable row level security;

drop policy if exists "service role full job_applicant_reply_settings" on public.job_applicant_reply_settings;
create policy "service role full job_applicant_reply_settings"
  on public.job_applicant_reply_settings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- application_auto_messages: log channel, subject, body, delivery status
-- ---------------------------------------------------------------------------
alter table public.application_auto_messages
  add column if not exists channel text
    check (channel is null or channel in ('email', 'in_app'));

alter table public.application_auto_messages
  add column if not exists delivery_status text not null default 'sent'
    check (delivery_status in ('sent', 'failed', 'skipped'));

alter table public.application_auto_messages
  add column if not exists subject text;

alter table public.application_auto_messages
  add column if not exists body text;

alter table public.application_auto_messages
  add column if not exists sent_by uuid references public.profiles(id) on delete set null;

alter table public.application_auto_messages
  add column if not exists error_message text;

-- ---------------------------------------------------------------------------
-- RPC: employer_set_application_status (reviewing + status_updated_at)
-- ---------------------------------------------------------------------------
create or replace function public.employer_set_application_status(
  p_application_id uuid,
  p_new_status text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app record;
  v_company_id uuid;
begin
  if p_new_status not in (
    'pending', 'reviewing', 'rejected', 'interview_invited', 'accepted'
  ) then
    raise exception 'invalid_status';
  end if;

  select a.id, a.job_id, a.individual_id, a.status, a.is_deleted
  into v_app
  from public.applications a
  where a.id = p_application_id;

  if not found then
    raise exception 'not_found';
  end if;

  if v_app.is_deleted then
    raise exception 'not_found';
  end if;

  if v_app.status = 'withdrawn' then
    raise exception 'withdrawn';
  end if;

  select j.company_id into v_company_id
  from public.job_offers j
  where j.id = v_app.job_id and not j.is_deleted;

  if v_company_id is null or v_company_id <> p_actor_id then
    raise exception 'forbidden';
  end if;

  if v_app.status = p_new_status then
    return jsonb_build_object(
      'id', v_app.id,
      'status', v_app.status,
      'unchanged', true
    );
  end if;

  insert into public.application_status_history (
    application_id, old_status, new_status, changed_by, source
  ) values (
    p_application_id, v_app.status, p_new_status, p_actor_id, 'employer_ui'
  );

  update public.applications
  set
    status = p_new_status,
    updated_at = now(),
    status_updated_at = now()
  where id = p_application_id;

  return jsonb_build_object(
    'id', p_application_id,
    'status', p_new_status,
    'old_status', v_app.status,
    'unchanged', false
  );
end;
$$;

revoke all on function public.employer_set_application_status(uuid, text, uuid) from public;
grant execute on function public.employer_set_application_status(uuid, text, uuid) to service_role;

grant select, insert, update, delete on public.application_notes to service_role;
grant select, insert, update, delete on public.job_applicant_reply_settings to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260623100000_ensure_sk_municipality_rpc.sql
-- -----------------------------------------------------------------------------

-- Idempotent municipality row for user-entered obec names (Nest service_role only).

create or replace function public.ensure_sk_municipality(p_name text)
returns table (id bigint, name text, kraj text, okres text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
begin
  if char_length(v_name) < 2 then
    raise exception 'municipality_name_too_short' using errcode = '22023';
  end if;
  if char_length(v_name) > 120 then
    raise exception 'municipality_name_too_long' using errcode = '22023';
  end if;

  return query
  select m.id, m.name, m.kraj, m.okres
  from public.sk_municipalities m
  where public.jobbie_unaccent(m.name) = public.jobbie_unaccent(v_name)
  order by m.id
  limit 1;
  if found then
    return;
  end if;

  insert into public.sk_municipalities (name, kraj, okres)
  values (v_name, 'Neuvedené', 'Neuvedené')
  on conflict (name, okres) do nothing;

  return query
  select m.id, m.name, m.kraj, m.okres
  from public.sk_municipalities m
  where m.name = v_name
    and m.okres = 'Neuvedené'
  order by m.id
  limit 1;
end;
$$;

comment on function public.ensure_sk_municipality(text) is
  'Return existing municipality by accent-insensitive name, or insert placeholder kraj/okres for user-entered obec.';

revoke all on function public.ensure_sk_municipality(text) from public;
grant execute on function public.ensure_sk_municipality(text) to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260623120000_cv_skills_multiple_drafts.sql
-- -----------------------------------------------------------------------------

-- Allow multiple draft skill rows per CV (empty or in-progress names).
-- Re-apply safely if 20260529100000 was skipped locally.

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'cv_skills'
      and c.contype = 'u'
  loop
    execute format('alter table public.cv_skills drop constraint if exists %I', r.conname);
  end loop;
end $$;

drop index if exists public.cv_skills_cv_id_skill_name_key;

create unique index if not exists cv_skills_cv_nonempty_skill_lower_key
  on public.cv_skills (cv_id, lower(trim(skill_name)))
  where length(trim(skill_name)) > 0
    and skill_name not like '__jb_draft:%';

-- -----------------------------------------------------------------------------
-- Source: 20260623140000_storage_pending_uploads.sql
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Source: 20260623140100_chat_media_mime_expand.sql
-- -----------------------------------------------------------------------------

-- Expand chat-media bucket MIME allowlist for documents (direct signed uploads).

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/rtf',
  'text/rtf',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet'
]
where id = 'chat-media';

-- -----------------------------------------------------------------------------
-- Source: 20260623150000_sk_companies.sql
-- -----------------------------------------------------------------------------

-- Slovak company names for CV employer picker (ORSR / živnostenský register via RPO sync).
-- Search: accent-insensitive trigram on name; populated by Nest write-through from RPO API.

create table if not exists public.sk_companies (
  id bigint generated always as identity primary key,
  rpo_id bigint not null,
  name text not null,
  ico char(8) null,
  municipality text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sk_companies_rpo_id_key unique (rpo_id),
  constraint sk_companies_name_len check (char_length(trim(name)) >= 2 and char_length(name) <= 500),
  constraint sk_companies_ico_format check (ico is null or ico ~ '^[0-9]{8}$')
);

create unique index if not exists sk_companies_ico_key
  on public.sk_companies (ico)
  where ico is not null;

comment on table public.sk_companies is
  'Cached RPO company names for fast employer autocomplete; filled on search via Nest upsert_sk_companies_batch.';

create index if not exists idx_sk_companies_name_unaccent_trgm
  on public.sk_companies
  using gin (public.jobbie_unaccent(name) gin_trgm_ops);

create index if not exists idx_sk_companies_ico
  on public.sk_companies (ico)
  where ico is not null;

alter table public.sk_companies enable row level security;

create policy sk_companies_select_authenticated
  on public.sk_companies
  for select
  to authenticated
  using (true);

create policy sk_companies_select_anon
  on public.sk_companies
  for select
  to anon
  using (true);

grant select on public.sk_companies to anon, authenticated, service_role;

-- Prefix-prioritized name search (same pattern as sk_municipalities).
create or replace function public.search_sk_companies(p_query text, p_limit int)
returns table (id bigint, rpo_id bigint, name text, ico text, municipality text)
language sql
stable
parallel safe
as $$
  select c.id, c.rpo_id, c.name, c.ico::text, c.municipality
  from public.sk_companies c
  where length(trim(coalesce(p_query, ''))) >= 2
    and public.jobbie_unaccent(c.name) ilike '%' || public.jobbie_unaccent(trim(p_query)) || '%'
  order by
    case
      when public.jobbie_unaccent(c.name) ilike public.jobbie_unaccent(trim(p_query)) || '%' then 0
      else 1
    end,
    c.name
  limit least(greatest(coalesce(p_limit, 50), 1), 80);
$$;

comment on function public.search_sk_companies(text, int) is
  'Accent-insensitive company name search over sk_companies (RPO cache).';

grant execute on function public.search_sk_companies(text, int) to anon, authenticated, service_role;

-- Service-role batch upsert after RPO search (Nest write-through cache).
create or replace function public.upsert_sk_companies_batch(p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return 0;
  end if;

  insert into public.sk_companies (rpo_id, name, ico, municipality, updated_at)
  select
    (elem->>'rpo_id')::bigint,
    trim(elem->>'name'),
    nullif(trim(elem->>'ico'), ''),
    nullif(trim(elem->>'municipality'), ''),
    now()
  from jsonb_array_elements(p_rows) as elem
  where coalesce((elem->>'rpo_id')::bigint, 0) > 0
    and length(trim(coalesce(elem->>'name', ''))) >= 2
  on conflict (rpo_id) do update set
    name = excluded.name,
    ico = coalesce(excluded.ico, public.sk_companies.ico),
    municipality = coalesce(excluded.municipality, public.sk_companies.municipality),
    updated_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.upsert_sk_companies_batch(jsonb) is
  'Upsert RPO search hits into sk_companies; service_role only.';

revoke all on function public.upsert_sk_companies_batch(jsonb) from public;
grant execute on function public.upsert_sk_companies_batch(jsonb) to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260623160000_sk_education_institutions.sql
-- -----------------------------------------------------------------------------

-- Slovak/Czech education institutions for CV school name picker (static catalog).

create table if not exists public.sk_education_institutions (
  id bigint generated always as identity primary key,
  name text not null,
  level text not null,
  country char(2) not null default 'SK',
  municipality text null,
  constraint sk_education_institutions_level_check
    check (level in ('secondary', 'university')),
  constraint sk_education_institutions_country_check
    check (country in ('SK', 'CZ')),
  constraint sk_education_institutions_name_len
    check (char_length(trim(name)) >= 2 and char_length(name) <= 500),
  constraint sk_education_institutions_name_level_country_key
    unique (name, level, country)
);

comment on table public.sk_education_institutions is
  'Cached school/university names for CV education autocomplete; seeded from CVTI SR / MSMT lists.';

create index if not exists idx_sk_education_institutions_name_unaccent_trgm
  on public.sk_education_institutions
  using gin (public.jobbie_unaccent(name) gin_trgm_ops);

create index if not exists idx_sk_education_institutions_level_country
  on public.sk_education_institutions (level, country);

alter table public.sk_education_institutions enable row level security;

create policy sk_education_institutions_select_authenticated
  on public.sk_education_institutions
  for select
  to authenticated
  using (true);

create policy sk_education_institutions_select_anon
  on public.sk_education_institutions
  for select
  to anon
  using (true);

grant select on public.sk_education_institutions to anon, authenticated, service_role;

create or replace function public.search_sk_education_institutions(
  p_query text,
  p_level text,
  p_limit int
)
returns table (id bigint, name text, level text, country text, municipality text)
language sql
stable
parallel safe
as $$
  select i.id, i.name, i.level, i.country::text, i.municipality
  from public.sk_education_institutions i
  where length(trim(coalesce(p_query, ''))) >= 2
    and i.level = case
      when p_level = 'secondary' then 'secondary'
      when p_level = 'university' then 'university'
      else ''
    end
    and (
      (p_level = 'secondary' and i.level = 'secondary' and i.country = 'SK')
      or (p_level = 'university' and i.level = 'university' and i.country in ('SK', 'CZ'))
    )
    and public.jobbie_unaccent(i.name) ilike '%' || public.jobbie_unaccent(trim(p_query)) || '%'
  order by
    case
      when public.jobbie_unaccent(i.name) ilike public.jobbie_unaccent(trim(p_query)) || '%' then 0
      else 1
    end,
    case when i.country = 'SK' then 0 else 1 end,
    i.name
  limit least(greatest(coalesce(p_limit, 50), 1), 80);
$$;

comment on function public.search_sk_education_institutions(text, text, int) is
  'Accent-insensitive school search; p_level secondary (SK only) or university (SK+CZ).';

grant execute on function public.search_sk_education_institutions(text, text, int)
  to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260623160100_sk_education_institutions_seed.sql
-- -----------------------------------------------------------------------------

-- Seed: Slovak secondary schools + SK/CZ universities
-- Generated by supabase/scripts/generate_sk_schools_seed.py
-- CSV: supabase/seeds/sk-schools-secondary.csv, sk-schools-universities.csv
INSERT INTO public.sk_education_institutions (name, level, country, municipality) VALUES
  ('1. súkromné gymnázium v Bratislave', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Arcibiskupské gymnázium biskupa P. Jantauscha, Stredná odborná škola pedagogická bl. Laury a Cirkevná materská škola sv.', 'secondary', 'SK', 'Trnava'),
  ('Bilingválne gymnázium C. S. Lewisa', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Bilingválne gymnázium Milana Hodžu', 'secondary', 'SK', 'Sučany'),
  ('Bilingválne slovensko - španielske gymnázium', 'secondary', 'SK', 'Nové Mesto nad Váhom'),
  ('Cirkevná stredná odborná škola elektrotechnická P. G. Frassatiho', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Cirkevná stredná odborná škola sv.Terézie z Lisieux', 'secondary', 'SK', 'Bánovce nad Bebravou'),
  ('Cirkevné gymnázium Andreja Radlinského ako organizačná zložka Cirkevnej spojenej školy', 'secondary', 'SK', 'Dolný Kubín'),
  ('Cirkevné gymnázium F. Fegyvernekiho s vyučovacím jazykom maďarským - Fegyverneki Ferenc Egyházi Gimnázium - ako organiza', 'secondary', 'SK', 'Šahy'),
  ('Cirkevné gymnázium Marianum s vyučovacím jazykom maďarským - Marianum Egyházi Gimnázium', 'secondary', 'SK', 'Komárno'),
  ('Cirkevné gymnázium sv. Františka z Assisi ako organizačná zložka Cirkevnej spojenej školy', 'secondary', 'SK', 'Vranov nad Topľou'),
  ('Cirkevné gymnázium sv. Jána Krstiteľa', 'secondary', 'SK', 'Trebišov'),
  ('Cirkevné gymnázium Štefana Mišíka', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Cirkevné konzervatórium', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Elokované pracovisko ako súčasť Spojenej školy - Praktická škola', 'secondary', 'SK', 'Košice-Západ'),
  ('Elokované pracovisko ako súčasť Školy pre mimoriadne nadané deti a GYMNÁZIUM', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Evanjelická praktická škola internátna ako organizačná zložka Evanjelickej spojenej školy internátnej', 'secondary', 'SK', 'Červenica'),
  ('Evanjelické gymnázium (Banská Bystrica)', 'secondary', 'SK', 'Banská Bystrica'),
  ('Evanjelické gymnázium (Tisovec)', 'secondary', 'SK', 'Tisovec'),
  ('Evanjelické gymnázium ako organizačná zložka Evanjelickej spojenej školy', 'secondary', 'SK', 'Martin'),
  ('Evanjelické gymnázium Jana Amosa Komenského', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Evanjelické gymnázium Juraja Tranovského ako organizačná zložka Evanjelickej spojenej školy', 'secondary', 'SK', 'Liptovský Mikuláš'),
  ('Evanjelické kolegiálne gymnázium ako organizačná zložka Evanjelickej spojenej školy', 'secondary', 'SK', 'Prešov'),
  ('Evanjelické lýceum', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Gymnázium  sv. Jána Pavla II. ako organizačná zložka Spojenej školy sv. Jána Pavla II.', 'secondary', 'SK', 'Poprad'),
  ('Gymnázium (Bratislava-Dúbravka)', 'secondary', 'SK', 'Bratislava-Dúbravka'),
  ('Gymnázium (Bratislava-Karlova Ves)', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Gymnázium (Bratislava-Rača)', 'secondary', 'SK', 'Bratislava-Rača'),
  ('Gymnázium (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Gymnázium (Bratislava-Staré Mesto)', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Gymnázium (Bytča)', 'secondary', 'SK', 'Bytča'),
  ('Gymnázium (Dubnica nad Váhom)', 'secondary', 'SK', 'Dubnica nad Váhom'),
  ('Gymnázium (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Gymnázium (Košice-Sever)', 'secondary', 'SK', 'Košice-Sever'),
  ('Gymnázium (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Gymnázium (Košice-Vyšné Opátske)', 'secondary', 'SK', 'Košice-Vyšné Opátske'),
  ('Gymnázium (Košice-Západ)', 'secondary', 'SK', 'Košice-Západ'),
  ('Gymnázium (Lipany)', 'secondary', 'SK', 'Lipany'),
  ('Gymnázium (Malacky)', 'secondary', 'SK', 'Malacky'),
  ('Gymnázium (Michalovce)', 'secondary', 'SK', 'Michalovce'),
  ('Gymnázium (Myjava)', 'secondary', 'SK', 'Myjava'),
  ('Gymnázium (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Gymnázium (Nové Zámky)', 'secondary', 'SK', 'Nové Zámky'),
  ('Gymnázium (Partizánske)', 'secondary', 'SK', 'Partizánske'),
  ('Gymnázium (Pezinok)', 'secondary', 'SK', 'Pezinok'),
  ('Gymnázium (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Gymnázium (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Gymnázium (Púchov)', 'secondary', 'SK', 'Púchov'),
  ('Gymnázium (Ružomberok)', 'secondary', 'SK', 'Ružomberok'),
  ('Gymnázium (Snina)', 'secondary', 'SK', 'Snina'),
  ('Gymnázium (Spišská Nová Ves)', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Gymnázium (Stropkov)', 'secondary', 'SK', 'Stropkov'),
  ('Gymnázium (Topoľčany)', 'secondary', 'SK', 'Topoľčany'),
  ('Gymnázium (Vráble)', 'secondary', 'SK', 'Vráble'),
  ('Gymnázium (Šurany)', 'secondary', 'SK', 'Šurany'),
  ('Gymnázium (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Gymnázium - Gimnázium', 'secondary', 'SK', 'Kráľovský Chlmec'),
  ('Gymnázium - Gimnázium a Stredná odborná škola - Szakközépiskola', 'secondary', 'SK', 'Fiľakovo'),
  ('Gymnázium - Gimnázium, Gymnázium Jána Amosa Komenského - Comenius Gimnázium a Stredná odborná škola techniky, služieb a', 'secondary', 'SK', 'Štúrovo'),
  ('Gymnázium a Obchodná akadémia', 'secondary', 'SK', 'Trebišov'),
  ('Gymnázium a Stredná odborná škola obchodu a služieb', 'secondary', 'SK', 'Sobrance'),
  ('Gymnázium a Stredná odborná škola techniky a služieb (Gelnica)', 'secondary', 'SK', 'Gelnica'),
  ('Gymnázium a Stredná odborná škola techniky a služieb (Spišská Nová Ves)', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Gymnázium a Stredná odborná škola techniky a služieb - Műszaki és Szolgáltatóipari Szakközépiskola, Mládežnícka 22, Šahy', 'secondary', 'SK', 'Šahy'),
  ('Gymnázium a Stredná športová škola Jozefa Herdu', 'secondary', 'SK', 'Trnava'),
  ('GYMNÁZIUM a Základná škola s vyučovacím jazykom maďarským - Márai Sándor Magyar Tanítási Nyelvű Gimnázium és Alapiskola', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Gymnázium ako organizačná zložka Spojenej školy (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Gymnázium ako organizačná zložka Spojenej školy (Giraltovce)', 'secondary', 'SK', 'Giraltovce'),
  ('Gymnázium ako organizačná zložka Spojenej školy (Liptovský Hrádok)', 'secondary', 'SK', 'Liptovský Hrádok'),
  ('Gymnázium ako organizačná zložka Spojenej školy (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Gymnázium ako organizačná zložka Spojenej školy (Rajec)', 'secondary', 'SK', 'Rajec'),
  ('Gymnázium ako organizačná zložka Spojenej školy (Spišská Stará Ves)', 'secondary', 'SK', 'Spišská Stará Ves'),
  ('Gymnázium ako organizačná zložka Spojenej školy Juraja Turza', 'secondary', 'SK', 'Turzovka'),
  ('Gymnázium ako organizačná zložka Spojenej školy sv. Jozefa', 'secondary', 'SK', 'Nové Mesto nad Váhom'),
  ('Gymnázium ako organizačná zložka Spojenej školy Tarasa Ševčenka s vyučovacím jazykom ukrajinským', 'secondary', 'SK', 'Prešov'),
  ('Gymnázium Alberta Einsteina', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Gymnázium Andreja Kmeťa', 'secondary', 'SK', 'Banská Štiavnica'),
  ('Gymnázium Andreja Sládkoviča', 'secondary', 'SK', 'Banská Bystrica'),
  ('Gymnázium Andreja Sládkoviča a Stredná odborná škola obchodu a služieb', 'secondary', 'SK', 'Krupina'),
  ('Gymnázium Andreja Vrábla', 'secondary', 'SK', 'Levice'),
  ('Gymnázium Angely Merici', 'secondary', 'SK', 'Trnava'),
  ('Gymnázium Antona Bernoláka (Námestovo)', 'secondary', 'SK', 'Námestovo'),
  ('Gymnázium Antona Bernoláka (Senec)', 'secondary', 'SK', 'Senec'),
  ('Gymnázium arm. gen. Ludvíka Svobodu', 'secondary', 'SK', 'Humenné'),
  ('Gymnázium Augusta Horislava Škultétyho, Obchodná akadémia a Stredná odborná škola', 'secondary', 'SK', 'Veľký Krtíš'),
  ('Gymnázium bilingválne', 'secondary', 'SK', 'Žilina'),
  ('Gymnázium bl. biskupa Gojdiča ako organizačná zložka Spojenej školy bl. biskupa Gojdiča', 'secondary', 'SK', 'Prešov'),
  ('Gymnázium bl. Sáry Salkaházi s vyučovacím jazykom maďarským - Boldog Salkaházi Sára Egyházi Gimnázium, ako organizačná z', 'secondary', 'SK', 'Moldava nad Bodvou'),
  ('Gymnázium Boženy Slančíkovej - Timravy a Obchodná akadémia', 'secondary', 'SK', 'Lučenec'),
  ('Gymnázium Cyrila Daxnera', 'secondary', 'SK', 'Vranov nad Topľou'),
  ('Gymnázium Dominika Tatarku', 'secondary', 'SK', 'Považská Bystrica'),
  ('Gymnázium duklianskych hrdinov', 'secondary', 'SK', 'Svidník'),
  ('Gymnázium Federica Garcíu Lorcu', 'secondary', 'SK', 'Bratislava-Podunajské Bis'),
  ('Gymnázium Františka Víťazoslava Sasinka', 'secondary', 'SK', 'Skalica'),
  ('Gymnázium Františka Švantnera', 'secondary', 'SK', 'Nová Baňa'),
  ('Gymnázium Hansa Selyeho s vyučovacím jazykom maďarským - Selye János Gimnázium', 'secondary', 'SK', 'Komárno'),
  ('Gymnázium Imre Madácha s vyučovacím jazykom maďarským - Madách Imre Magyar Tanítási Nyelvű Gimnázium', 'secondary', 'SK', 'Šamorín'),
  ('Gymnázium Ivana Horvátha', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Gymnázium Ivana Kraska - Ivan Krasko Gimnázium a Obchodná akadémia - Kereskedelmi Akadémia', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Gymnázium Ivana Kupca', 'secondary', 'SK', 'Hlohovec'),
  ('Gymnázium Janka Francisciho - Rimavského', 'secondary', 'SK', 'Levoča'),
  ('Gymnázium Janka Jesenského', 'secondary', 'SK', 'Bánovce nad Bebravou'),
  ('Gymnázium Janka Kráľa', 'secondary', 'SK', 'Zlaté Moravce'),
  ('Gymnázium Janka Matúšku', 'secondary', 'SK', 'Galanta'),
  ('Gymnázium Jozefa Cígera Hronského ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Vrútky'),
  ('Gymnázium Jozefa Gregora Tajovského', 'secondary', 'SK', 'Banská Bystrica'),
  ('Gymnázium Jozefa Lettricha', 'secondary', 'SK', 'Martin'),
  ('Gymnázium Jozefa Miloslava Hurbana', 'secondary', 'SK', 'Čadca'),
  ('Gymnázium Juraja Fándlyho', 'secondary', 'SK', 'Šaľa'),
  ('Gymnázium Juraja Szondyho s vyučovacím jazykom maďarským - Szondy György Gimnázium, ako org.zložka Základná škola Lajosa', 'secondary', 'SK', 'Šahy'),
  ('Gymnázium Jána Adama Raymana', 'secondary', 'SK', 'Prešov'),
  ('Gymnázium Jána Baltazára Magina', 'secondary', 'SK', 'Vrbové'),
  ('Gymnázium Jána Chalupku', 'secondary', 'SK', 'Brezno'),
  ('Gymnázium Jána Hollého', 'secondary', 'SK', 'Trnava'),
  ('Gymnázium Jána Papánka', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Gymnázium Karola Štúra', 'secondary', 'SK', 'Modra'),
  ('Gymnázium Kráľovnej pokoja ako organizačná zložka Spojenej školy Kraľovnej pokoja', 'secondary', 'SK', 'Žilina'),
  ('Gymnázium Ladislava Dúbravu', 'secondary', 'SK', 'Dunajská Streda'),
  ('Gymnázium Ladislava Novomeského (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Gymnázium Ladislava Novomeského (Senica)', 'secondary', 'SK', 'Senica'),
  ('Gymnázium Leonarda Stöckela', 'secondary', 'SK', 'Bardejov'),
  ('Gymnázium M. Galandu ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Turčianske Teplice'),
  ('Gymnázium M. R. Štefánika', 'secondary', 'SK', 'Nové Mesto nad Váhom'),
  ('Gymnázium M.R. Štefánika ako organizačná zložka Gymnázia M. R. Štefánika a Základnej školy', 'secondary', 'SK', 'Šamorín'),
  ('Gymnázium Martina Hattalu', 'secondary', 'SK', 'Trstená'),
  ('Gymnázium Martina Kukučína a Stredná odborná škola', 'secondary', 'SK', 'Revúca'),
  ('Gymnázium Matky Alexie', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Gymnázium Michala Miloslava Hodžu', 'secondary', 'SK', 'Liptovský Mikuláš'),
  ('Gymnázium Mihálya Tompu Reformovanej kresťanskej cirkvi s vyučovacím jazykom maďarským - Tompa Mihály Református Gimnázi', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Gymnázium Mikuláša Kováča', 'secondary', 'SK', 'Banská Bystrica'),
  ('Gymnázium Milana Rastislava Štefánika', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Gymnázium Milana Rúfusa', 'secondary', 'SK', 'Žiar nad Hronom'),
  ('Gymnázium Pavla Horova', 'secondary', 'SK', 'Michalovce'),
  ('Gymnázium Pavla Jozefa Šafárika - Pavol Jozef Šafárik Gimnázium', 'secondary', 'SK', 'Rožňava'),
  ('Gymnázium Pavla Országha Hviezdoslava (Dolný Kubín)', 'secondary', 'SK', 'Dolný Kubín'),
  ('Gymnázium Pavla Országha Hviezdoslava (Kežmarok)', 'secondary', 'SK', 'Kežmarok'),
  ('Gymnázium Petra Pázmáňa s vyučovacím jazykom maďarským - Pázmány Péter Gimnázium', 'secondary', 'SK', 'Nové Zámky'),
  ('Gymnázium Pierra de Coubertina', 'secondary', 'SK', 'Piešťany'),
  ('Gymnázium sv. Andreja', 'secondary', 'SK', 'Ružomberok'),
  ('Gymnázium sv. Cyrila a Metoda ako organizačná zložka Cirkevnej spojenej školy (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Gymnázium sv. Cyrila a Metoda ako organizačná zložka Cirkevnej spojenej školy (Snina)', 'secondary', 'SK', 'Snina'),
  ('Gymnázium sv. Edity Steinovej', 'secondary', 'SK', 'Košice-Dargovských hrdino'),
  ('Gymnázium sv. Františka Assiského', 'secondary', 'SK', 'Levoča'),
  ('Gymnázium sv. Františka Assiského, ako organizačná zložka Spojenej školy sv. Františka Assiského', 'secondary', 'SK', 'Malacky'),
  ('Gymnázium sv. Františka z Assisi', 'secondary', 'SK', 'Žilina'),
  ('Gymnázium sv. Františka z Assisi, ako organizačná zložka Spojenej školy sv. Františka z Assisi', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Gymnázium sv. Jána Bosca ako organizačná zložka Cirkevnej spojenej školy', 'secondary', 'SK', 'Bardejov'),
  ('Gymnázium sv. Jána Zlatoústeho', 'secondary', 'SK', 'Humenné'),
  ('Gymnázium sv. Košických mučeníkov ako organizačná zložka Spojenej školy sv. Košických mučeníkov', 'secondary', 'SK', 'Košice-Sídlisko KVP'),
  ('Gymnázium sv. Mikuláša ako organizačná zložka Katolíckej spojenenej školy sv. Mikuláša', 'secondary', 'SK', 'Prešov'),
  ('Gymnázium sv. Mikuláša ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Stará Ľubovňa'),
  ('Gymnázium sv. Moniky', 'secondary', 'SK', 'Prešov'),
  ('Gymnázium sv. Tomáša Akvinského', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Gymnázium sv. Uršule ako organizačná zložka Spojenej školy sv. Uršule', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Gymnázium sv. Vincenta de Paul ako organizačná zložka Katolíckej spojenej školy sv. Vincenta de Paul', 'secondary', 'SK', 'Levice'),
  ('Gymnázium Svätej Rodiny, ako organizačná zložka Spojenej školy Svätej Rodiny', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Gymnázium Terézie Vansovej', 'secondary', 'SK', 'Stará Ľubovňa'),
  ('Gymnázium Vavrinca Benedikta Nedožerského', 'secondary', 'SK', 'Prievidza'),
  ('Gymnázium Viliama Paulinyho Tótha a Obchodná akadémia', 'secondary', 'SK', 'Martin'),
  ('Gymnázium Vojtecha Mihálika', 'secondary', 'SK', 'Sereď'),
  ('Gymnázium Zoltána Kodálya s vyučovacím jazykom maďarským - Kodály Zoltán Gimnázium', 'secondary', 'SK', 'Galanta'),
  ('Gymnázium Ármina Vámbéryho s vyučovacím jazykom maďarským - Vámbéry Ármin Gimnázium', 'secondary', 'SK', 'Dunajská Streda'),
  ('Gymnázium Ľudovíta Jaroslava Šuleka', 'secondary', 'SK', 'Komárno'),
  ('Gymnázium Ľudovíta Štúra (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Gymnázium Ľudovíta Štúra (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Gymnázium školských bratov, ako organizačná zložka Spojenej školy de La Salle', 'secondary', 'SK', 'Bratislava-Rača'),
  ('Gymnázium Štefana Moysesa a Stredná odborná škola agrotechnická - Agrotechnikai Szakközépiskola', 'secondary', 'SK', 'Moldava nad Bodvou'),
  ('Gymnázium, ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Gymnázium, ako organizačná zložka Spojenej školy sv. Vincenta de Paul', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Gymnázium, Obchodná akadémia a Stredná odborná škola technická', 'secondary', 'SK', 'Detva'),
  ('Gymnázium-Gimnázium a Stredná odborná škola techniky a služieb-Műszaki és Szolgáltatóipari Szakközépiskola', 'secondary', 'SK', 'Veľké Kapušany'),
  ('Hotelová akadémia (Bratislava-Nové Mesto)', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Hotelová akadémia (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Hotelová akadémia (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Hotelová akadémia (Liptovský Mikuláš)', 'secondary', 'SK', 'Liptovský Mikuláš'),
  ('Hotelová akadémia (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Hotelová akadémia (Spišská Nová Ves)', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Hotelová akadémia (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Hotelová akadémia a Obchodná akadémia', 'secondary', 'SK', 'Brezno'),
  ('Hotelová akadémia Otta Brucknera', 'secondary', 'SK', 'Kežmarok'),
  ('Hotelová akadémia Ľudovíta Wintera', 'secondary', 'SK', 'Piešťany'),
  ('Katolícka spojená škola sv. Františka Assiského', 'secondary', 'SK', 'Banská Štiavnica'),
  ('Katolícke gymnázium Štefana Moysesa', 'secondary', 'SK', 'Banská Bystrica'),
  ('Konzervatórium (Bratislava-Staré Mesto)', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Konzervatórium (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Konzervatórium Jozefa Adamoviča a Konzervatórium Petra Dvorského', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Konzervatórium Jána Levoslava Bellu', 'secondary', 'SK', 'Banská Bystrica'),
  ('Obchodná akadémia (Bratislava-Nové Mesto)', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Obchodná akadémia (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Obchodná akadémia (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Obchodná akadémia (Dolný Kubín)', 'secondary', 'SK', 'Dolný Kubín'),
  ('Obchodná akadémia (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Obchodná akadémia (Košice-Nad jazerom)', 'secondary', 'SK', 'Košice-Nad jazerom'),
  ('Obchodná akadémia (Košice-Sever)', 'secondary', 'SK', 'Košice-Sever'),
  ('Obchodná akadémia (Michalovce)', 'secondary', 'SK', 'Michalovce'),
  ('Obchodná akadémia (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Obchodná akadémia (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Obchodná akadémia (Považská Bystrica)', 'secondary', 'SK', 'Považská Bystrica'),
  ('Obchodná akadémia (Prievidza)', 'secondary', 'SK', 'Prievidza'),
  ('Obchodná akadémia (Ružomberok)', 'secondary', 'SK', 'Ružomberok'),
  ('Obchodná akadémia (Senica)', 'secondary', 'SK', 'Senica'),
  ('Obchodná akadémia (Sereď)', 'secondary', 'SK', 'Sereď'),
  ('Obchodná akadémia (Topoľčany)', 'secondary', 'SK', 'Topoľčany'),
  ('Obchodná akadémia (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Obchodná akadémia (Vranov nad Topľou)', 'secondary', 'SK', 'Vranov nad Topľou'),
  ('Obchodná akadémia (Šurany)', 'secondary', 'SK', 'Šurany'),
  ('Obchodná akadémia (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Obchodná akadémia - Kereskedelmi Akadémia', 'secondary', 'SK', 'Veľký Meder'),
  ('Obchodná akadémia a Stredná odborná škola obchodu a služieb', 'secondary', 'SK', 'Rožňava'),
  ('Obchodná akadémia a Stredná odborná škola obchodu a služieb, SNP 5, Zlaté Moravce', 'secondary', 'SK', 'Zlaté Moravce'),
  ('Obchodná akadémia ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Svidník'),
  ('Obchodná akadémia Dušana Metoda Janotu', 'secondary', 'SK', 'Čadca'),
  ('Obchodná akadémia Imricha Karvaša', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Obchodná akadémia Mareka Frauwirtha', 'secondary', 'SK', 'Banská Bystrica'),
  ('Obchodná akadémia Milana Hodžu', 'secondary', 'SK', 'Trenčín'),
  ('Obchodná akadémia Petra Zaťka', 'secondary', 'SK', 'Liptovský Mikuláš'),
  ('Obchodná akadémia sv. Tomáša Akvinského', 'secondary', 'SK', 'Žilina'),
  ('Obchodná akadémia, Ul. Kálmána Kittenbergera 2', 'secondary', 'SK', 'Levice'),
  ('Odborné učilište', 'secondary', 'SK', 'Martin'),
  ('Odborné učilište internátne (Ladce)', 'secondary', 'SK', 'Ladce'),
  ('Odborné učilište internátne (Lučenec)', 'secondary', 'SK', 'Lučenec'),
  ('Odborné učilište internátne (Mojmírovce)', 'secondary', 'SK', 'Mojmírovce'),
  ('Odborné učilište internátne (Nová Ves nad Žitavou)', 'secondary', 'SK', 'Nová Ves nad Žitavou'),
  ('Odborné učilište internátne (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Odborné učilište internátne (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Odborné učilište internátne (Želovce)', 'secondary', 'SK', 'Želovce'),
  ('Odborné učilište internátne - Bentlakásos Speciális Szakiskola ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Okoč'),
  ('Odborné učilište internátne ako organizačná zložka Spojenej školy internátnej', 'secondary', 'SK', 'Tornaľa'),
  ('Odborné učilište internátne Viliama Gaňu', 'secondary', 'SK', 'Banská Bystrica'),
  ('Odborné učilište pri reedukačnom centre', 'secondary', 'SK', 'Veľké Leváre'),
  ('Piaristická spojená škola Františka Hanáka', 'secondary', 'SK', 'Prievidza'),
  ('Piaristické gymnázium Jozefa Braneckého', 'secondary', 'SK', 'Trenčín'),
  ('Piaristické gymnázium sv. Jozefa Kalazanského ako organizačná zložka Piaristickej spojenej školy sv. Jozefa Kalazanského', 'secondary', 'SK', 'Nitra'),
  ('Praktická škola', 'secondary', 'SK', 'Sečovce'),
  ('Praktická škola - Készségfejlesztő ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Kráľovský Chlmec'),
  ('Praktická škola - Készségfejlesztő Iskola ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Sládkovičovo'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Dubnica nad Váhom)', 'secondary', 'SK', 'Dubnica nad Váhom'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Kežmarok)', 'secondary', 'SK', 'Kežmarok'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Komárno)', 'secondary', 'SK', 'Komárno'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Martin)', 'secondary', 'SK', 'Martin'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Myjava)', 'secondary', 'SK', 'Myjava'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Nové Mesto nad Váhom)', 'secondary', 'SK', 'Nové Mesto nad Váhom'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Pavlovce nad Uhom)', 'secondary', 'SK', 'Pavlovce nad Uhom'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Piešťany)', 'secondary', 'SK', 'Piešťany'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Považská Bystrica)', 'secondary', 'SK', 'Považská Bystrica'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Púchov)', 'secondary', 'SK', 'Púchov'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Trenčianska Teplá)', 'secondary', 'SK', 'Trenčianska Teplá'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Vranov nad Topľou)', 'secondary', 'SK', 'Vranov nad Topľou'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Vrbové)', 'secondary', 'SK', 'Vrbové'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Čadca)', 'secondary', 'SK', 'Čadca'),
  ('Praktická škola ako organizačná zložka Spojenej školy internátnej (Bytča)', 'secondary', 'SK', 'Bytča'),
  ('Praktická škola ako organizačná zložka Spojenej školy internátnej (Levice)', 'secondary', 'SK', 'Levice'),
  ('Praktická škola ako organizačná zložka Spojenej školy internátnej (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Praktická škola ako organizačná zložka Spojenej školy internátnej (Prievidza)', 'secondary', 'SK', 'Prievidza'),
  ('Praktická škola ako organizačná zložka Spojenej školy internátnej (Topoľčany)', 'secondary', 'SK', 'Topoľčany'),
  ('Praktická škola ako súčasť Špeciálnej základnej školy (Banská Bystrica)', 'secondary', 'SK', 'Banská Bystrica'),
  ('Praktická škola ako súčasť Špeciálnej základnej školy (Jelšava)', 'secondary', 'SK', 'Jelšava'),
  ('Praktická škola ako súčasť Špeciálnej základnej školy (Lučenec)', 'secondary', 'SK', 'Lučenec'),
  ('Praktická škola ako súčasť Špeciálnej základnej školy (Rimavská Sobota)', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Praktická škola internátna ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Senica'),
  ('Praktická škola internátna ako organizačná zložka Spojenej školy internátnej (Levoča)', 'secondary', 'SK', 'Levoča'),
  ('Praktická škola internátna ako organizačná zložka Spojenej školy internátnej (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Praktická škola internátna ako organizačná zložka Spojenej školy internátnej (Spišské Vlachy)', 'secondary', 'SK', 'Spišské Vlachy'),
  ('Praktická škola internátna ako organizačná zložka Spojenej školy internátnej (Ždaňa)', 'secondary', 'SK', 'Ždaňa'),
  ('Praktická škola s vyučovacím jazykom maďarským - Készégfejlesztö Iskola ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Dunajská Streda'),
  ('Praktická škola s vyučovacím jazykom maďarským ako súčasť Špeciálnej základnej školy s vyučovacím jazykom maďarským', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Praktická škola sv. Jozefa ako organizačná zložka Spojenej školy sv. Jozefa', 'secondary', 'SK', 'Turzovka'),
  ('Praktická škola sv. Maximiliána Mária Kolbeho ako organizačná zložka Spojenej školy sv.M.M.Kolbeho', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Praktická škola, ako organizačná zložka Spojenej školy (Bratislava-Dúbravka)', 'secondary', 'SK', 'Bratislava-Dúbravka'),
  ('Praktická škola, ako organizačná zložka Spojenej školy (Bratislava-Karlova Ves)', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Praktická škola, ako organizačná zložka Spojenej školy (Malacky)', 'secondary', 'SK', 'Malacky'),
  ('Praktická škola, ako organizačná zložka Spojenej školy (Pezinok)', 'secondary', 'SK', 'Pezinok'),
  ('Praktická škola, ako organizačná zložka Spojenej školy (Senec)', 'secondary', 'SK', 'Senec'),
  ('Premonštrátske gymnázium', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Reedukačné centrum (Hlohovec)', 'secondary', 'SK', 'Hlohovec'),
  ('Reedukačné centrum (Levoča)', 'secondary', 'SK', 'Levoča'),
  ('Reedukačné centrum (Sološnica)', 'secondary', 'SK', 'Sološnica'),
  ('Reedukačné centrum (Tornaľa)', 'secondary', 'SK', 'Tornaľa'),
  ('Spojena škola', 'secondary', 'SK', 'Dunajská Streda'),
  ('Spojená katolícka škola', 'secondary', 'SK', 'Nitra'),
  ('Spojená škola (Banská Bystrica)', 'secondary', 'SK', 'Banská Bystrica'),
  ('Spojená škola (Bardejov)', 'secondary', 'SK', 'Bardejov'),
  ('Spojená škola (Bratislava-Karlova Ves)', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Spojená škola (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Spojená škola (Chminianske Jakubovany)', 'secondary', 'SK', 'Chminianske Jakubovany'),
  ('Spojená škola (Dobšiná)', 'secondary', 'SK', 'Dobšiná'),
  ('Spojená škola (Hlohovec)', 'secondary', 'SK', 'Hlohovec'),
  ('Spojená škola (Holíč)', 'secondary', 'SK', 'Holíč'),
  ('Spojená škola (Ivanka pri Dunaji)', 'secondary', 'SK', 'Ivanka pri Dunaji'),
  ('Spojená škola (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Spojená škola (Košice-Vyšné Opátske)', 'secondary', 'SK', 'Košice-Vyšné Opátske'),
  ('Spojená škola (Lipany)', 'secondary', 'SK', 'Lipany'),
  ('Spojená škola (Medzilaborce)', 'secondary', 'SK', 'Medzilaborce'),
  ('Spojená škola (Moldava nad Bodvou)', 'secondary', 'SK', 'Moldava nad Bodvou'),
  ('Spojená škola (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Spojená škola (Nižná)', 'secondary', 'SK', 'Nižná'),
  ('Spojená škola (Nová Baňa)', 'secondary', 'SK', 'Nová Baňa'),
  ('Spojená škola (Nové Zámky)', 'secondary', 'SK', 'Nové Zámky'),
  ('Spojená škola (Pezinok)', 'secondary', 'SK', 'Pezinok'),
  ('Spojená škola (Poltár)', 'secondary', 'SK', 'Poltár'),
  ('Spojená škola (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Spojená škola (Prievidza)', 'secondary', 'SK', 'Prievidza'),
  ('Spojená škola (Rudňany)', 'secondary', 'SK', 'Rudňany'),
  ('Spojená škola (Ružomberok)', 'secondary', 'SK', 'Ružomberok'),
  ('Spojená škola (Sabinov)', 'secondary', 'SK', 'Sabinov'),
  ('Spojená škola (Sečovce)', 'secondary', 'SK', 'Sečovce'),
  ('Spojená škola (Spišská Nová Ves)', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Spojená škola (Spišský Štiavnik)', 'secondary', 'SK', 'Spišský Štiavnik'),
  ('Spojená škola (Stará Ľubovňa)', 'secondary', 'SK', 'Stará Ľubovňa'),
  ('Spojená škola (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Spojená škola (Veľké Kapušany)', 'secondary', 'SK', 'Veľké Kapušany'),
  ('Spojená škola (Čaklov)', 'secondary', 'SK', 'Čaklov'),
  ('Spojená škola (Šaľa)', 'secondary', 'SK', 'Šaľa'),
  ('Spojená škola internátna (Bratislava-Karlova Ves)', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Spojená škola internátna (Bratislava-Nové Mesto)', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Spojená škola internátna (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Spojená škola internátna (Kremnica)', 'secondary', 'SK', 'Kremnica'),
  ('Spojená škola internátna (Kysucké Nové Mesto)', 'secondary', 'SK', 'Kysucké Nové Mesto'),
  ('Spojená škola internátna (Levoča)', 'secondary', 'SK', 'Levoča'),
  ('Spojená škola internátna (Liptovský Mikuláš)', 'secondary', 'SK', 'Liptovský Mikuláš'),
  ('Spojená škola internátna (Medzilaborce)', 'secondary', 'SK', 'Medzilaborce'),
  ('Spojená škola internátna (Michalovce)', 'secondary', 'SK', 'Michalovce'),
  ('Spojená škola internátna (Námestovo)', 'secondary', 'SK', 'Námestovo'),
  ('Spojená škola internátna (Prakovce)', 'secondary', 'SK', 'Prakovce'),
  ('Spojená škola internátna (Rožňava)', 'secondary', 'SK', 'Rožňava'),
  ('Spojená škola internátna (Snina)', 'secondary', 'SK', 'Snina'),
  ('Spojená škola internátna (Stará Ľubovňa)', 'secondary', 'SK', 'Stará Ľubovňa'),
  ('Spojená škola internátna (Svidník)', 'secondary', 'SK', 'Svidník'),
  ('Spojená škola internátna (Trebišov)', 'secondary', 'SK', 'Trebišov'),
  ('Spojená škola internátna (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Spojená škola internátna (Valaská)', 'secondary', 'SK', 'Valaská'),
  ('Spojená škola internátna (Vranov nad Topľou)', 'secondary', 'SK', 'Vranov nad Topľou'),
  ('Spojená škola internátna (Šahy)', 'secondary', 'SK', 'Šahy'),
  ('Spojená škola internátna (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Spojená škola Juraja Henischa', 'secondary', 'SK', 'Bardejov'),
  ('Spojená škola Jána Vojtaššáka internátna', 'secondary', 'SK', 'Levoča'),
  ('Spojená škola Pavla Sabadoša internátna', 'secondary', 'SK', 'Prešov'),
  ('Spojená škola Samuela Mikovíniho', 'secondary', 'SK', 'Banská Štiavnica'),
  ('Spojená škola sv. Jána Bosca', 'secondary', 'SK', 'Nová Dubnica'),
  ('Spojená škola sv. Klementa Hofbauera internátna', 'secondary', 'SK', 'Podolínec'),
  ('Stredná odborná škola (Banská Bystrica)', 'secondary', 'SK', 'Banská Bystrica'),
  ('Stredná odborná škola (Handlová)', 'secondary', 'SK', 'Handlová'),
  ('Stredná odborná škola (Hnúšťa)', 'secondary', 'SK', 'Hnúšťa'),
  ('Stredná odborná škola (Kežmarok)', 'secondary', 'SK', 'Kežmarok'),
  ('Stredná odborná škola (Nováky)', 'secondary', 'SK', 'Nováky'),
  ('Stredná odborná škola (Pruské)', 'secondary', 'SK', 'Pruské'),
  ('Stredná odborná škola (Snina)', 'secondary', 'SK', 'Snina'),
  ('Stredná odborná škola (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Stredná odborná škola (Vranov nad Topľou)', 'secondary', 'SK', 'Vranov nad Topľou'),
  ('Stredná odborná škola (Žarnovica)', 'secondary', 'SK', 'Žarnovica'),
  ('Stredná odborná škola - Szakközépiskola', 'secondary', 'SK', 'Tornaľa'),
  ('Stredná odborná škola agropotravinárska a technická', 'secondary', 'SK', 'Kežmarok'),
  ('Stredná odborná škola agrotechnická', 'secondary', 'SK', 'Topoľčany'),
  ('Stredná odborná škola automobilová (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Stredná odborná škola automobilová (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Stredná odborná škola automobilová a podnikania', 'secondary', 'SK', 'Senec'),
  ('Stredná odborná škola beauty služieb (Bratislava-Nové Mesto)', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Stredná odborná škola beauty služieb (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Stredná odborná škola chemická', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná odborná škola chemická a Škola umeleckého priemyslu', 'secondary', 'SK', 'Hlohovec'),
  ('Stredná odborná škola chovu koní a služieb - Lótenyésztési és Szolgáltatóipari Szakközépiskola', 'secondary', 'SK', 'Šaľa'),
  ('Stredná odborná škola dopravná (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná odborná škola dopravná (Martin)', 'secondary', 'SK', 'Martin'),
  ('Stredná odborná škola dopravná (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná odborná škola dopravná (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Stredná odborná škola dopravná (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná odborná škola dopravy a služieb (Nové Zámky)', 'secondary', 'SK', 'Nové Zámky'),
  ('Stredná odborná škola dopravy a služieb (Strážske)', 'secondary', 'SK', 'Strážske'),
  ('Stredná odborná škola drevárska (Spišská Nová Ves)', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Stredná odborná škola drevárska (Topoľčany)', 'secondary', 'SK', 'Topoľčany'),
  ('Stredná odborná škola drevárska (Vranov nad Topľou)', 'secondary', 'SK', 'Vranov nad Topľou'),
  ('Stredná odborná škola drevárska (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Stredná odborná škola drevárska a stavebná', 'secondary', 'SK', 'Krásno nad Kysucou'),
  ('Stredná odborná škola ekonomická', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Stredná odborná škola ekonomická a pedagogická s vyučovacím jazykom maďarským - Közgazdasági és Pedagógiai Szakközépisko', 'secondary', 'SK', 'Senec'),
  ('Stredná odborná škola ekonomiky, hotelierstva a služieb Jána Andraščíka', 'secondary', 'SK', 'Bardejov'),
  ('Stredná odborná škola elektrotechnická (Gbely)', 'secondary', 'SK', 'Gbely'),
  ('Stredná odborná škola elektrotechnická (Liptovský Hrádok)', 'secondary', 'SK', 'Liptovský Hrádok'),
  ('Stredná odborná škola elektrotechnická (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Stredná odborná škola elektrotechnická (Stropkov)', 'secondary', 'SK', 'Stropkov'),
  ('Stredná odborná škola elektrotechnická (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Stredná odborná škola elektrotechnická (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná odborná škola gastronómie a cestovného ruchu', 'secondary', 'SK', 'Nitra'),
  ('Stredná odborná škola gastronómie a hotelových služieb', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Stredná odborná škola gastronómie a služieb (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná odborná škola gastronómie a služieb (Šurany)', 'secondary', 'SK', 'Šurany'),
  ('Stredná odborná škola hotelová', 'secondary', 'SK', 'Vysoké Tatry'),
  ('Stredná odborná škola hotelových služieb a dopravy', 'secondary', 'SK', 'Lučenec'),
  ('Stredná odborná škola hotelových služieb a obchodu (Nové Zámky)', 'secondary', 'SK', 'Nové Zámky'),
  ('Stredná odborná škola hotelových služieb a obchodu (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Stredná odborná škola informačných technológií (Banská Bystrica)', 'secondary', 'SK', 'Banská Bystrica'),
  ('Stredná odborná škola informačných technológií (Bratislava-Rača)', 'secondary', 'SK', 'Bratislava-Rača'),
  ('Stredná odborná škola informačných technológií (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Stredná odborná škola Jána Antonína Baťu', 'secondary', 'SK', 'Partizánske'),
  ('Stredná odborná škola kaderníctva a vizážistiky', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná odborná škola lesnícka (Banská Štiavnica)', 'secondary', 'SK', 'Banská Štiavnica'),
  ('Stredná odborná škola lesnícka (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná odborná škola lesnícka a drevárska Jozefa Dekreta Matejovie', 'secondary', 'SK', 'Liptovský Hrádok'),
  ('Stredná odborná škola letecko - technická', 'secondary', 'SK', 'Trenčín'),
  ('Stredná odborná škola lýceum C. S. Lewisa', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Stredná odborná škola masmediálnych a informačných štúdií', 'secondary', 'SK', 'Bratislava-Rača'),
  ('Stredná odborná škola obchodu a služieb (Dolný Kubín)', 'secondary', 'SK', 'Dolný Kubín'),
  ('Stredná odborná škola obchodu a služieb (Galanta)', 'secondary', 'SK', 'Galanta'),
  ('Stredná odborná škola obchodu a služieb (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Stredná odborná škola obchodu a služieb (Martin)', 'secondary', 'SK', 'Martin'),
  ('Stredná odborná škola obchodu a služieb (Michalovce)', 'secondary', 'SK', 'Michalovce'),
  ('Stredná odborná škola obchodu a služieb (Nové Mesto nad Váhom)', 'secondary', 'SK', 'Nové Mesto nad Váhom'),
  ('Stredná odborná škola obchodu a služieb (Piešťany)', 'secondary', 'SK', 'Piešťany'),
  ('Stredná odborná škola obchodu a služieb (Prievidza)', 'secondary', 'SK', 'Prievidza'),
  ('Stredná odborná škola obchodu a služieb (Púchov)', 'secondary', 'SK', 'Púchov'),
  ('Stredná odborná škola obchodu a služieb (Rimavská Sobota)', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Stredná odborná škola obchodu a služieb (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Stredná odborná škola obchodu a služieb (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Stredná odborná škola obchodu a služieb (Čadca)', 'secondary', 'SK', 'Čadca'),
  ('Stredná odborná škola obchodu a služieb (Žiar nad Hronom)', 'secondary', 'SK', 'Žiar nad Hronom'),
  ('Stredná odborná škola obchodu a služieb - Kereskedelmi és Szolgáltatóipari Szakközépiskola', 'secondary', 'SK', 'Komárno'),
  ('Stredná odborná škola obchodu a služieb a Stredná odborná škola potravinárska', 'secondary', 'SK', 'Topoľčany'),
  ('Stredná odborná škola obchodu a služieb Jána Bocatia', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná odborná škola obchodu a služieb Samuela Jurkoviča', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná odborná škola obchodu, služieb a rozvoja vidieka - Kereskedelmi, Szolgáltatóipari és Vidékfejlesztési Szakközépi', 'secondary', 'SK', 'Kravany nad Dunajom'),
  ('Stredná odborná škola pedagogická (Bratislava-Dúbravka)', 'secondary', 'SK', 'Bratislava-Dúbravka'),
  ('Stredná odborná škola pedagogická (Levice)', 'secondary', 'SK', 'Levice'),
  ('Stredná odborná škola pedagogická (Levoča)', 'secondary', 'SK', 'Levoča'),
  ('Stredná odborná škola pedagogická (Modra)', 'secondary', 'SK', 'Modra'),
  ('Stredná odborná škola pedagogická (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná odborná škola pedagogická (Turčianske Teplice)', 'secondary', 'SK', 'Turčianske Teplice'),
  ('Stredná odborná škola pedagogická - Pedagógiai Szakközépiskola', 'secondary', 'SK', 'Lučenec'),
  ('Stredná odborná škola pedagogická sv. Andreja-Svorada a Benedikta', 'secondary', 'SK', 'Trenčín'),
  ('Stredná odborná škola pedagogická sv. Cyrila a Metoda', 'secondary', 'SK', 'Košice-Juh'),
  ('Stredná odborná škola pedagogická sv. Márie Goretti', 'secondary', 'SK', 'Čadca'),
  ('Stredná odborná škola podnikania a služieb (Lipany)', 'secondary', 'SK', 'Lipany'),
  ('Stredná odborná škola podnikania a služieb (Námestovo)', 'secondary', 'SK', 'Námestovo'),
  ('Stredná odborná škola podnikania a služieb (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná odborná škola podnikania v remeslách a službách', 'secondary', 'SK', 'Senica'),
  ('Stredná odborná škola polygrafická', 'secondary', 'SK', 'Bratislava-Rača'),
  ('Stredná odborná škola polytechnická (Dolný Kubín)', 'secondary', 'SK', 'Dolný Kubín'),
  ('Stredná odborná škola polytechnická (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Stredná odborná škola polytechnická (Martin)', 'secondary', 'SK', 'Martin'),
  ('Stredná odborná škola polytechnická (Prievidza)', 'secondary', 'SK', 'Prievidza'),
  ('Stredná odborná škola polytechnická (Ružomberok)', 'secondary', 'SK', 'Ružomberok'),
  ('Stredná odborná škola polytechnická (Zlaté Moravce)', 'secondary', 'SK', 'Zlaté Moravce'),
  ('Stredná odborná škola polytechnická a služieb arm. gen. L. Svobodu', 'secondary', 'SK', 'Svidník'),
  ('Stredná odborná škola polytechnická Jána Antonína Baťu', 'secondary', 'SK', 'Svit'),
  ('Stredná odborná škola potravinárska', 'secondary', 'SK', 'Nitra'),
  ('Stredná odborná škola poľnohospodárstva a služieb na vidieku (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Stredná odborná škola poľnohospodárstva a služieb na vidieku (Levice)', 'secondary', 'SK', 'Levice'),
  ('Stredná odborná škola poľnohospodárstva a služieb na vidieku (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Stredná odborná škola poľnohospodárstva a služieb na vidieku (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná odborná škola pre žiakov s telesným postihnutím', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Stredná odborná škola pri Reedukačnom centre', 'secondary', 'SK', 'Zlaté Moravce'),
  ('Stredná odborná škola priemyselných technológii', 'secondary', 'SK', 'Košice-Šaca'),
  ('Stredná odborná škola priemyselných technológií', 'secondary', 'SK', 'Púchov'),
  ('Stredná odborná škola regionálneho rozvoja a Stredná odborná škola záhradnícka', 'secondary', 'SK', 'Rakovice'),
  ('Stredná odborná škola remesiel', 'secondary', 'SK', 'Považská Bystrica'),
  ('Stredná odborná škola remesiel a služieb', 'secondary', 'SK', 'Poprad'),
  ('Stredná odborná škola rozvoja vidieka s vyučovacím jazykom maďarským - Vidékfejlesztési Szakközépiskola a Stredná športo', 'secondary', 'SK', 'Dunajská Streda'),
  ('Stredná odborná škola s vyučovacím jazykom maďarským - Szakközépiskola,  ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Rožňava'),
  ('Stredná odborná škola služieb (Levice)', 'secondary', 'SK', 'Levice'),
  ('Stredná odborná škola služieb (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná odborná škola služieb a priemyslu sv. Jozafáta', 'secondary', 'SK', 'Trebišov'),
  ('Stredná odborná škola služieb Majstra Pavla', 'secondary', 'SK', 'Levoča'),
  ('Stredná odborná škola stavebná (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Stredná odborná škola stavebná (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná odborná škola stavebná - Építészeti Szakközépiskola', 'secondary', 'SK', 'Nové Zámky'),
  ('Stredná odborná škola stavebná a Stredná odborná škola agropotravinárska a technická', 'secondary', 'SK', 'Liptovský Mikuláš'),
  ('Stredná odborná škola strojnícka (Bánovce nad Bebravou)', 'secondary', 'SK', 'Bánovce nad Bebravou'),
  ('Stredná odborná škola strojnícka (Kysucké Nové Mesto)', 'secondary', 'SK', 'Kysucké Nové Mesto'),
  ('Stredná odborná škola strojnícka (Považská Bystrica)', 'secondary', 'SK', 'Považská Bystrica'),
  ('Stredná odborná škola strojnícka (Skalica)', 'secondary', 'SK', 'Skalica'),
  ('Stredná odborná škola sv. Cyrila a Metoda', 'secondary', 'SK', 'Michalovce'),
  ('Stredná odborná škola sv. Jozefa Robotníka', 'secondary', 'SK', 'Žilina'),
  ('Stredná odborná škola technická (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Stredná odborná škola technická (Dubnica nad Váhom)', 'secondary', 'SK', 'Dubnica nad Váhom'),
  ('Stredná odborná škola technická (Hlohovec)', 'secondary', 'SK', 'Hlohovec'),
  ('Stredná odborná škola technická (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Stredná odborná škola technická (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Stredná odborná škola technická (Michalovce)', 'secondary', 'SK', 'Michalovce'),
  ('Stredná odborná škola technická (Námestovo)', 'secondary', 'SK', 'Námestovo'),
  ('Stredná odborná škola technická (Piešťany)', 'secondary', 'SK', 'Piešťany'),
  ('Stredná odborná škola technická (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Stredná odborná škola technická (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná odborná škola technická (Rožňava)', 'secondary', 'SK', 'Rožňava'),
  ('Stredná odborná škola technická (Tlmače)', 'secondary', 'SK', 'Tlmače'),
  ('Stredná odborná škola technická (Vráble)', 'secondary', 'SK', 'Vráble'),
  ('Stredná odborná škola technická (Zlaté Moravce)', 'secondary', 'SK', 'Zlaté Moravce'),
  ('Stredná odborná škola technická (Čadca)', 'secondary', 'SK', 'Čadca'),
  ('Stredná odborná škola technická (Šurany)', 'secondary', 'SK', 'Šurany'),
  ('Stredná odborná škola technická - Múszaki Szakközépiskola (Dunajská Streda)', 'secondary', 'SK', 'Dunajská Streda'),
  ('Stredná odborná škola technická - Múszaki Szakközépiskola (Galanta)', 'secondary', 'SK', 'Galanta'),
  ('Stredná odborná škola technická - Műszaki Szakközépiskola', 'secondary', 'SK', 'Komárno'),
  ('Stredná odborná škola technická a agropotravinárska - Műszaki, Mezőgazdasági és Élelmiszeripari Szakközépiskola', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Stredná odborná škola technická a ekonomická Jozefa Szakkayho - Szakkay József Műszaki és Közgazdasági Szakközépiskola', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná odborná škola techniky a mechanizácie - Műszaki és Gépesítési Szakközépiskola', 'secondary', 'SK', 'Hurbanovo'),
  ('Stredná odborná škola techniky a remesiel - Műszaki Szakok és Mesterségek Szakközépiskola', 'secondary', 'SK', 'Kráľovský Chlmec'),
  ('Stredná odborná škola techniky a služieb (Brezno)', 'secondary', 'SK', 'Brezno'),
  ('Stredná odborná škola techniky a služieb (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Stredná odborná škola techniky a služieb (Topoľčany)', 'secondary', 'SK', 'Topoľčany'),
  ('Stredná odborná škola techniky a služieb a Stredná priemyselná škola strojnícka a elektrotechnická, Pod amfiteátrom 7, L', 'secondary', 'SK', 'Levice'),
  ('Stredná odborná škola technológií a remesiel', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná odborná škola veterinárna (Košice-Barca)', 'secondary', 'SK', 'Košice-Barca'),
  ('Stredná odborná škola veterinárna (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Stredná odborná škola vinársko - ovocinárska', 'secondary', 'SK', 'Modra'),
  ('Stredná odborná škola železničná', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná priemyselná škola (Dubnica nad Váhom)', 'secondary', 'SK', 'Dubnica nad Váhom'),
  ('Stredná priemyselná škola (Myjava)', 'secondary', 'SK', 'Myjava'),
  ('Stredná priemyselná škola (Nové Mesto nad Váhom)', 'secondary', 'SK', 'Nové Mesto nad Váhom'),
  ('Stredná priemyselná škola (Považská Bystrica)', 'secondary', 'SK', 'Považská Bystrica'),
  ('Stredná priemyselná škola (Snina)', 'secondary', 'SK', 'Snina'),
  ('Stredná priemyselná škola (Stará Turá)', 'secondary', 'SK', 'Stará Turá'),
  ('Stredná priemyselná škola dopravná (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná priemyselná škola dopravná (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná priemyselná škola dopravná (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Stredná priemyselná škola dopravná (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Stredná priemyselná škola elektrotechnická (Bratislava-Dúbravka)', 'secondary', 'SK', 'Bratislava-Dúbravka'),
  ('Stredná priemyselná škola elektrotechnická (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Stredná priemyselná škola elektrotechnická (Bratislava-Staré Mesto)', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Stredná priemyselná škola elektrotechnická (Košice-Sever)', 'secondary', 'SK', 'Košice-Sever'),
  ('Stredná priemyselná škola elektrotechnická (Piešťany)', 'secondary', 'SK', 'Piešťany'),
  ('Stredná priemyselná škola elektrotechnická (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná priemyselná škola informačných technológií a Gymnázium', 'secondary', 'SK', 'Kysucké Nové Mesto'),
  ('Stredná priemyselná škola informačných technológií a umelej inteligencie Skyro', 'secondary', 'SK', 'Bratislava-Podunajské Bis'),
  ('Stredná priemyselná škola informačných technológií Ignáca Gessaya, Stredná odborná škola lesnícka a Gymnázium', 'secondary', 'SK', 'Tvrdošín'),
  ('Stredná priemyselná škola Jozefa Murgaša', 'secondary', 'SK', 'Banská Bystrica'),
  ('Stredná priemyselná škola stavebná (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Stredná priemyselná škola stavebná (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná priemyselná škola stavebná (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná priemyselná škola stavebná - Építőipari Szakközépiskola', 'secondary', 'SK', 'Hurbanovo'),
  ('Stredná priemyselná škola stavebná a geodetická (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná priemyselná škola stavebná a geodetická (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná priemyselná škola stavebná Dušana Samuela Jurkoviča', 'secondary', 'SK', 'Trnava'),
  ('Stredná priemyselná škola stavebná Emila Belluša', 'secondary', 'SK', 'Trenčín'),
  ('Stredná priemyselná škola stavebná Oskara Winklera - Winkler Oszkár Építőipari Szakközépiskola a Stredná odborná škola t', 'secondary', 'SK', 'Lučenec'),
  ('Stredná priemyselná škola strojnícka (Bratislava-Staré Mesto)', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Stredná priemyselná škola strojnícka (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná priemyselná škola strojnícka (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná priemyselná škola strojnícka a elektrotechnická', 'secondary', 'SK', 'Nitra'),
  ('Stredná priemyselná škola strojnícka a elektrotechnická - Gépipari és Elektrotechnikai Szakközépiskola', 'secondary', 'SK', 'Komárno'),
  ('Stredná priemyselná škola technická (Bardejov)', 'secondary', 'SK', 'Bardejov'),
  ('Stredná priemyselná škola technická (Martin)', 'secondary', 'SK', 'Martin'),
  ('Stredná priemyselná škola technická (Spišská Nová Ves)', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Stredná priemyselná škola technická (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Stredná priemyselná škola techniky a dizajnu', 'secondary', 'SK', 'Poprad'),
  ('Stredná zdravotnícka škola (Banská Bystrica)', 'secondary', 'SK', 'Banská Bystrica'),
  ('Stredná zdravotnícka škola (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Stredná zdravotnícka škola (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná zdravotnícka škola (Dolný Kubín)', 'secondary', 'SK', 'Dolný Kubín'),
  ('Stredná zdravotnícka škola (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Stredná zdravotnícka škola (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Stredná zdravotnícka škola (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná zdravotnícka škola (Liptovský Mikuláš)', 'secondary', 'SK', 'Liptovský Mikuláš'),
  ('Stredná zdravotnícka škola (Lučenec)', 'secondary', 'SK', 'Lučenec'),
  ('Stredná zdravotnícka škola (Michalovce)', 'secondary', 'SK', 'Michalovce'),
  ('Stredná zdravotnícka škola (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Stredná zdravotnícka škola (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Stredná zdravotnícka škola (Považská Bystrica)', 'secondary', 'SK', 'Považská Bystrica'),
  ('Stredná zdravotnícka škola (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná zdravotnícka škola (Prievidza)', 'secondary', 'SK', 'Prievidza'),
  ('Stredná zdravotnícka škola (Skalica)', 'secondary', 'SK', 'Skalica'),
  ('Stredná zdravotnícka škola (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Stredná zdravotnícka škola (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Stredná zdravotnícka škola (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná zdravotnícka škola - Egészségugyi Középiskola', 'secondary', 'SK', 'Dunajská Streda'),
  ('Stredná zdravotnícka škola - Egészségügyi Középiskola (Nové Zámky)', 'secondary', 'SK', 'Nové Zámky'),
  ('Stredná zdravotnícka škola - Egészségügyi Középiskola (Rožňava)', 'secondary', 'SK', 'Rožňava'),
  ('Stredná zdravotnícka škola Celestíny Šimurkovej v Trenčíne', 'secondary', 'SK', 'Trenčín'),
  ('Stredná zdravotnícka škola M. T. Schererovej', 'secondary', 'SK', 'Ružomberok'),
  ('Stredná zdravotnícka škola milosrdného Samaritána', 'secondary', 'SK', 'Svidník'),
  ('Stredná zdravotnícka škola sv. Alžbety', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná zdravotnícka škola sv. Bazila Veľkého', 'secondary', 'SK', 'Prešov'),
  ('Stredná zdravotnícka škola sv. Františka z Assisi', 'secondary', 'SK', 'Čadca'),
  ('Stredná zdravotnícka škola sv. Vincenta de Paul', 'secondary', 'SK', 'Topoľčany'),
  ('Stredná zdravotnícka škola Štefana Kluberta', 'secondary', 'SK', 'Levoča'),
  ('Stredná športová škola (Banská Bystrica)', 'secondary', 'SK', 'Banská Bystrica'),
  ('Stredná športová škola (Košice-Západ)', 'secondary', 'SK', 'Košice-Západ'),
  ('Stredná športová škola (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Stredná športová škola (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Stredná športová škola (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná športová škola ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Súkromná hotelová akadémia (Banská Štiavnica)', 'secondary', 'SK', 'Banská Štiavnica'),
  ('Súkromná hotelová akadémia (Považská Bystrica)', 'secondary', 'SK', 'Považská Bystrica'),
  ('Súkromná hotelová akadémia - Dufincova', 'secondary', 'SK', 'Michalovce'),
  ('Súkromná hotelová akadémia SD Jednota', 'secondary', 'SK', 'Šamorín'),
  ('Súkromná obchodná akadémia (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromná obchodná akadémia (Považská Bystrica)', 'secondary', 'SK', 'Považská Bystrica'),
  ('Súkromná obchodná akadémia (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Súkromná obchodná akadémia DSA', 'secondary', 'SK', 'Žiar nad Hronom'),
  ('Súkromná obchodná akadémia Profi - Kamo', 'secondary', 'SK', 'Bratislava-Podunajské Bis'),
  ('Súkromná praktická škola (Košice-Myslava)', 'secondary', 'SK', 'Košice-Myslava'),
  ('Súkromná praktická škola (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Súkromná praktická škola ako organizačná zložka Súkromnej spojenej školy (Detva)', 'secondary', 'SK', 'Detva'),
  ('Súkromná praktická škola ako organizačná zložka Súkromnej spojenej školy (Klokočov)', 'secondary', 'SK', 'Klokočov'),
  ('Súkromná praktická škola ako organizačná zložka Súkromnej spojenej školy (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Súkromná SOŠ automobilová Duálna akadémia', 'secondary', 'SK', 'Bratislava-Devínska Nová'),
  ('Súkromná spojená škola (Kolárovo)', 'secondary', 'SK', 'Kolárovo'),
  ('Súkromná spojená škola (Martin)', 'secondary', 'SK', 'Martin'),
  ('Súkromná spojená škola (Štúrovo)', 'secondary', 'SK', 'Štúrovo'),
  ('Súkromná Spojená škola EDUCO', 'secondary', 'SK', 'Námestovo'),
  ('Súkromná spojená škola EDURAM', 'secondary', 'SK', 'Krompachy'),
  ('Súkromná spojená škola Železiarne Podbrezová', 'secondary', 'SK', 'Podbrezová'),
  ('Súkromná spojená škola, Biela voda', 'secondary', 'SK', 'Kežmarok'),
  ('Súkromná stredná odborná  škola ochrany osôb a majetku', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromná stredná odborná škola  Magán Szakkozépiskola', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Súkromná stredná odborná škola (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Súkromná stredná odborná škola (Bytča)', 'secondary', 'SK', 'Bytča'),
  ('Súkromná stredná odborná škola (Giraltovce)', 'secondary', 'SK', 'Giraltovce'),
  ('Súkromná stredná odborná škola (Hliník nad Hronom)', 'secondary', 'SK', 'Hliník nad Hronom'),
  ('Súkromná stredná odborná škola (Košice-Nad jazerom)', 'secondary', 'SK', 'Košice-Nad jazerom'),
  ('Súkromná stredná odborná škola (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Súkromná stredná odborná škola (Revúca)', 'secondary', 'SK', 'Revúca'),
  ('Súkromná stredná odborná škola (Trebišov)', 'secondary', 'SK', 'Trebišov'),
  ('Súkromná stredná odborná škola (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Súkromná stredná odborná škola (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Súkromná stredná odborná škola - Gastroškola', 'secondary', 'SK', 'Bratislava-Podunajské Bis'),
  ('Súkromná stredná odborná škola - Magán Szakközépiskola', 'secondary', 'SK', 'Sládkovičovo'),
  ('Súkromná stredná odborná škola ADVENTIM - Magán Szakközépiskola ADVENTIM', 'secondary', 'SK', 'Dunajská Streda'),
  ('Súkromná stredná odborná škola ANIMUS', 'secondary', 'SK', 'Nitra'),
  ('Súkromná stredná odborná škola DSA (Trebišov)', 'secondary', 'SK', 'Trebišov'),
  ('Súkromná stredná odborná škola DSA (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Súkromná stredná odborná škola ekonomicko-technická', 'secondary', 'SK', 'Košice-Dargovských hrdino'),
  ('Súkromná stredná odborná škola ekonomická KOŠICKÁ AKADÉMIA', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Súkromná stredná odborná škola ELBA', 'secondary', 'SK', 'Prešov'),
  ('Súkromná stredná odborná škola HOST', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Súkromná stredná odborná škola hotelierstva a gastronómie Mladosť', 'secondary', 'SK', 'Prešov'),
  ('Súkromná stredná odborná škola Johannes Senio Service', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromná stredná odborná škola Nová cesta Magán Szakközépiskola Új út', 'secondary', 'SK', 'Malčice'),
  ('Súkromná stredná odborná škola obchodu a služieb', 'secondary', 'SK', 'Očová'),
  ('Súkromná stredná odborná škola obchodu a služieb s vyučovacím jazykom maďarským - Magán Kereskedelmi és Szolgáltatóipari', 'secondary', 'SK', 'Bátorove Kosihy'),
  ('Súkromná stredná odborná škola obchodu a služieb, s vyučovacím jazykom maďarským - Magán Kereskedelmi és Szolgáltatóipar', 'secondary', 'SK', 'Mostová'),
  ('Súkromná stredná odborná škola PAMIKO', 'secondary', 'SK', 'Košice-Juh'),
  ('Súkromná stredná odborná škola pedagogická (Bratislava-Podunajské Bis)', 'secondary', 'SK', 'Bratislava-Podunajské Bis'),
  ('Súkromná stredná odborná škola pedagogická (Topoľčany)', 'secondary', 'SK', 'Topoľčany'),
  ('Súkromná stredná odborná škola pedagogická a sociálna (Bratislava-Karlova Ves)', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Súkromná stredná odborná škola pedagogická a sociálna (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Súkromná stredná odborná škola pedagogická EBG (Brezno)', 'secondary', 'SK', 'Brezno'),
  ('Súkromná stredná odborná škola pedagogická EBG (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Súkromná stredná odborná škola podnikania (Ružomberok)', 'secondary', 'SK', 'Ružomberok'),
  ('Súkromná stredná odborná škola podnikania (Senica)', 'secondary', 'SK', 'Senica'),
  ('Súkromná stredná odborná škola podnikania (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Súkromná stredná odborná škola polytechnická DSA', 'secondary', 'SK', 'Nitra'),
  ('Súkromná stredná odborná škola Pro scholaris', 'secondary', 'SK', 'Žilina'),
  ('Súkromná stredná odborná škola s vyučovacím jazykom maďarským - Magyar Tannyelvü Magán Szakközépiskola', 'secondary', 'SK', 'Dunajská Streda'),
  ('Súkromná stredná odborná škola SD Jednota', 'secondary', 'SK', 'Šamorín'),
  ('Súkromná stredná odborná škola služieb (Bardejov)', 'secondary', 'SK', 'Bardejov'),
  ('Súkromná stredná odborná škola služieb (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Súkromná stredná odborná škola technická', 'secondary', 'SK', 'Žiar nad Hronom'),
  ('Súkromná stredná odborná škola veterinárna', 'secondary', 'SK', 'Bratislava-Dúbravka'),
  ('Súkromná stredná odborná škola VIA HUMANA', 'secondary', 'SK', 'Skalica'),
  ('Súkromná stredná športová škola (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromná stredná športová škola (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Súkromná stredná športová škola (Trenčianske Teplice)', 'secondary', 'SK', 'Trenčianske Teplice'),
  ('Súkromná stredná športová škola (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Súkromná stredná športová škola EISB', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Súkromná stredná športová škola ELBA', 'secondary', 'SK', 'Prešov'),
  ('Súkromná stredná športová škola GAUDEAMUS', 'secondary', 'SK', 'Bratislava-Podunajské Bis'),
  ('Súkromná škola umeleckého priemyslu (Hodruša-Hámre)', 'secondary', 'SK', 'Hodruša-Hámre'),
  ('Súkromná škola umeleckého priemyslu (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Súkromná škola umeleckého priemyslu (Topoľčany)', 'secondary', 'SK', 'Topoľčany'),
  ('Súkromná škola umeleckého priemyslu (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Súkromná škola umeleckého priemyslu (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Súkromná škola umeleckého priemyslu a vizuálneho umenia', 'secondary', 'SK', 'Zvolen'),
  ('Súkromná škola umeleckého priemyslu animovanej tvorby', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromná škola umeleckého priemyslu Bohumila Baču', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Súkromná škola umeleckého priemyslu filmová', 'secondary', 'SK', 'Košice-Západ'),
  ('Súkromné bilingválne gymnázium (Galanta)', 'secondary', 'SK', 'Galanta'),
  ('Súkromné bilingválne gymnázium (Ružomberok)', 'secondary', 'SK', 'Ružomberok'),
  ('Súkromné bilingválne gymnázium BESST', 'secondary', 'SK', 'Trnava'),
  ('Súkromné bilingválne gymnázium Co.Bra.', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Súkromné bulharské gymnázium Christa Boteva', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromné gymnázium (Bratislava-Nové Mesto)', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Súkromné gymnázium (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromné gymnázium (Bratislava-Vrakuňa)', 'secondary', 'SK', 'Bratislava-Vrakuňa'),
  ('Súkromné gymnázium (Košice-Nad jazerom)', 'secondary', 'SK', 'Košice-Nad jazerom'),
  ('Súkromné gymnázium (Košice-Západ)', 'secondary', 'SK', 'Košice-Západ'),
  ('Súkromné gymnázium (Kremnica)', 'secondary', 'SK', 'Kremnica'),
  ('Súkromné gymnázium (Lučenec)', 'secondary', 'SK', 'Lučenec'),
  ('Súkromné gymnázium (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Súkromné gymnázium ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Poprad'),
  ('Súkromné gymnázium ako organizačná zložka Súkromnej spojenej školy', 'secondary', 'SK', 'Košice-Košická Nová Ves'),
  ('Súkromné gymnázium ako organizačná zložka Súkromnej spojenej školy European English School', 'secondary', 'SK', 'Prešov'),
  ('Súkromné gymnázium Banskobystrické', 'secondary', 'SK', 'Banská Bystrica'),
  ('Súkromné gymnázium British International School Bratislava, ako organizačná zložka Súkromnej spojenej školy British Inte', 'secondary', 'SK', 'Bratislava-Dúbravka'),
  ('Súkromné gymnázium Cambridge International School,  ako organizačná zložka Súkromnej spojenej školy Cambridge Internatio', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Súkromné gymnázium DSA', 'secondary', 'SK', 'Bardejov'),
  ('Súkromné Gymnázium DSA', 'secondary', 'SK', 'Sabinov'),
  ('Súkromné gymnázium ESPRIT', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Súkromné gymnázium FELIX', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Súkromné Gymnázium francúzsko-slovenské ako organizačná zložka Súkromnej spojenej školy francúzsko-slovenskej', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromné gymnázium FUTURUM (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Súkromné gymnázium FUTURUM (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Súkromné gymnázium GALILEO SCHOOL', 'secondary', 'SK', 'Bratislava-Podunajské Bis'),
  ('Súkromné gymnázium MERCURY', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromné gymnázium nemecko-slovenské', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Súkromné gymnázium pre žiakov so všeobecným intelektovým nadaním CENADA', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Súkromné gymnázium Quality Schools International ako organizačná zložka Súkromnej spojenej školy Quality Schools Interna', 'secondary', 'SK', 'Šamorín'),
  ('Súkromné gymnázium s vyučovacím jazykom maďarským - Magyar Tanítási Nyelvu Magángimnázium', 'secondary', 'SK', 'Dunajská Streda'),
  ('Súkromné gymnázium, ako organizačná zložka Súkromnej spojenej školy Kings Schools International', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Súkromné hudobné a dramatické konzervatórium (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Súkromné hudobné a dramatické konzervatórium (Rimavská Sobota)', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Súkromné konzervatórium (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Súkromné konzervatórium (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Súkromné konzervatórium (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Súkromné konzervatórium ALKANA', 'secondary', 'SK', 'Bratislava-Dúbravka'),
  ('Súkromné konzervatórium Dezidera Kardoša', 'secondary', 'SK', 'Topoľčany'),
  ('Súkromné konzervatórium Prešov', 'secondary', 'SK', 'Prešov'),
  ('Súkromné odborné učilište', 'secondary', 'SK', 'Stropkov'),
  ('Súkromné odborné učilište ELBA', 'secondary', 'SK', 'Svinia'),
  ('Súkromné tanečné konzervatórium', 'secondary', 'SK', 'Liptovský Hrádok'),
  ('Súkromné tanečné konzervatórium Dušana Nebylu', 'secondary', 'SK', 'Trnava'),
  ('Tanečné konzervatórium Evy Jaczovej', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Základná škola a GYMNÁZIUM s vyučovacím jazykom maďarským - Magyar Tannyelvű Alapiskola és Gimnázium', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Škola umeleckého priemyslu (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Škola umeleckého priemyslu (Kežmarok)', 'secondary', 'SK', 'Kežmarok'),
  ('Škola umeleckého priemyslu (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Škola umeleckého priemyslu (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Škola umeleckého priemyslu (Ružomberok)', 'secondary', 'SK', 'Ružomberok'),
  ('Škola umeleckého priemyslu (Svidník)', 'secondary', 'SK', 'Svidník'),
  ('Škola umeleckého priemyslu (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Škola umeleckého priemyslu Josefa Vydru', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Škola umeleckého priemyslu Ladislava Bielika', 'secondary', 'SK', 'Levice'),
  ('AMBIS vysoká škola', 'university', 'SK', null),
  ('Academia Rerum Civilium – Vysoká škola politických a společenských věd', 'university', 'CZ', null),
  ('Akademie Huspol', 'university', 'CZ', null),
  ('Akademie múzických umění v Praze', 'university', 'CZ', 'Praha'),
  ('Akademie výtvarných umění v Praze', 'university', 'CZ', 'Praha'),
  ('Akadémia Policajného zboru v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Akadémia médií, odborná vysoká škola mediálnej a marketingovej komunikácie v Bratislave', 'university', 'SK', 'Bratislave'),
  ('Akadémia ozbrojených síl generála M. R. Štefánika', 'university', 'SK', 'Liptovský Mikuláš'),
  ('Akadémia ozbrojených síl generála Milana Rastislava Štefánika', 'university', 'SK', null),
  ('Akadémia umení v Banskej Bystrici', 'university', 'SK', 'Banskej Bystrici'),
  ('Akreditační komise', 'university', 'CZ', null),
  ('Ambis Univerzita', 'university', 'CZ', null),
  ('Archip', 'university', 'CZ', null),
  ('B.I.B.S.', 'university', 'CZ', null),
  ('Bratislavská medzinárodná škola liberálnych štúdií', 'university', 'SK', null),
  ('CEVRO Univerzita', 'university', 'CZ', null),
  ('Collegium Humanum', 'university', 'CZ', null),
  ('Collegium Humanum – Varšavská univerzita manažmentu', 'university', 'SK', null),
  ('Ekonomická univerzita v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Filmová akademie Miroslava Ondříčka v Písku', 'university', 'CZ', 'Písku'),
  ('International ART CAMPUS Prague', 'university', 'CZ', null),
  ('Janáčkova akademie múzických umění', 'university', 'CZ', null),
  ('Jihočeská univerzita v Českých Budějovicích', 'university', 'CZ', 'České Budějovice'),
  ('Katolícka univerzita v Ružomberku', 'university', 'SK', 'Ružomberok'),
  ('Masarykova univerzita', 'university', 'CZ', 'Brno'),
  ('Mendelova univerzita v Brně', 'university', 'CZ', 'Brno'),
  ('Metropolitní univerzita Praha', 'university', 'CZ', null),
  ('Miss Academia', 'university', 'CZ', null),
  ('Moravská vysoká škola Olomouc', 'university', 'CZ', null),
  ('Národní akreditační úřad pro terciární vzdělávání', 'university', 'CZ', null),
  ('Ostravská univerzita', 'university', 'CZ', null),
  ('Paneurópska vysoká škola', 'university', 'SK', null),
  ('Panevropská univerzita', 'university', 'CZ', null),
  ('Pražská vysoká škola psychosociálních studií', 'university', 'CZ', null),
  ('Prešovská univerzita v Prešove', 'university', 'SK', 'Prešove'),
  ('Rada vysokých škol', 'university', 'CZ', null),
  ('Reforma vysokých škol v Česku', 'university', 'CZ', 'Česku'),
  ('Seznam fakult podle vysokých škol v Česku', 'university', 'CZ', 'Česku'),
  ('Seznam fakult vysokých škol v Česku podle oborů', 'university', 'CZ', 'Česku podle oborů'),
  ('Seznam vysokých škol v Česku', 'university', 'CZ', 'Česku'),
  ('Seznam československých stranických a politických škol', 'university', 'CZ', null),
  ('Slezská univerzita v Opavě', 'university', 'CZ', 'Opava'),
  ('Slovenská poľnohospodárska univerzita v Nitre', 'university', 'SK', 'Nitra'),
  ('Slovenská technická univerzita v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Slovenská zdravotnícka univerzita v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Soukromá vysoká škola ekonomická Znojmo', 'university', 'CZ', null),
  ('Soukromá vysoká škola ekonomických studií', 'university', 'CZ', null),
  ('Stredoeurópska vysoká škola v Skalici', 'university', 'SK', 'Skalici'),
  ('Studentské unie v Česku', 'university', 'CZ', 'Česku'),
  ('Středočeský vysokoškolský institut', 'university', 'CZ', null),
  ('Technická univerzita v Košiciach', 'university', 'SK', 'Košice'),
  ('Technická univerzita v Liberci', 'university', 'CZ', 'Liberec'),
  ('Technická univerzita vo Zvolene', 'university', 'SK', 'Zvolen'),
  ('Trenčianska univerzita Alexandra Dubčeka v Trenčíne', 'university', 'SK', 'Trenčíne'),
  ('Trnavská univerzita v Trnave', 'university', 'SK', 'Trnave'),
  ('Ukrajinský vyšší pedagogický institut', 'university', 'CZ', null),
  ('Unicorn University', 'university', 'CZ', null),
  ('University College Prague', 'university', 'CZ', null),
  ('University of New York in Prague', 'university', 'CZ', null),
  ('Univerzita Alexandra Dubčeka v Trenčíne', 'university', 'SK', 'Trenčín'),
  ('Univerzita Hradec Králové', 'university', 'CZ', 'Hradec Králové'),
  ('Univerzita J. Selyeho', 'university', 'SK', null),
  ('Univerzita J. Selyeho v Komárne', 'university', 'SK', 'Komárno'),
  ('Univerzita Jana Amose Komenského Praha', 'university', 'CZ', null),
  ('Univerzita Jana Evangelisty Purkyně v Ústí nad Labem', 'university', 'CZ', 'Ústí nad Labem'),
  ('Univerzita Karlova', 'university', 'CZ', 'Praha'),
  ('Univerzita Komenského v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Univerzita Konštantína Filozofa v Nitre', 'university', 'SK', 'Nitra'),
  ('Univerzita Mateja Bela v Banskej Bystrici', 'university', 'SK', 'Banská Bystrica'),
  ('Univerzita Ostrava', 'university', 'CZ', 'Ostrava'),
  ('Univerzita Palackého v Olomouci', 'university', 'CZ', 'Olomouc'),
  ('Univerzita Pardubice', 'university', 'CZ', 'Pardubice'),
  ('Univerzita Pavla Jozefa Šafárika v Košiciach', 'university', 'SK', 'Košice'),
  ('Univerzita Tomáše Bati ve Zlíně', 'university', 'CZ', 'Zlín'),
  ('Univerzita prešovská', 'university', 'SK', 'Prešov'),
  ('Univerzita sv. Alžbety v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Univerzita sv. Cyrila a Metoda v Trnave', 'university', 'SK', 'Trnava'),
  ('Univerzita třetího věku', 'university', 'CZ', null),
  ('Univerzita v Trnave', 'university', 'SK', 'Trnava'),
  ('Univerzita v Žiline', 'university', 'SK', 'Žilina'),
  ('Univerzita veterinárskeho lekárstva a farmácie v Košiciach', 'university', 'SK', 'Košice'),
  ('Uzavření českých vysokých škol 17. listopadu 1939', 'university', 'CZ', null),
  ('Veterinární univerzita Brno', 'university', 'CZ', null),
  ('Vojenská katedra', 'university', 'CZ', null),
  ('Vysokoškolské katolické hnutí', 'university', 'CZ', null),
  ('Vysoká škola DTI', 'university', 'SK', null),
  ('Vysoká škola Danubius', 'university', 'SK', 'Bratislava'),
  ('Vysoká škola Goethe Uni Bratislava', 'university', 'SK', null),
  ('Vysoká škola Jagiellonská', 'university', 'CZ', null),
  ('Vysoká škola Karla Engliše', 'university', 'CZ', null),
  ('Vysoká škola Karlovy Vary', 'university', 'CZ', null),
  ('Vysoká škola NEWTON', 'university', 'CZ', null),
  ('Vysoká škola Sting', 'university', 'CZ', null),
  ('Vysoká škola aplikované psychologie', 'university', 'CZ', null),
  ('Vysoká škola aplikovaného práva', 'university', 'CZ', null),
  ('Vysoká škola bezpečnostného manažérstva v Košiciach', 'university', 'SK', 'Košice'),
  ('Vysoká škola báňská – Technická univerzita Ostrava', 'university', 'CZ', null),
  ('Vysoká škola chemicko-technologická v Praze', 'university', 'CZ', 'Praha'),
  ('Vysoká škola ekonomická v Praze', 'university', 'CZ', 'Praha'),
  ('Vysoká škola ekonomie a managementu', 'university', 'CZ', null),
  ('Vysoká škola ekonómie a manažmentu verejnej správy v Bratislave', 'university', 'SK', 'Bratislave'),
  ('Vysoká škola evropských a regionálních studií', 'university', 'CZ', null),
  ('Vysoká škola finanční a správní', 'university', 'CZ', null),
  ('Vysoká škola logistiky', 'university', 'CZ', null),
  ('Vysoká škola manažmentu v Trenčíne', 'university', 'SK', 'Trenčíne'),
  ('Vysoká škola mezinárodních a veřejných vztahů Praha', 'university', 'CZ', null),
  ('Vysoká škola múzických umení v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Vysoká škola obchodní a hotelová', 'university', 'CZ', null),
  ('Vysoká škola polytechnická Jihlava', 'university', 'CZ', null),
  ('Vysoká škola technická a ekonomická v Prešove', 'university', 'SK', 'Prešove'),
  ('Vysoká škola technická a ekonomická v Českých Budějovicích', 'university', 'CZ', 'Českých Budějovicích'),
  ('Vysoká škola tělesné výchovy a sportu Palestra', 'university', 'CZ', null),
  ('Vysoká škola uměleckoprůmyslová v Praze', 'university', 'CZ', 'Praze'),
  ('Vysoká škola výtvarných umení v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Vysoká škola zdravotníctva a sociálnej práce sv. Alžbety v Bratislave', 'university', 'SK', 'Bratislave'),
  ('Vysoké učení technické v Brně', 'university', 'CZ', 'Brno'),
  ('Západomoravská vysoká škola Třebíč', 'university', 'CZ', null),
  ('Západočeská univerzita v Plzni', 'university', 'CZ', 'Plzeň'),
  ('Česká asociace doktorandek a doktorandů', 'university', 'CZ', null),
  ('Česká konference rektorů', 'university', 'CZ', null),
  ('Česká zemědělská univerzita v Praze', 'university', 'CZ', 'Praha'),
  ('České vysoké učení technické v Praze', 'university', 'CZ', 'Praha'),
  ('Škoda Auto Vysoká škola', 'university', 'CZ', null),
  ('Žilinská univerzita v Žiline', 'university', 'SK', 'Žiline');

-- -----------------------------------------------------------------------------
-- Source: 20260623160200_sk_education_institutions_cvti_refresh.sql
-- -----------------------------------------------------------------------------

-- Refresh school catalog from CVTI SR Excel registers (~722 secondary schools).
-- Run if 20260623160100 was applied with the old Wikipedia-only seed (~78 secondary).
TRUNCATE public.sk_education_institutions RESTART IDENTITY;

INSERT INTO public.sk_education_institutions (name, level, country, municipality) VALUES
  ('1. súkromné gymnázium v Bratislave', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Arcibiskupské gymnázium biskupa P. Jantauscha, Stredná odborná škola pedagogická bl. Laury a Cirkevná materská škola sv.', 'secondary', 'SK', 'Trnava'),
  ('Bilingválne gymnázium C. S. Lewisa', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Bilingválne gymnázium Milana Hodžu', 'secondary', 'SK', 'Sučany'),
  ('Bilingválne slovensko - španielske gymnázium', 'secondary', 'SK', 'Nové Mesto nad Váhom'),
  ('Cirkevná stredná odborná škola elektrotechnická P. G. Frassatiho', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Cirkevná stredná odborná škola sv.Terézie z Lisieux', 'secondary', 'SK', 'Bánovce nad Bebravou'),
  ('Cirkevné gymnázium Andreja Radlinského ako organizačná zložka Cirkevnej spojenej školy', 'secondary', 'SK', 'Dolný Kubín'),
  ('Cirkevné gymnázium F. Fegyvernekiho s vyučovacím jazykom maďarským - Fegyverneki Ferenc Egyházi Gimnázium - ako organiza', 'secondary', 'SK', 'Šahy'),
  ('Cirkevné gymnázium Marianum s vyučovacím jazykom maďarským - Marianum Egyházi Gimnázium', 'secondary', 'SK', 'Komárno'),
  ('Cirkevné gymnázium sv. Františka z Assisi ako organizačná zložka Cirkevnej spojenej školy', 'secondary', 'SK', 'Vranov nad Topľou'),
  ('Cirkevné gymnázium sv. Jána Krstiteľa', 'secondary', 'SK', 'Trebišov'),
  ('Cirkevné gymnázium Štefana Mišíka', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Cirkevné konzervatórium', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Elokované pracovisko ako súčasť Spojenej školy - Praktická škola', 'secondary', 'SK', 'Košice-Západ'),
  ('Elokované pracovisko ako súčasť Školy pre mimoriadne nadané deti a GYMNÁZIUM', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Evanjelická praktická škola internátna ako organizačná zložka Evanjelickej spojenej školy internátnej', 'secondary', 'SK', 'Červenica'),
  ('Evanjelické gymnázium (Banská Bystrica)', 'secondary', 'SK', 'Banská Bystrica'),
  ('Evanjelické gymnázium (Tisovec)', 'secondary', 'SK', 'Tisovec'),
  ('Evanjelické gymnázium ako organizačná zložka Evanjelickej spojenej školy', 'secondary', 'SK', 'Martin'),
  ('Evanjelické gymnázium Jana Amosa Komenského', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Evanjelické gymnázium Juraja Tranovského ako organizačná zložka Evanjelickej spojenej školy', 'secondary', 'SK', 'Liptovský Mikuláš'),
  ('Evanjelické kolegiálne gymnázium ako organizačná zložka Evanjelickej spojenej školy', 'secondary', 'SK', 'Prešov'),
  ('Evanjelické lýceum', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Gymnázium  sv. Jána Pavla II. ako organizačná zložka Spojenej školy sv. Jána Pavla II.', 'secondary', 'SK', 'Poprad'),
  ('Gymnázium (Bratislava-Dúbravka)', 'secondary', 'SK', 'Bratislava-Dúbravka'),
  ('Gymnázium (Bratislava-Karlova Ves)', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Gymnázium (Bratislava-Rača)', 'secondary', 'SK', 'Bratislava-Rača'),
  ('Gymnázium (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Gymnázium (Bratislava-Staré Mesto)', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Gymnázium (Bytča)', 'secondary', 'SK', 'Bytča'),
  ('Gymnázium (Dubnica nad Váhom)', 'secondary', 'SK', 'Dubnica nad Váhom'),
  ('Gymnázium (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Gymnázium (Košice-Sever)', 'secondary', 'SK', 'Košice-Sever'),
  ('Gymnázium (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Gymnázium (Košice-Vyšné Opátske)', 'secondary', 'SK', 'Košice-Vyšné Opátske'),
  ('Gymnázium (Košice-Západ)', 'secondary', 'SK', 'Košice-Západ'),
  ('Gymnázium (Lipany)', 'secondary', 'SK', 'Lipany'),
  ('Gymnázium (Malacky)', 'secondary', 'SK', 'Malacky'),
  ('Gymnázium (Michalovce)', 'secondary', 'SK', 'Michalovce'),
  ('Gymnázium (Myjava)', 'secondary', 'SK', 'Myjava'),
  ('Gymnázium (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Gymnázium (Nové Zámky)', 'secondary', 'SK', 'Nové Zámky'),
  ('Gymnázium (Partizánske)', 'secondary', 'SK', 'Partizánske'),
  ('Gymnázium (Pezinok)', 'secondary', 'SK', 'Pezinok'),
  ('Gymnázium (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Gymnázium (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Gymnázium (Púchov)', 'secondary', 'SK', 'Púchov'),
  ('Gymnázium (Ružomberok)', 'secondary', 'SK', 'Ružomberok'),
  ('Gymnázium (Snina)', 'secondary', 'SK', 'Snina'),
  ('Gymnázium (Spišská Nová Ves)', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Gymnázium (Stropkov)', 'secondary', 'SK', 'Stropkov'),
  ('Gymnázium (Topoľčany)', 'secondary', 'SK', 'Topoľčany'),
  ('Gymnázium (Vráble)', 'secondary', 'SK', 'Vráble'),
  ('Gymnázium (Šurany)', 'secondary', 'SK', 'Šurany'),
  ('Gymnázium (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Gymnázium - Gimnázium', 'secondary', 'SK', 'Kráľovský Chlmec'),
  ('Gymnázium - Gimnázium a Stredná odborná škola - Szakközépiskola', 'secondary', 'SK', 'Fiľakovo'),
  ('Gymnázium - Gimnázium, Gymnázium Jána Amosa Komenského - Comenius Gimnázium a Stredná odborná škola techniky, služieb a', 'secondary', 'SK', 'Štúrovo'),
  ('Gymnázium a Obchodná akadémia', 'secondary', 'SK', 'Trebišov'),
  ('Gymnázium a Stredná odborná škola obchodu a služieb', 'secondary', 'SK', 'Sobrance'),
  ('Gymnázium a Stredná odborná škola techniky a služieb (Gelnica)', 'secondary', 'SK', 'Gelnica'),
  ('Gymnázium a Stredná odborná škola techniky a služieb (Spišská Nová Ves)', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Gymnázium a Stredná odborná škola techniky a služieb - Műszaki és Szolgáltatóipari Szakközépiskola, Mládežnícka 22, Šahy', 'secondary', 'SK', 'Šahy'),
  ('Gymnázium a Stredná športová škola Jozefa Herdu', 'secondary', 'SK', 'Trnava'),
  ('GYMNÁZIUM a Základná škola s vyučovacím jazykom maďarským - Márai Sándor Magyar Tanítási Nyelvű Gimnázium és Alapiskola', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Gymnázium ako organizačná zložka Spojenej školy (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Gymnázium ako organizačná zložka Spojenej školy (Giraltovce)', 'secondary', 'SK', 'Giraltovce'),
  ('Gymnázium ako organizačná zložka Spojenej školy (Liptovský Hrádok)', 'secondary', 'SK', 'Liptovský Hrádok'),
  ('Gymnázium ako organizačná zložka Spojenej školy (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Gymnázium ako organizačná zložka Spojenej školy (Rajec)', 'secondary', 'SK', 'Rajec'),
  ('Gymnázium ako organizačná zložka Spojenej školy (Spišská Stará Ves)', 'secondary', 'SK', 'Spišská Stará Ves'),
  ('Gymnázium ako organizačná zložka Spojenej školy Juraja Turza', 'secondary', 'SK', 'Turzovka'),
  ('Gymnázium ako organizačná zložka Spojenej školy sv. Jozefa', 'secondary', 'SK', 'Nové Mesto nad Váhom'),
  ('Gymnázium ako organizačná zložka Spojenej školy Tarasa Ševčenka s vyučovacím jazykom ukrajinským', 'secondary', 'SK', 'Prešov'),
  ('Gymnázium Alberta Einsteina', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Gymnázium Andreja Kmeťa', 'secondary', 'SK', 'Banská Štiavnica'),
  ('Gymnázium Andreja Sládkoviča', 'secondary', 'SK', 'Banská Bystrica'),
  ('Gymnázium Andreja Sládkoviča a Stredná odborná škola obchodu a služieb', 'secondary', 'SK', 'Krupina'),
  ('Gymnázium Andreja Vrábla', 'secondary', 'SK', 'Levice'),
  ('Gymnázium Angely Merici', 'secondary', 'SK', 'Trnava'),
  ('Gymnázium Antona Bernoláka (Námestovo)', 'secondary', 'SK', 'Námestovo'),
  ('Gymnázium Antona Bernoláka (Senec)', 'secondary', 'SK', 'Senec'),
  ('Gymnázium arm. gen. Ludvíka Svobodu', 'secondary', 'SK', 'Humenné'),
  ('Gymnázium Augusta Horislava Škultétyho, Obchodná akadémia a Stredná odborná škola', 'secondary', 'SK', 'Veľký Krtíš'),
  ('Gymnázium bilingválne', 'secondary', 'SK', 'Žilina'),
  ('Gymnázium bl. biskupa Gojdiča ako organizačná zložka Spojenej školy bl. biskupa Gojdiča', 'secondary', 'SK', 'Prešov'),
  ('Gymnázium bl. Sáry Salkaházi s vyučovacím jazykom maďarským - Boldog Salkaházi Sára Egyházi Gimnázium, ako organizačná z', 'secondary', 'SK', 'Moldava nad Bodvou'),
  ('Gymnázium Boženy Slančíkovej - Timravy a Obchodná akadémia', 'secondary', 'SK', 'Lučenec'),
  ('Gymnázium Cyrila Daxnera', 'secondary', 'SK', 'Vranov nad Topľou'),
  ('Gymnázium Dominika Tatarku', 'secondary', 'SK', 'Považská Bystrica'),
  ('Gymnázium duklianskych hrdinov', 'secondary', 'SK', 'Svidník'),
  ('Gymnázium Federica Garcíu Lorcu', 'secondary', 'SK', 'Bratislava-Podunajské Bis'),
  ('Gymnázium Františka Víťazoslava Sasinka', 'secondary', 'SK', 'Skalica'),
  ('Gymnázium Františka Švantnera', 'secondary', 'SK', 'Nová Baňa'),
  ('Gymnázium Hansa Selyeho s vyučovacím jazykom maďarským - Selye János Gimnázium', 'secondary', 'SK', 'Komárno'),
  ('Gymnázium Imre Madácha s vyučovacím jazykom maďarským - Madách Imre Magyar Tanítási Nyelvű Gimnázium', 'secondary', 'SK', 'Šamorín'),
  ('Gymnázium Ivana Horvátha', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Gymnázium Ivana Kraska - Ivan Krasko Gimnázium a Obchodná akadémia - Kereskedelmi Akadémia', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Gymnázium Ivana Kupca', 'secondary', 'SK', 'Hlohovec'),
  ('Gymnázium Janka Francisciho - Rimavského', 'secondary', 'SK', 'Levoča'),
  ('Gymnázium Janka Jesenského', 'secondary', 'SK', 'Bánovce nad Bebravou'),
  ('Gymnázium Janka Kráľa', 'secondary', 'SK', 'Zlaté Moravce'),
  ('Gymnázium Janka Matúšku', 'secondary', 'SK', 'Galanta'),
  ('Gymnázium Jozefa Cígera Hronského ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Vrútky'),
  ('Gymnázium Jozefa Gregora Tajovského', 'secondary', 'SK', 'Banská Bystrica'),
  ('Gymnázium Jozefa Lettricha', 'secondary', 'SK', 'Martin'),
  ('Gymnázium Jozefa Miloslava Hurbana', 'secondary', 'SK', 'Čadca'),
  ('Gymnázium Juraja Fándlyho', 'secondary', 'SK', 'Šaľa'),
  ('Gymnázium Juraja Szondyho s vyučovacím jazykom maďarským - Szondy György Gimnázium, ako org.zložka Základná škola Lajosa', 'secondary', 'SK', 'Šahy'),
  ('Gymnázium Jána Adama Raymana', 'secondary', 'SK', 'Prešov'),
  ('Gymnázium Jána Baltazára Magina', 'secondary', 'SK', 'Vrbové'),
  ('Gymnázium Jána Chalupku', 'secondary', 'SK', 'Brezno'),
  ('Gymnázium Jána Hollého', 'secondary', 'SK', 'Trnava'),
  ('Gymnázium Jána Papánka', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Gymnázium Karola Štúra', 'secondary', 'SK', 'Modra'),
  ('Gymnázium Kráľovnej pokoja ako organizačná zložka Spojenej školy Kraľovnej pokoja', 'secondary', 'SK', 'Žilina'),
  ('Gymnázium Ladislava Dúbravu', 'secondary', 'SK', 'Dunajská Streda'),
  ('Gymnázium Ladislava Novomeského (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Gymnázium Ladislava Novomeského (Senica)', 'secondary', 'SK', 'Senica'),
  ('Gymnázium Leonarda Stöckela', 'secondary', 'SK', 'Bardejov'),
  ('Gymnázium M. Galandu ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Turčianske Teplice'),
  ('Gymnázium M. R. Štefánika', 'secondary', 'SK', 'Nové Mesto nad Váhom'),
  ('Gymnázium M.R. Štefánika ako organizačná zložka Gymnázia M. R. Štefánika a Základnej školy', 'secondary', 'SK', 'Šamorín'),
  ('Gymnázium Martina Hattalu', 'secondary', 'SK', 'Trstená'),
  ('Gymnázium Martina Kukučína a Stredná odborná škola', 'secondary', 'SK', 'Revúca'),
  ('Gymnázium Matky Alexie', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Gymnázium Michala Miloslava Hodžu', 'secondary', 'SK', 'Liptovský Mikuláš'),
  ('Gymnázium Mihálya Tompu Reformovanej kresťanskej cirkvi s vyučovacím jazykom maďarským - Tompa Mihály Református Gimnázi', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Gymnázium Mikuláša Kováča', 'secondary', 'SK', 'Banská Bystrica'),
  ('Gymnázium Milana Rastislava Štefánika', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Gymnázium Milana Rúfusa', 'secondary', 'SK', 'Žiar nad Hronom'),
  ('Gymnázium Pavla Horova', 'secondary', 'SK', 'Michalovce'),
  ('Gymnázium Pavla Jozefa Šafárika - Pavol Jozef Šafárik Gimnázium', 'secondary', 'SK', 'Rožňava'),
  ('Gymnázium Pavla Országha Hviezdoslava (Dolný Kubín)', 'secondary', 'SK', 'Dolný Kubín'),
  ('Gymnázium Pavla Országha Hviezdoslava (Kežmarok)', 'secondary', 'SK', 'Kežmarok'),
  ('Gymnázium Petra Pázmáňa s vyučovacím jazykom maďarským - Pázmány Péter Gimnázium', 'secondary', 'SK', 'Nové Zámky'),
  ('Gymnázium Pierra de Coubertina', 'secondary', 'SK', 'Piešťany'),
  ('Gymnázium sv. Andreja', 'secondary', 'SK', 'Ružomberok'),
  ('Gymnázium sv. Cyrila a Metoda ako organizačná zložka Cirkevnej spojenej školy (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Gymnázium sv. Cyrila a Metoda ako organizačná zložka Cirkevnej spojenej školy (Snina)', 'secondary', 'SK', 'Snina'),
  ('Gymnázium sv. Edity Steinovej', 'secondary', 'SK', 'Košice-Dargovských hrdino'),
  ('Gymnázium sv. Františka Assiského', 'secondary', 'SK', 'Levoča'),
  ('Gymnázium sv. Františka Assiského, ako organizačná zložka Spojenej školy sv. Františka Assiského', 'secondary', 'SK', 'Malacky'),
  ('Gymnázium sv. Františka z Assisi', 'secondary', 'SK', 'Žilina'),
  ('Gymnázium sv. Františka z Assisi, ako organizačná zložka Spojenej školy sv. Františka z Assisi', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Gymnázium sv. Jána Bosca ako organizačná zložka Cirkevnej spojenej školy', 'secondary', 'SK', 'Bardejov'),
  ('Gymnázium sv. Jána Zlatoústeho', 'secondary', 'SK', 'Humenné'),
  ('Gymnázium sv. Košických mučeníkov ako organizačná zložka Spojenej školy sv. Košických mučeníkov', 'secondary', 'SK', 'Košice-Sídlisko KVP'),
  ('Gymnázium sv. Mikuláša ako organizačná zložka Katolíckej spojenenej školy sv. Mikuláša', 'secondary', 'SK', 'Prešov'),
  ('Gymnázium sv. Mikuláša ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Stará Ľubovňa'),
  ('Gymnázium sv. Moniky', 'secondary', 'SK', 'Prešov'),
  ('Gymnázium sv. Tomáša Akvinského', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Gymnázium sv. Uršule ako organizačná zložka Spojenej školy sv. Uršule', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Gymnázium sv. Vincenta de Paul ako organizačná zložka Katolíckej spojenej školy sv. Vincenta de Paul', 'secondary', 'SK', 'Levice'),
  ('Gymnázium Svätej Rodiny, ako organizačná zložka Spojenej školy Svätej Rodiny', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Gymnázium Terézie Vansovej', 'secondary', 'SK', 'Stará Ľubovňa'),
  ('Gymnázium Vavrinca Benedikta Nedožerského', 'secondary', 'SK', 'Prievidza'),
  ('Gymnázium Viliama Paulinyho Tótha a Obchodná akadémia', 'secondary', 'SK', 'Martin'),
  ('Gymnázium Vojtecha Mihálika', 'secondary', 'SK', 'Sereď'),
  ('Gymnázium Zoltána Kodálya s vyučovacím jazykom maďarským - Kodály Zoltán Gimnázium', 'secondary', 'SK', 'Galanta'),
  ('Gymnázium Ármina Vámbéryho s vyučovacím jazykom maďarským - Vámbéry Ármin Gimnázium', 'secondary', 'SK', 'Dunajská Streda'),
  ('Gymnázium Ľudovíta Jaroslava Šuleka', 'secondary', 'SK', 'Komárno'),
  ('Gymnázium Ľudovíta Štúra (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Gymnázium Ľudovíta Štúra (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Gymnázium školských bratov, ako organizačná zložka Spojenej školy de La Salle', 'secondary', 'SK', 'Bratislava-Rača'),
  ('Gymnázium Štefana Moysesa a Stredná odborná škola agrotechnická - Agrotechnikai Szakközépiskola', 'secondary', 'SK', 'Moldava nad Bodvou'),
  ('Gymnázium, ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Gymnázium, ako organizačná zložka Spojenej školy sv. Vincenta de Paul', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Gymnázium, Obchodná akadémia a Stredná odborná škola technická', 'secondary', 'SK', 'Detva'),
  ('Gymnázium-Gimnázium a Stredná odborná škola techniky a služieb-Műszaki és Szolgáltatóipari Szakközépiskola', 'secondary', 'SK', 'Veľké Kapušany'),
  ('Hotelová akadémia (Bratislava-Nové Mesto)', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Hotelová akadémia (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Hotelová akadémia (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Hotelová akadémia (Liptovský Mikuláš)', 'secondary', 'SK', 'Liptovský Mikuláš'),
  ('Hotelová akadémia (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Hotelová akadémia (Spišská Nová Ves)', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Hotelová akadémia (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Hotelová akadémia a Obchodná akadémia', 'secondary', 'SK', 'Brezno'),
  ('Hotelová akadémia Otta Brucknera', 'secondary', 'SK', 'Kežmarok'),
  ('Hotelová akadémia Ľudovíta Wintera', 'secondary', 'SK', 'Piešťany'),
  ('Katolícka spojená škola sv. Františka Assiského', 'secondary', 'SK', 'Banská Štiavnica'),
  ('Katolícke gymnázium Štefana Moysesa', 'secondary', 'SK', 'Banská Bystrica'),
  ('Konzervatórium (Bratislava-Staré Mesto)', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Konzervatórium (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Konzervatórium Jozefa Adamoviča a Konzervatórium Petra Dvorského', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Konzervatórium Jána Levoslava Bellu', 'secondary', 'SK', 'Banská Bystrica'),
  ('Obchodná akadémia (Bratislava-Nové Mesto)', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Obchodná akadémia (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Obchodná akadémia (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Obchodná akadémia (Dolný Kubín)', 'secondary', 'SK', 'Dolný Kubín'),
  ('Obchodná akadémia (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Obchodná akadémia (Košice-Nad jazerom)', 'secondary', 'SK', 'Košice-Nad jazerom'),
  ('Obchodná akadémia (Košice-Sever)', 'secondary', 'SK', 'Košice-Sever'),
  ('Obchodná akadémia (Michalovce)', 'secondary', 'SK', 'Michalovce'),
  ('Obchodná akadémia (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Obchodná akadémia (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Obchodná akadémia (Považská Bystrica)', 'secondary', 'SK', 'Považská Bystrica'),
  ('Obchodná akadémia (Prievidza)', 'secondary', 'SK', 'Prievidza'),
  ('Obchodná akadémia (Ružomberok)', 'secondary', 'SK', 'Ružomberok'),
  ('Obchodná akadémia (Senica)', 'secondary', 'SK', 'Senica'),
  ('Obchodná akadémia (Sereď)', 'secondary', 'SK', 'Sereď'),
  ('Obchodná akadémia (Topoľčany)', 'secondary', 'SK', 'Topoľčany'),
  ('Obchodná akadémia (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Obchodná akadémia (Vranov nad Topľou)', 'secondary', 'SK', 'Vranov nad Topľou'),
  ('Obchodná akadémia (Šurany)', 'secondary', 'SK', 'Šurany'),
  ('Obchodná akadémia (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Obchodná akadémia - Kereskedelmi Akadémia', 'secondary', 'SK', 'Veľký Meder'),
  ('Obchodná akadémia a Stredná odborná škola obchodu a služieb', 'secondary', 'SK', 'Rožňava'),
  ('Obchodná akadémia a Stredná odborná škola obchodu a služieb, SNP 5, Zlaté Moravce', 'secondary', 'SK', 'Zlaté Moravce'),
  ('Obchodná akadémia ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Svidník'),
  ('Obchodná akadémia Dušana Metoda Janotu', 'secondary', 'SK', 'Čadca'),
  ('Obchodná akadémia Imricha Karvaša', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Obchodná akadémia Mareka Frauwirtha', 'secondary', 'SK', 'Banská Bystrica'),
  ('Obchodná akadémia Milana Hodžu', 'secondary', 'SK', 'Trenčín'),
  ('Obchodná akadémia Petra Zaťka', 'secondary', 'SK', 'Liptovský Mikuláš'),
  ('Obchodná akadémia sv. Tomáša Akvinského', 'secondary', 'SK', 'Žilina'),
  ('Obchodná akadémia, Ul. Kálmána Kittenbergera 2', 'secondary', 'SK', 'Levice'),
  ('Odborné učilište', 'secondary', 'SK', 'Martin'),
  ('Odborné učilište internátne (Ladce)', 'secondary', 'SK', 'Ladce'),
  ('Odborné učilište internátne (Lučenec)', 'secondary', 'SK', 'Lučenec'),
  ('Odborné učilište internátne (Mojmírovce)', 'secondary', 'SK', 'Mojmírovce'),
  ('Odborné učilište internátne (Nová Ves nad Žitavou)', 'secondary', 'SK', 'Nová Ves nad Žitavou'),
  ('Odborné učilište internátne (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Odborné učilište internátne (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Odborné učilište internátne (Želovce)', 'secondary', 'SK', 'Želovce'),
  ('Odborné učilište internátne - Bentlakásos Speciális Szakiskola ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Okoč'),
  ('Odborné učilište internátne ako organizačná zložka Spojenej školy internátnej', 'secondary', 'SK', 'Tornaľa'),
  ('Odborné učilište internátne Viliama Gaňu', 'secondary', 'SK', 'Banská Bystrica'),
  ('Odborné učilište pri reedukačnom centre', 'secondary', 'SK', 'Veľké Leváre'),
  ('Piaristická spojená škola Františka Hanáka', 'secondary', 'SK', 'Prievidza'),
  ('Piaristické gymnázium Jozefa Braneckého', 'secondary', 'SK', 'Trenčín'),
  ('Piaristické gymnázium sv. Jozefa Kalazanského ako organizačná zložka Piaristickej spojenej školy sv. Jozefa Kalazanského', 'secondary', 'SK', 'Nitra'),
  ('Praktická škola', 'secondary', 'SK', 'Sečovce'),
  ('Praktická škola - Készségfejlesztő ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Kráľovský Chlmec'),
  ('Praktická škola - Készségfejlesztő Iskola ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Sládkovičovo'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Dubnica nad Váhom)', 'secondary', 'SK', 'Dubnica nad Váhom'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Kežmarok)', 'secondary', 'SK', 'Kežmarok'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Komárno)', 'secondary', 'SK', 'Komárno'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Martin)', 'secondary', 'SK', 'Martin'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Myjava)', 'secondary', 'SK', 'Myjava'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Nové Mesto nad Váhom)', 'secondary', 'SK', 'Nové Mesto nad Váhom'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Pavlovce nad Uhom)', 'secondary', 'SK', 'Pavlovce nad Uhom'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Piešťany)', 'secondary', 'SK', 'Piešťany'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Považská Bystrica)', 'secondary', 'SK', 'Považská Bystrica'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Púchov)', 'secondary', 'SK', 'Púchov'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Trenčianska Teplá)', 'secondary', 'SK', 'Trenčianska Teplá'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Vranov nad Topľou)', 'secondary', 'SK', 'Vranov nad Topľou'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Vrbové)', 'secondary', 'SK', 'Vrbové'),
  ('Praktická škola ako organizačná zložka Spojenej školy (Čadca)', 'secondary', 'SK', 'Čadca'),
  ('Praktická škola ako organizačná zložka Spojenej školy internátnej (Bytča)', 'secondary', 'SK', 'Bytča'),
  ('Praktická škola ako organizačná zložka Spojenej školy internátnej (Levice)', 'secondary', 'SK', 'Levice'),
  ('Praktická škola ako organizačná zložka Spojenej školy internátnej (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Praktická škola ako organizačná zložka Spojenej školy internátnej (Prievidza)', 'secondary', 'SK', 'Prievidza'),
  ('Praktická škola ako organizačná zložka Spojenej školy internátnej (Topoľčany)', 'secondary', 'SK', 'Topoľčany'),
  ('Praktická škola ako súčasť Špeciálnej základnej školy (Banská Bystrica)', 'secondary', 'SK', 'Banská Bystrica'),
  ('Praktická škola ako súčasť Špeciálnej základnej školy (Jelšava)', 'secondary', 'SK', 'Jelšava'),
  ('Praktická škola ako súčasť Špeciálnej základnej školy (Lučenec)', 'secondary', 'SK', 'Lučenec'),
  ('Praktická škola ako súčasť Špeciálnej základnej školy (Rimavská Sobota)', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Praktická škola internátna ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Senica'),
  ('Praktická škola internátna ako organizačná zložka Spojenej školy internátnej (Levoča)', 'secondary', 'SK', 'Levoča'),
  ('Praktická škola internátna ako organizačná zložka Spojenej školy internátnej (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Praktická škola internátna ako organizačná zložka Spojenej školy internátnej (Spišské Vlachy)', 'secondary', 'SK', 'Spišské Vlachy'),
  ('Praktická škola internátna ako organizačná zložka Spojenej školy internátnej (Ždaňa)', 'secondary', 'SK', 'Ždaňa'),
  ('Praktická škola s vyučovacím jazykom maďarským - Készégfejlesztö Iskola ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Dunajská Streda'),
  ('Praktická škola s vyučovacím jazykom maďarským ako súčasť Špeciálnej základnej školy s vyučovacím jazykom maďarským', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Praktická škola sv. Jozefa ako organizačná zložka Spojenej školy sv. Jozefa', 'secondary', 'SK', 'Turzovka'),
  ('Praktická škola sv. Maximiliána Mária Kolbeho ako organizačná zložka Spojenej školy sv.M.M.Kolbeho', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Praktická škola, ako organizačná zložka Spojenej školy (Bratislava-Dúbravka)', 'secondary', 'SK', 'Bratislava-Dúbravka'),
  ('Praktická škola, ako organizačná zložka Spojenej školy (Bratislava-Karlova Ves)', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Praktická škola, ako organizačná zložka Spojenej školy (Malacky)', 'secondary', 'SK', 'Malacky'),
  ('Praktická škola, ako organizačná zložka Spojenej školy (Pezinok)', 'secondary', 'SK', 'Pezinok'),
  ('Praktická škola, ako organizačná zložka Spojenej školy (Senec)', 'secondary', 'SK', 'Senec'),
  ('Premonštrátske gymnázium', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Reedukačné centrum (Hlohovec)', 'secondary', 'SK', 'Hlohovec'),
  ('Reedukačné centrum (Levoča)', 'secondary', 'SK', 'Levoča'),
  ('Reedukačné centrum (Sološnica)', 'secondary', 'SK', 'Sološnica'),
  ('Reedukačné centrum (Tornaľa)', 'secondary', 'SK', 'Tornaľa'),
  ('Spojena škola', 'secondary', 'SK', 'Dunajská Streda'),
  ('Spojená katolícka škola', 'secondary', 'SK', 'Nitra'),
  ('Spojená škola (Banská Bystrica)', 'secondary', 'SK', 'Banská Bystrica'),
  ('Spojená škola (Bardejov)', 'secondary', 'SK', 'Bardejov'),
  ('Spojená škola (Bratislava-Karlova Ves)', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Spojená škola (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Spojená škola (Chminianske Jakubovany)', 'secondary', 'SK', 'Chminianske Jakubovany'),
  ('Spojená škola (Dobšiná)', 'secondary', 'SK', 'Dobšiná'),
  ('Spojená škola (Hlohovec)', 'secondary', 'SK', 'Hlohovec'),
  ('Spojená škola (Holíč)', 'secondary', 'SK', 'Holíč'),
  ('Spojená škola (Ivanka pri Dunaji)', 'secondary', 'SK', 'Ivanka pri Dunaji'),
  ('Spojená škola (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Spojená škola (Košice-Vyšné Opátske)', 'secondary', 'SK', 'Košice-Vyšné Opátske'),
  ('Spojená škola (Lipany)', 'secondary', 'SK', 'Lipany'),
  ('Spojená škola (Medzilaborce)', 'secondary', 'SK', 'Medzilaborce'),
  ('Spojená škola (Moldava nad Bodvou)', 'secondary', 'SK', 'Moldava nad Bodvou'),
  ('Spojená škola (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Spojená škola (Nižná)', 'secondary', 'SK', 'Nižná'),
  ('Spojená škola (Nová Baňa)', 'secondary', 'SK', 'Nová Baňa'),
  ('Spojená škola (Nové Zámky)', 'secondary', 'SK', 'Nové Zámky'),
  ('Spojená škola (Pezinok)', 'secondary', 'SK', 'Pezinok'),
  ('Spojená škola (Poltár)', 'secondary', 'SK', 'Poltár'),
  ('Spojená škola (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Spojená škola (Prievidza)', 'secondary', 'SK', 'Prievidza'),
  ('Spojená škola (Rudňany)', 'secondary', 'SK', 'Rudňany'),
  ('Spojená škola (Ružomberok)', 'secondary', 'SK', 'Ružomberok'),
  ('Spojená škola (Sabinov)', 'secondary', 'SK', 'Sabinov'),
  ('Spojená škola (Sečovce)', 'secondary', 'SK', 'Sečovce'),
  ('Spojená škola (Spišská Nová Ves)', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Spojená škola (Spišský Štiavnik)', 'secondary', 'SK', 'Spišský Štiavnik'),
  ('Spojená škola (Stará Ľubovňa)', 'secondary', 'SK', 'Stará Ľubovňa'),
  ('Spojená škola (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Spojená škola (Veľké Kapušany)', 'secondary', 'SK', 'Veľké Kapušany'),
  ('Spojená škola (Čaklov)', 'secondary', 'SK', 'Čaklov'),
  ('Spojená škola (Šaľa)', 'secondary', 'SK', 'Šaľa'),
  ('Spojená škola internátna (Bratislava-Karlova Ves)', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Spojená škola internátna (Bratislava-Nové Mesto)', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Spojená škola internátna (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Spojená škola internátna (Kremnica)', 'secondary', 'SK', 'Kremnica'),
  ('Spojená škola internátna (Kysucké Nové Mesto)', 'secondary', 'SK', 'Kysucké Nové Mesto'),
  ('Spojená škola internátna (Levoča)', 'secondary', 'SK', 'Levoča'),
  ('Spojená škola internátna (Liptovský Mikuláš)', 'secondary', 'SK', 'Liptovský Mikuláš'),
  ('Spojená škola internátna (Medzilaborce)', 'secondary', 'SK', 'Medzilaborce'),
  ('Spojená škola internátna (Michalovce)', 'secondary', 'SK', 'Michalovce'),
  ('Spojená škola internátna (Námestovo)', 'secondary', 'SK', 'Námestovo'),
  ('Spojená škola internátna (Prakovce)', 'secondary', 'SK', 'Prakovce'),
  ('Spojená škola internátna (Rožňava)', 'secondary', 'SK', 'Rožňava'),
  ('Spojená škola internátna (Snina)', 'secondary', 'SK', 'Snina'),
  ('Spojená škola internátna (Stará Ľubovňa)', 'secondary', 'SK', 'Stará Ľubovňa'),
  ('Spojená škola internátna (Svidník)', 'secondary', 'SK', 'Svidník'),
  ('Spojená škola internátna (Trebišov)', 'secondary', 'SK', 'Trebišov'),
  ('Spojená škola internátna (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Spojená škola internátna (Valaská)', 'secondary', 'SK', 'Valaská'),
  ('Spojená škola internátna (Vranov nad Topľou)', 'secondary', 'SK', 'Vranov nad Topľou'),
  ('Spojená škola internátna (Šahy)', 'secondary', 'SK', 'Šahy'),
  ('Spojená škola internátna (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Spojená škola Juraja Henischa', 'secondary', 'SK', 'Bardejov'),
  ('Spojená škola Jána Vojtaššáka internátna', 'secondary', 'SK', 'Levoča'),
  ('Spojená škola Pavla Sabadoša internátna', 'secondary', 'SK', 'Prešov'),
  ('Spojená škola Samuela Mikovíniho', 'secondary', 'SK', 'Banská Štiavnica'),
  ('Spojená škola sv. Jána Bosca', 'secondary', 'SK', 'Nová Dubnica'),
  ('Spojená škola sv. Klementa Hofbauera internátna', 'secondary', 'SK', 'Podolínec'),
  ('Stredná odborná škola (Banská Bystrica)', 'secondary', 'SK', 'Banská Bystrica'),
  ('Stredná odborná škola (Handlová)', 'secondary', 'SK', 'Handlová'),
  ('Stredná odborná škola (Hnúšťa)', 'secondary', 'SK', 'Hnúšťa'),
  ('Stredná odborná škola (Kežmarok)', 'secondary', 'SK', 'Kežmarok'),
  ('Stredná odborná škola (Nováky)', 'secondary', 'SK', 'Nováky'),
  ('Stredná odborná škola (Pruské)', 'secondary', 'SK', 'Pruské'),
  ('Stredná odborná škola (Snina)', 'secondary', 'SK', 'Snina'),
  ('Stredná odborná škola (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Stredná odborná škola (Vranov nad Topľou)', 'secondary', 'SK', 'Vranov nad Topľou'),
  ('Stredná odborná škola (Žarnovica)', 'secondary', 'SK', 'Žarnovica'),
  ('Stredná odborná škola - Szakközépiskola', 'secondary', 'SK', 'Tornaľa'),
  ('Stredná odborná škola agropotravinárska a technická', 'secondary', 'SK', 'Kežmarok'),
  ('Stredná odborná škola agrotechnická', 'secondary', 'SK', 'Topoľčany'),
  ('Stredná odborná škola automobilová (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Stredná odborná škola automobilová (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Stredná odborná škola automobilová a podnikania', 'secondary', 'SK', 'Senec'),
  ('Stredná odborná škola beauty služieb (Bratislava-Nové Mesto)', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Stredná odborná škola beauty služieb (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Stredná odborná škola chemická', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná odborná škola chemická a Škola umeleckého priemyslu', 'secondary', 'SK', 'Hlohovec'),
  ('Stredná odborná škola chovu koní a služieb - Lótenyésztési és Szolgáltatóipari Szakközépiskola', 'secondary', 'SK', 'Šaľa'),
  ('Stredná odborná škola dopravná (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná odborná škola dopravná (Martin)', 'secondary', 'SK', 'Martin'),
  ('Stredná odborná škola dopravná (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná odborná škola dopravná (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Stredná odborná škola dopravná (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná odborná škola dopravy a služieb (Nové Zámky)', 'secondary', 'SK', 'Nové Zámky'),
  ('Stredná odborná škola dopravy a služieb (Strážske)', 'secondary', 'SK', 'Strážske'),
  ('Stredná odborná škola drevárska (Spišská Nová Ves)', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Stredná odborná škola drevárska (Topoľčany)', 'secondary', 'SK', 'Topoľčany'),
  ('Stredná odborná škola drevárska (Vranov nad Topľou)', 'secondary', 'SK', 'Vranov nad Topľou'),
  ('Stredná odborná škola drevárska (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Stredná odborná škola drevárska a stavebná', 'secondary', 'SK', 'Krásno nad Kysucou'),
  ('Stredná odborná škola ekonomická', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Stredná odborná škola ekonomická a pedagogická s vyučovacím jazykom maďarským - Közgazdasági és Pedagógiai Szakközépisko', 'secondary', 'SK', 'Senec'),
  ('Stredná odborná škola ekonomiky, hotelierstva a služieb Jána Andraščíka', 'secondary', 'SK', 'Bardejov'),
  ('Stredná odborná škola elektrotechnická (Gbely)', 'secondary', 'SK', 'Gbely'),
  ('Stredná odborná škola elektrotechnická (Liptovský Hrádok)', 'secondary', 'SK', 'Liptovský Hrádok'),
  ('Stredná odborná škola elektrotechnická (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Stredná odborná škola elektrotechnická (Stropkov)', 'secondary', 'SK', 'Stropkov'),
  ('Stredná odborná škola elektrotechnická (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Stredná odborná škola elektrotechnická (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná odborná škola gastronómie a cestovného ruchu', 'secondary', 'SK', 'Nitra'),
  ('Stredná odborná škola gastronómie a hotelových služieb', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Stredná odborná škola gastronómie a služieb (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná odborná škola gastronómie a služieb (Šurany)', 'secondary', 'SK', 'Šurany'),
  ('Stredná odborná škola hotelová', 'secondary', 'SK', 'Vysoké Tatry'),
  ('Stredná odborná škola hotelových služieb a dopravy', 'secondary', 'SK', 'Lučenec'),
  ('Stredná odborná škola hotelových služieb a obchodu (Nové Zámky)', 'secondary', 'SK', 'Nové Zámky'),
  ('Stredná odborná škola hotelových služieb a obchodu (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Stredná odborná škola informačných technológií (Banská Bystrica)', 'secondary', 'SK', 'Banská Bystrica'),
  ('Stredná odborná škola informačných technológií (Bratislava-Rača)', 'secondary', 'SK', 'Bratislava-Rača'),
  ('Stredná odborná škola informačných technológií (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Stredná odborná škola Jána Antonína Baťu', 'secondary', 'SK', 'Partizánske'),
  ('Stredná odborná škola kaderníctva a vizážistiky', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná odborná škola lesnícka (Banská Štiavnica)', 'secondary', 'SK', 'Banská Štiavnica'),
  ('Stredná odborná škola lesnícka (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná odborná škola lesnícka a drevárska Jozefa Dekreta Matejovie', 'secondary', 'SK', 'Liptovský Hrádok'),
  ('Stredná odborná škola letecko - technická', 'secondary', 'SK', 'Trenčín'),
  ('Stredná odborná škola lýceum C. S. Lewisa', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Stredná odborná škola masmediálnych a informačných štúdií', 'secondary', 'SK', 'Bratislava-Rača'),
  ('Stredná odborná škola obchodu a služieb (Dolný Kubín)', 'secondary', 'SK', 'Dolný Kubín'),
  ('Stredná odborná škola obchodu a služieb (Galanta)', 'secondary', 'SK', 'Galanta'),
  ('Stredná odborná škola obchodu a služieb (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Stredná odborná škola obchodu a služieb (Martin)', 'secondary', 'SK', 'Martin'),
  ('Stredná odborná škola obchodu a služieb (Michalovce)', 'secondary', 'SK', 'Michalovce'),
  ('Stredná odborná škola obchodu a služieb (Nové Mesto nad Váhom)', 'secondary', 'SK', 'Nové Mesto nad Váhom'),
  ('Stredná odborná škola obchodu a služieb (Piešťany)', 'secondary', 'SK', 'Piešťany'),
  ('Stredná odborná škola obchodu a služieb (Prievidza)', 'secondary', 'SK', 'Prievidza'),
  ('Stredná odborná škola obchodu a služieb (Púchov)', 'secondary', 'SK', 'Púchov'),
  ('Stredná odborná škola obchodu a služieb (Rimavská Sobota)', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Stredná odborná škola obchodu a služieb (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Stredná odborná škola obchodu a služieb (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Stredná odborná škola obchodu a služieb (Čadca)', 'secondary', 'SK', 'Čadca'),
  ('Stredná odborná škola obchodu a služieb (Žiar nad Hronom)', 'secondary', 'SK', 'Žiar nad Hronom'),
  ('Stredná odborná škola obchodu a služieb - Kereskedelmi és Szolgáltatóipari Szakközépiskola', 'secondary', 'SK', 'Komárno'),
  ('Stredná odborná škola obchodu a služieb a Stredná odborná škola potravinárska', 'secondary', 'SK', 'Topoľčany'),
  ('Stredná odborná škola obchodu a služieb Jána Bocatia', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná odborná škola obchodu a služieb Samuela Jurkoviča', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná odborná škola obchodu, služieb a rozvoja vidieka - Kereskedelmi, Szolgáltatóipari és Vidékfejlesztési Szakközépi', 'secondary', 'SK', 'Kravany nad Dunajom'),
  ('Stredná odborná škola pedagogická (Bratislava-Dúbravka)', 'secondary', 'SK', 'Bratislava-Dúbravka'),
  ('Stredná odborná škola pedagogická (Levice)', 'secondary', 'SK', 'Levice'),
  ('Stredná odborná škola pedagogická (Levoča)', 'secondary', 'SK', 'Levoča'),
  ('Stredná odborná škola pedagogická (Modra)', 'secondary', 'SK', 'Modra'),
  ('Stredná odborná škola pedagogická (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná odborná škola pedagogická (Turčianske Teplice)', 'secondary', 'SK', 'Turčianske Teplice'),
  ('Stredná odborná škola pedagogická - Pedagógiai Szakközépiskola', 'secondary', 'SK', 'Lučenec'),
  ('Stredná odborná škola pedagogická sv. Andreja-Svorada a Benedikta', 'secondary', 'SK', 'Trenčín'),
  ('Stredná odborná škola pedagogická sv. Cyrila a Metoda', 'secondary', 'SK', 'Košice-Juh'),
  ('Stredná odborná škola pedagogická sv. Márie Goretti', 'secondary', 'SK', 'Čadca'),
  ('Stredná odborná škola podnikania a služieb (Lipany)', 'secondary', 'SK', 'Lipany'),
  ('Stredná odborná škola podnikania a služieb (Námestovo)', 'secondary', 'SK', 'Námestovo'),
  ('Stredná odborná škola podnikania a služieb (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná odborná škola podnikania v remeslách a službách', 'secondary', 'SK', 'Senica'),
  ('Stredná odborná škola polygrafická', 'secondary', 'SK', 'Bratislava-Rača'),
  ('Stredná odborná škola polytechnická (Dolný Kubín)', 'secondary', 'SK', 'Dolný Kubín'),
  ('Stredná odborná škola polytechnická (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Stredná odborná škola polytechnická (Martin)', 'secondary', 'SK', 'Martin'),
  ('Stredná odborná škola polytechnická (Prievidza)', 'secondary', 'SK', 'Prievidza'),
  ('Stredná odborná škola polytechnická (Ružomberok)', 'secondary', 'SK', 'Ružomberok'),
  ('Stredná odborná škola polytechnická (Zlaté Moravce)', 'secondary', 'SK', 'Zlaté Moravce'),
  ('Stredná odborná škola polytechnická a služieb arm. gen. L. Svobodu', 'secondary', 'SK', 'Svidník'),
  ('Stredná odborná škola polytechnická Jána Antonína Baťu', 'secondary', 'SK', 'Svit'),
  ('Stredná odborná škola potravinárska', 'secondary', 'SK', 'Nitra'),
  ('Stredná odborná škola poľnohospodárstva a služieb na vidieku (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Stredná odborná škola poľnohospodárstva a služieb na vidieku (Levice)', 'secondary', 'SK', 'Levice'),
  ('Stredná odborná škola poľnohospodárstva a služieb na vidieku (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Stredná odborná škola poľnohospodárstva a služieb na vidieku (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná odborná škola pre žiakov s telesným postihnutím', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Stredná odborná škola pri Reedukačnom centre', 'secondary', 'SK', 'Zlaté Moravce'),
  ('Stredná odborná škola priemyselných technológii', 'secondary', 'SK', 'Košice-Šaca'),
  ('Stredná odborná škola priemyselných technológií', 'secondary', 'SK', 'Púchov'),
  ('Stredná odborná škola regionálneho rozvoja a Stredná odborná škola záhradnícka', 'secondary', 'SK', 'Rakovice'),
  ('Stredná odborná škola remesiel', 'secondary', 'SK', 'Považská Bystrica'),
  ('Stredná odborná škola remesiel a služieb', 'secondary', 'SK', 'Poprad'),
  ('Stredná odborná škola rozvoja vidieka s vyučovacím jazykom maďarským - Vidékfejlesztési Szakközépiskola a Stredná športo', 'secondary', 'SK', 'Dunajská Streda'),
  ('Stredná odborná škola s vyučovacím jazykom maďarským - Szakközépiskola,  ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Rožňava'),
  ('Stredná odborná škola služieb (Levice)', 'secondary', 'SK', 'Levice'),
  ('Stredná odborná škola služieb (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná odborná škola služieb a priemyslu sv. Jozafáta', 'secondary', 'SK', 'Trebišov'),
  ('Stredná odborná škola služieb Majstra Pavla', 'secondary', 'SK', 'Levoča'),
  ('Stredná odborná škola stavebná (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Stredná odborná škola stavebná (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná odborná škola stavebná - Építészeti Szakközépiskola', 'secondary', 'SK', 'Nové Zámky'),
  ('Stredná odborná škola stavebná a Stredná odborná škola agropotravinárska a technická', 'secondary', 'SK', 'Liptovský Mikuláš'),
  ('Stredná odborná škola strojnícka (Bánovce nad Bebravou)', 'secondary', 'SK', 'Bánovce nad Bebravou'),
  ('Stredná odborná škola strojnícka (Kysucké Nové Mesto)', 'secondary', 'SK', 'Kysucké Nové Mesto'),
  ('Stredná odborná škola strojnícka (Považská Bystrica)', 'secondary', 'SK', 'Považská Bystrica'),
  ('Stredná odborná škola strojnícka (Skalica)', 'secondary', 'SK', 'Skalica'),
  ('Stredná odborná škola sv. Cyrila a Metoda', 'secondary', 'SK', 'Michalovce'),
  ('Stredná odborná škola sv. Jozefa Robotníka', 'secondary', 'SK', 'Žilina'),
  ('Stredná odborná škola technická (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Stredná odborná škola technická (Dubnica nad Váhom)', 'secondary', 'SK', 'Dubnica nad Váhom'),
  ('Stredná odborná škola technická (Hlohovec)', 'secondary', 'SK', 'Hlohovec'),
  ('Stredná odborná škola technická (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Stredná odborná škola technická (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Stredná odborná škola technická (Michalovce)', 'secondary', 'SK', 'Michalovce'),
  ('Stredná odborná škola technická (Námestovo)', 'secondary', 'SK', 'Námestovo'),
  ('Stredná odborná škola technická (Piešťany)', 'secondary', 'SK', 'Piešťany'),
  ('Stredná odborná škola technická (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Stredná odborná škola technická (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná odborná škola technická (Rožňava)', 'secondary', 'SK', 'Rožňava'),
  ('Stredná odborná škola technická (Tlmače)', 'secondary', 'SK', 'Tlmače'),
  ('Stredná odborná škola technická (Vráble)', 'secondary', 'SK', 'Vráble'),
  ('Stredná odborná škola technická (Zlaté Moravce)', 'secondary', 'SK', 'Zlaté Moravce'),
  ('Stredná odborná škola technická (Čadca)', 'secondary', 'SK', 'Čadca'),
  ('Stredná odborná škola technická (Šurany)', 'secondary', 'SK', 'Šurany'),
  ('Stredná odborná škola technická - Múszaki Szakközépiskola (Dunajská Streda)', 'secondary', 'SK', 'Dunajská Streda'),
  ('Stredná odborná škola technická - Múszaki Szakközépiskola (Galanta)', 'secondary', 'SK', 'Galanta'),
  ('Stredná odborná škola technická - Műszaki Szakközépiskola', 'secondary', 'SK', 'Komárno'),
  ('Stredná odborná škola technická a agropotravinárska - Műszaki, Mezőgazdasági és Élelmiszeripari Szakközépiskola', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Stredná odborná škola technická a ekonomická Jozefa Szakkayho - Szakkay József Műszaki és Közgazdasági Szakközépiskola', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná odborná škola techniky a mechanizácie - Műszaki és Gépesítési Szakközépiskola', 'secondary', 'SK', 'Hurbanovo'),
  ('Stredná odborná škola techniky a remesiel - Műszaki Szakok és Mesterségek Szakközépiskola', 'secondary', 'SK', 'Kráľovský Chlmec'),
  ('Stredná odborná škola techniky a služieb (Brezno)', 'secondary', 'SK', 'Brezno'),
  ('Stredná odborná škola techniky a služieb (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Stredná odborná škola techniky a služieb (Topoľčany)', 'secondary', 'SK', 'Topoľčany'),
  ('Stredná odborná škola techniky a služieb a Stredná priemyselná škola strojnícka a elektrotechnická, Pod amfiteátrom 7, L', 'secondary', 'SK', 'Levice'),
  ('Stredná odborná škola technológií a remesiel', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná odborná škola veterinárna (Košice-Barca)', 'secondary', 'SK', 'Košice-Barca'),
  ('Stredná odborná škola veterinárna (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Stredná odborná škola vinársko - ovocinárska', 'secondary', 'SK', 'Modra'),
  ('Stredná odborná škola železničná', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná priemyselná škola (Dubnica nad Váhom)', 'secondary', 'SK', 'Dubnica nad Váhom'),
  ('Stredná priemyselná škola (Myjava)', 'secondary', 'SK', 'Myjava'),
  ('Stredná priemyselná škola (Nové Mesto nad Váhom)', 'secondary', 'SK', 'Nové Mesto nad Váhom'),
  ('Stredná priemyselná škola (Považská Bystrica)', 'secondary', 'SK', 'Považská Bystrica'),
  ('Stredná priemyselná škola (Snina)', 'secondary', 'SK', 'Snina'),
  ('Stredná priemyselná škola (Stará Turá)', 'secondary', 'SK', 'Stará Turá'),
  ('Stredná priemyselná škola dopravná (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná priemyselná škola dopravná (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná priemyselná škola dopravná (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Stredná priemyselná škola dopravná (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Stredná priemyselná škola elektrotechnická (Bratislava-Dúbravka)', 'secondary', 'SK', 'Bratislava-Dúbravka'),
  ('Stredná priemyselná škola elektrotechnická (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Stredná priemyselná škola elektrotechnická (Bratislava-Staré Mesto)', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Stredná priemyselná škola elektrotechnická (Košice-Sever)', 'secondary', 'SK', 'Košice-Sever'),
  ('Stredná priemyselná škola elektrotechnická (Piešťany)', 'secondary', 'SK', 'Piešťany'),
  ('Stredná priemyselná škola elektrotechnická (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná priemyselná škola informačných technológií a Gymnázium', 'secondary', 'SK', 'Kysucké Nové Mesto'),
  ('Stredná priemyselná škola informačných technológií a umelej inteligencie Skyro', 'secondary', 'SK', 'Bratislava-Podunajské Bis'),
  ('Stredná priemyselná škola informačných technológií Ignáca Gessaya, Stredná odborná škola lesnícka a Gymnázium', 'secondary', 'SK', 'Tvrdošín'),
  ('Stredná priemyselná škola Jozefa Murgaša', 'secondary', 'SK', 'Banská Bystrica'),
  ('Stredná priemyselná škola stavebná (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Stredná priemyselná škola stavebná (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná priemyselná škola stavebná (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná priemyselná škola stavebná - Építőipari Szakközépiskola', 'secondary', 'SK', 'Hurbanovo'),
  ('Stredná priemyselná škola stavebná a geodetická (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná priemyselná škola stavebná a geodetická (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná priemyselná škola stavebná Dušana Samuela Jurkoviča', 'secondary', 'SK', 'Trnava'),
  ('Stredná priemyselná škola stavebná Emila Belluša', 'secondary', 'SK', 'Trenčín'),
  ('Stredná priemyselná škola stavebná Oskara Winklera - Winkler Oszkár Építőipari Szakközépiskola a Stredná odborná škola t', 'secondary', 'SK', 'Lučenec'),
  ('Stredná priemyselná škola strojnícka (Bratislava-Staré Mesto)', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Stredná priemyselná škola strojnícka (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná priemyselná škola strojnícka (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná priemyselná škola strojnícka a elektrotechnická', 'secondary', 'SK', 'Nitra'),
  ('Stredná priemyselná škola strojnícka a elektrotechnická - Gépipari és Elektrotechnikai Szakközépiskola', 'secondary', 'SK', 'Komárno'),
  ('Stredná priemyselná škola technická (Bardejov)', 'secondary', 'SK', 'Bardejov'),
  ('Stredná priemyselná škola technická (Martin)', 'secondary', 'SK', 'Martin'),
  ('Stredná priemyselná škola technická (Spišská Nová Ves)', 'secondary', 'SK', 'Spišská Nová Ves'),
  ('Stredná priemyselná škola technická (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Stredná priemyselná škola techniky a dizajnu', 'secondary', 'SK', 'Poprad'),
  ('Stredná zdravotnícka škola (Banská Bystrica)', 'secondary', 'SK', 'Banská Bystrica'),
  ('Stredná zdravotnícka škola (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Stredná zdravotnícka škola (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Stredná zdravotnícka škola (Dolný Kubín)', 'secondary', 'SK', 'Dolný Kubín'),
  ('Stredná zdravotnícka škola (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Stredná zdravotnícka škola (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Stredná zdravotnícka škola (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná zdravotnícka škola (Liptovský Mikuláš)', 'secondary', 'SK', 'Liptovský Mikuláš'),
  ('Stredná zdravotnícka škola (Lučenec)', 'secondary', 'SK', 'Lučenec'),
  ('Stredná zdravotnícka škola (Michalovce)', 'secondary', 'SK', 'Michalovce'),
  ('Stredná zdravotnícka škola (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Stredná zdravotnícka škola (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Stredná zdravotnícka škola (Považská Bystrica)', 'secondary', 'SK', 'Považská Bystrica'),
  ('Stredná zdravotnícka škola (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Stredná zdravotnícka škola (Prievidza)', 'secondary', 'SK', 'Prievidza'),
  ('Stredná zdravotnícka škola (Skalica)', 'secondary', 'SK', 'Skalica'),
  ('Stredná zdravotnícka škola (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Stredná zdravotnícka škola (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Stredná zdravotnícka škola (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná zdravotnícka škola - Egészségugyi Középiskola', 'secondary', 'SK', 'Dunajská Streda'),
  ('Stredná zdravotnícka škola - Egészségügyi Középiskola (Nové Zámky)', 'secondary', 'SK', 'Nové Zámky'),
  ('Stredná zdravotnícka škola - Egészségügyi Középiskola (Rožňava)', 'secondary', 'SK', 'Rožňava'),
  ('Stredná zdravotnícka škola Celestíny Šimurkovej v Trenčíne', 'secondary', 'SK', 'Trenčín'),
  ('Stredná zdravotnícka škola M. T. Schererovej', 'secondary', 'SK', 'Ružomberok'),
  ('Stredná zdravotnícka škola milosrdného Samaritána', 'secondary', 'SK', 'Svidník'),
  ('Stredná zdravotnícka škola sv. Alžbety', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Stredná zdravotnícka škola sv. Bazila Veľkého', 'secondary', 'SK', 'Prešov'),
  ('Stredná zdravotnícka škola sv. Františka z Assisi', 'secondary', 'SK', 'Čadca'),
  ('Stredná zdravotnícka škola sv. Vincenta de Paul', 'secondary', 'SK', 'Topoľčany'),
  ('Stredná zdravotnícka škola Štefana Kluberta', 'secondary', 'SK', 'Levoča'),
  ('Stredná športová škola (Banská Bystrica)', 'secondary', 'SK', 'Banská Bystrica'),
  ('Stredná športová škola (Košice-Západ)', 'secondary', 'SK', 'Košice-Západ'),
  ('Stredná športová škola (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Stredná športová škola (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Stredná športová škola (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Stredná športová škola ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Súkromná hotelová akadémia (Banská Štiavnica)', 'secondary', 'SK', 'Banská Štiavnica'),
  ('Súkromná hotelová akadémia (Považská Bystrica)', 'secondary', 'SK', 'Považská Bystrica'),
  ('Súkromná hotelová akadémia - Dufincova', 'secondary', 'SK', 'Michalovce'),
  ('Súkromná hotelová akadémia SD Jednota', 'secondary', 'SK', 'Šamorín'),
  ('Súkromná obchodná akadémia (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromná obchodná akadémia (Považská Bystrica)', 'secondary', 'SK', 'Považská Bystrica'),
  ('Súkromná obchodná akadémia (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Súkromná obchodná akadémia DSA', 'secondary', 'SK', 'Žiar nad Hronom'),
  ('Súkromná obchodná akadémia Profi - Kamo', 'secondary', 'SK', 'Bratislava-Podunajské Bis'),
  ('Súkromná praktická škola (Košice-Myslava)', 'secondary', 'SK', 'Košice-Myslava'),
  ('Súkromná praktická škola (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Súkromná praktická škola ako organizačná zložka Súkromnej spojenej školy (Detva)', 'secondary', 'SK', 'Detva'),
  ('Súkromná praktická škola ako organizačná zložka Súkromnej spojenej školy (Klokočov)', 'secondary', 'SK', 'Klokočov'),
  ('Súkromná praktická škola ako organizačná zložka Súkromnej spojenej školy (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Súkromná SOŠ automobilová Duálna akadémia', 'secondary', 'SK', 'Bratislava-Devínska Nová'),
  ('Súkromná spojená škola (Kolárovo)', 'secondary', 'SK', 'Kolárovo'),
  ('Súkromná spojená škola (Martin)', 'secondary', 'SK', 'Martin'),
  ('Súkromná spojená škola (Štúrovo)', 'secondary', 'SK', 'Štúrovo'),
  ('Súkromná Spojená škola EDUCO', 'secondary', 'SK', 'Námestovo'),
  ('Súkromná spojená škola EDURAM', 'secondary', 'SK', 'Krompachy'),
  ('Súkromná spojená škola Železiarne Podbrezová', 'secondary', 'SK', 'Podbrezová'),
  ('Súkromná spojená škola, Biela voda', 'secondary', 'SK', 'Kežmarok'),
  ('Súkromná stredná odborná  škola ochrany osôb a majetku', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromná stredná odborná škola  Magán Szakkozépiskola', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Súkromná stredná odborná škola (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Súkromná stredná odborná škola (Bytča)', 'secondary', 'SK', 'Bytča'),
  ('Súkromná stredná odborná škola (Giraltovce)', 'secondary', 'SK', 'Giraltovce'),
  ('Súkromná stredná odborná škola (Hliník nad Hronom)', 'secondary', 'SK', 'Hliník nad Hronom'),
  ('Súkromná stredná odborná škola (Košice-Nad jazerom)', 'secondary', 'SK', 'Košice-Nad jazerom'),
  ('Súkromná stredná odborná škola (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Súkromná stredná odborná škola (Revúca)', 'secondary', 'SK', 'Revúca'),
  ('Súkromná stredná odborná škola (Trebišov)', 'secondary', 'SK', 'Trebišov'),
  ('Súkromná stredná odborná škola (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Súkromná stredná odborná škola (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Súkromná stredná odborná škola - Gastroškola', 'secondary', 'SK', 'Bratislava-Podunajské Bis'),
  ('Súkromná stredná odborná škola - Magán Szakközépiskola', 'secondary', 'SK', 'Sládkovičovo'),
  ('Súkromná stredná odborná škola ADVENTIM - Magán Szakközépiskola ADVENTIM', 'secondary', 'SK', 'Dunajská Streda'),
  ('Súkromná stredná odborná škola ANIMUS', 'secondary', 'SK', 'Nitra'),
  ('Súkromná stredná odborná škola DSA (Trebišov)', 'secondary', 'SK', 'Trebišov'),
  ('Súkromná stredná odborná škola DSA (Trnava)', 'secondary', 'SK', 'Trnava'),
  ('Súkromná stredná odborná škola ekonomicko-technická', 'secondary', 'SK', 'Košice-Dargovských hrdino'),
  ('Súkromná stredná odborná škola ekonomická KOŠICKÁ AKADÉMIA', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Súkromná stredná odborná škola ELBA', 'secondary', 'SK', 'Prešov'),
  ('Súkromná stredná odborná škola HOST', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Súkromná stredná odborná škola hotelierstva a gastronómie Mladosť', 'secondary', 'SK', 'Prešov'),
  ('Súkromná stredná odborná škola Johannes Senio Service', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromná stredná odborná škola Nová cesta Magán Szakközépiskola Új út', 'secondary', 'SK', 'Malčice'),
  ('Súkromná stredná odborná škola obchodu a služieb', 'secondary', 'SK', 'Očová'),
  ('Súkromná stredná odborná škola obchodu a služieb s vyučovacím jazykom maďarským - Magán Kereskedelmi és Szolgáltatóipari', 'secondary', 'SK', 'Bátorove Kosihy'),
  ('Súkromná stredná odborná škola obchodu a služieb, s vyučovacím jazykom maďarským - Magán Kereskedelmi és Szolgáltatóipar', 'secondary', 'SK', 'Mostová'),
  ('Súkromná stredná odborná škola PAMIKO', 'secondary', 'SK', 'Košice-Juh'),
  ('Súkromná stredná odborná škola pedagogická (Bratislava-Podunajské Bis)', 'secondary', 'SK', 'Bratislava-Podunajské Bis'),
  ('Súkromná stredná odborná škola pedagogická (Topoľčany)', 'secondary', 'SK', 'Topoľčany'),
  ('Súkromná stredná odborná škola pedagogická a sociálna (Bratislava-Karlova Ves)', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Súkromná stredná odborná škola pedagogická a sociálna (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Súkromná stredná odborná škola pedagogická EBG (Brezno)', 'secondary', 'SK', 'Brezno'),
  ('Súkromná stredná odborná škola pedagogická EBG (Humenné)', 'secondary', 'SK', 'Humenné'),
  ('Súkromná stredná odborná škola podnikania (Ružomberok)', 'secondary', 'SK', 'Ružomberok'),
  ('Súkromná stredná odborná škola podnikania (Senica)', 'secondary', 'SK', 'Senica'),
  ('Súkromná stredná odborná škola podnikania (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Súkromná stredná odborná škola polytechnická DSA', 'secondary', 'SK', 'Nitra'),
  ('Súkromná stredná odborná škola Pro scholaris', 'secondary', 'SK', 'Žilina'),
  ('Súkromná stredná odborná škola s vyučovacím jazykom maďarským - Magyar Tannyelvü Magán Szakközépiskola', 'secondary', 'SK', 'Dunajská Streda'),
  ('Súkromná stredná odborná škola SD Jednota', 'secondary', 'SK', 'Šamorín'),
  ('Súkromná stredná odborná škola služieb (Bardejov)', 'secondary', 'SK', 'Bardejov'),
  ('Súkromná stredná odborná škola služieb (Poprad)', 'secondary', 'SK', 'Poprad'),
  ('Súkromná stredná odborná škola technická', 'secondary', 'SK', 'Žiar nad Hronom'),
  ('Súkromná stredná odborná škola veterinárna', 'secondary', 'SK', 'Bratislava-Dúbravka'),
  ('Súkromná stredná odborná škola VIA HUMANA', 'secondary', 'SK', 'Skalica'),
  ('Súkromná stredná športová škola (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromná stredná športová škola (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Súkromná stredná športová škola (Trenčianske Teplice)', 'secondary', 'SK', 'Trenčianske Teplice'),
  ('Súkromná stredná športová škola (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Súkromná stredná športová škola EISB', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Súkromná stredná športová škola ELBA', 'secondary', 'SK', 'Prešov'),
  ('Súkromná stredná športová škola GAUDEAMUS', 'secondary', 'SK', 'Bratislava-Podunajské Bis'),
  ('Súkromná škola umeleckého priemyslu (Hodruša-Hámre)', 'secondary', 'SK', 'Hodruša-Hámre'),
  ('Súkromná škola umeleckého priemyslu (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Súkromná škola umeleckého priemyslu (Topoľčany)', 'secondary', 'SK', 'Topoľčany'),
  ('Súkromná škola umeleckého priemyslu (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Súkromná škola umeleckého priemyslu (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Súkromná škola umeleckého priemyslu a vizuálneho umenia', 'secondary', 'SK', 'Zvolen'),
  ('Súkromná škola umeleckého priemyslu animovanej tvorby', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromná škola umeleckého priemyslu Bohumila Baču', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Súkromná škola umeleckého priemyslu filmová', 'secondary', 'SK', 'Košice-Západ'),
  ('Súkromné bilingválne gymnázium (Galanta)', 'secondary', 'SK', 'Galanta'),
  ('Súkromné bilingválne gymnázium (Ružomberok)', 'secondary', 'SK', 'Ružomberok'),
  ('Súkromné bilingválne gymnázium BESST', 'secondary', 'SK', 'Trnava'),
  ('Súkromné bilingválne gymnázium Co.Bra.', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Súkromné bulharské gymnázium Christa Boteva', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromné gymnázium (Bratislava-Nové Mesto)', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Súkromné gymnázium (Bratislava-Petržalka)', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromné gymnázium (Bratislava-Vrakuňa)', 'secondary', 'SK', 'Bratislava-Vrakuňa'),
  ('Súkromné gymnázium (Košice-Nad jazerom)', 'secondary', 'SK', 'Košice-Nad jazerom'),
  ('Súkromné gymnázium (Košice-Západ)', 'secondary', 'SK', 'Košice-Západ'),
  ('Súkromné gymnázium (Kremnica)', 'secondary', 'SK', 'Kremnica'),
  ('Súkromné gymnázium (Lučenec)', 'secondary', 'SK', 'Lučenec'),
  ('Súkromné gymnázium (Žilina)', 'secondary', 'SK', 'Žilina'),
  ('Súkromné gymnázium ako organizačná zložka Spojenej školy', 'secondary', 'SK', 'Poprad'),
  ('Súkromné gymnázium ako organizačná zložka Súkromnej spojenej školy', 'secondary', 'SK', 'Košice-Košická Nová Ves'),
  ('Súkromné gymnázium ako organizačná zložka Súkromnej spojenej školy European English School', 'secondary', 'SK', 'Prešov'),
  ('Súkromné gymnázium Banskobystrické', 'secondary', 'SK', 'Banská Bystrica'),
  ('Súkromné gymnázium British International School Bratislava, ako organizačná zložka Súkromnej spojenej školy British Inte', 'secondary', 'SK', 'Bratislava-Dúbravka'),
  ('Súkromné gymnázium Cambridge International School,  ako organizačná zložka Súkromnej spojenej školy Cambridge Internatio', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Súkromné gymnázium DSA', 'secondary', 'SK', 'Bardejov'),
  ('Súkromné Gymnázium DSA', 'secondary', 'SK', 'Sabinov'),
  ('Súkromné gymnázium ESPRIT', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Súkromné gymnázium FELIX', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Súkromné Gymnázium francúzsko-slovenské ako organizačná zložka Súkromnej spojenej školy francúzsko-slovenskej', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromné gymnázium FUTURUM (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Súkromné gymnázium FUTURUM (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Súkromné gymnázium GALILEO SCHOOL', 'secondary', 'SK', 'Bratislava-Podunajské Bis'),
  ('Súkromné gymnázium MERCURY', 'secondary', 'SK', 'Bratislava-Petržalka'),
  ('Súkromné gymnázium nemecko-slovenské', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Súkromné gymnázium pre žiakov so všeobecným intelektovým nadaním CENADA', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Súkromné gymnázium Quality Schools International ako organizačná zložka Súkromnej spojenej školy Quality Schools Interna', 'secondary', 'SK', 'Šamorín'),
  ('Súkromné gymnázium s vyučovacím jazykom maďarským - Magyar Tanítási Nyelvu Magángimnázium', 'secondary', 'SK', 'Dunajská Streda'),
  ('Súkromné gymnázium, ako organizačná zložka Súkromnej spojenej školy Kings Schools International', 'secondary', 'SK', 'Bratislava-Nové Mesto'),
  ('Súkromné hudobné a dramatické konzervatórium (Košice-Juh)', 'secondary', 'SK', 'Košice-Juh'),
  ('Súkromné hudobné a dramatické konzervatórium (Rimavská Sobota)', 'secondary', 'SK', 'Rimavská Sobota'),
  ('Súkromné konzervatórium (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Súkromné konzervatórium (Nitra)', 'secondary', 'SK', 'Nitra'),
  ('Súkromné konzervatórium (Zvolen)', 'secondary', 'SK', 'Zvolen'),
  ('Súkromné konzervatórium ALKANA', 'secondary', 'SK', 'Bratislava-Dúbravka'),
  ('Súkromné konzervatórium Dezidera Kardoša', 'secondary', 'SK', 'Topoľčany'),
  ('Súkromné konzervatórium Prešov', 'secondary', 'SK', 'Prešov'),
  ('Súkromné odborné učilište', 'secondary', 'SK', 'Stropkov'),
  ('Súkromné odborné učilište ELBA', 'secondary', 'SK', 'Svinia'),
  ('Súkromné tanečné konzervatórium', 'secondary', 'SK', 'Liptovský Hrádok'),
  ('Súkromné tanečné konzervatórium Dušana Nebylu', 'secondary', 'SK', 'Trnava'),
  ('Tanečné konzervatórium Evy Jaczovej', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Základná škola a GYMNÁZIUM s vyučovacím jazykom maďarským - Magyar Tannyelvű Alapiskola és Gimnázium', 'secondary', 'SK', 'Bratislava-Staré Mesto'),
  ('Škola umeleckého priemyslu (Bratislava-Ružinov)', 'secondary', 'SK', 'Bratislava-Ružinov'),
  ('Škola umeleckého priemyslu (Kežmarok)', 'secondary', 'SK', 'Kežmarok'),
  ('Škola umeleckého priemyslu (Košice-Staré Mesto)', 'secondary', 'SK', 'Košice-Staré Mesto'),
  ('Škola umeleckého priemyslu (Prešov)', 'secondary', 'SK', 'Prešov'),
  ('Škola umeleckého priemyslu (Ružomberok)', 'secondary', 'SK', 'Ružomberok'),
  ('Škola umeleckého priemyslu (Svidník)', 'secondary', 'SK', 'Svidník'),
  ('Škola umeleckého priemyslu (Trenčín)', 'secondary', 'SK', 'Trenčín'),
  ('Škola umeleckého priemyslu Josefa Vydru', 'secondary', 'SK', 'Bratislava-Karlova Ves'),
  ('Škola umeleckého priemyslu Ladislava Bielika', 'secondary', 'SK', 'Levice'),
  ('AMBIS vysoká škola', 'university', 'SK', null),
  ('Academia Rerum Civilium – Vysoká škola politických a společenských věd', 'university', 'CZ', null),
  ('Akademie Huspol', 'university', 'CZ', null),
  ('Akademie múzických umění v Praze', 'university', 'CZ', 'Praha'),
  ('Akademie výtvarných umění v Praze', 'university', 'CZ', 'Praha'),
  ('Akadémia Policajného zboru v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Akadémia médií, odborná vysoká škola mediálnej a marketingovej komunikácie v Bratislave', 'university', 'SK', 'Bratislave'),
  ('Akadémia ozbrojených síl generála M. R. Štefánika', 'university', 'SK', 'Liptovský Mikuláš'),
  ('Akadémia ozbrojených síl generála Milana Rastislava Štefánika', 'university', 'SK', null),
  ('Akadémia umení v Banskej Bystrici', 'university', 'SK', 'Banskej Bystrici'),
  ('Akreditační komise', 'university', 'CZ', null),
  ('Ambis Univerzita', 'university', 'CZ', null),
  ('Archip', 'university', 'CZ', null),
  ('B.I.B.S.', 'university', 'CZ', null),
  ('Bratislavská medzinárodná škola liberálnych štúdií', 'university', 'SK', null),
  ('CEVRO Univerzita', 'university', 'CZ', null),
  ('Collegium Humanum', 'university', 'CZ', null),
  ('Collegium Humanum – Varšavská univerzita manažmentu', 'university', 'SK', null),
  ('Ekonomická univerzita v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Filmová akademie Miroslava Ondříčka v Písku', 'university', 'CZ', 'Písku'),
  ('International ART CAMPUS Prague', 'university', 'CZ', null),
  ('Janáčkova akademie múzických umění', 'university', 'CZ', null),
  ('Jihočeská univerzita v Českých Budějovicích', 'university', 'CZ', 'České Budějovice'),
  ('Katolícka univerzita v Ružomberku', 'university', 'SK', 'Ružomberok'),
  ('Masarykova univerzita', 'university', 'CZ', 'Brno'),
  ('Mendelova univerzita v Brně', 'university', 'CZ', 'Brno'),
  ('Metropolitní univerzita Praha', 'university', 'CZ', null),
  ('Miss Academia', 'university', 'CZ', null),
  ('Moravská vysoká škola Olomouc', 'university', 'CZ', null),
  ('Národní akreditační úřad pro terciární vzdělávání', 'university', 'CZ', null),
  ('Ostravská univerzita', 'university', 'CZ', null),
  ('Paneurópska vysoká škola', 'university', 'SK', null),
  ('Panevropská univerzita', 'university', 'CZ', null),
  ('Pražská vysoká škola psychosociálních studií', 'university', 'CZ', null),
  ('Prešovská univerzita v Prešove', 'university', 'SK', 'Prešove'),
  ('Rada vysokých škol', 'university', 'CZ', null),
  ('Reforma vysokých škol v Česku', 'university', 'CZ', 'Česku'),
  ('Seznam fakult podle vysokých škol v Česku', 'university', 'CZ', 'Česku'),
  ('Seznam fakult vysokých škol v Česku podle oborů', 'university', 'CZ', 'Česku podle oborů'),
  ('Seznam vysokých škol v Česku', 'university', 'CZ', 'Česku'),
  ('Seznam československých stranických a politických škol', 'university', 'CZ', null),
  ('Slezská univerzita v Opavě', 'university', 'CZ', 'Opava'),
  ('Slovenská poľnohospodárska univerzita v Nitre', 'university', 'SK', 'Nitra'),
  ('Slovenská technická univerzita v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Slovenská zdravotnícka univerzita v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Soukromá vysoká škola ekonomická Znojmo', 'university', 'CZ', null),
  ('Soukromá vysoká škola ekonomických studií', 'university', 'CZ', null),
  ('Stredoeurópska vysoká škola v Skalici', 'university', 'SK', 'Skalici'),
  ('Studentské unie v Česku', 'university', 'CZ', 'Česku'),
  ('Středočeský vysokoškolský institut', 'university', 'CZ', null),
  ('Technická univerzita v Košiciach', 'university', 'SK', 'Košice'),
  ('Technická univerzita v Liberci', 'university', 'CZ', 'Liberec'),
  ('Technická univerzita vo Zvolene', 'university', 'SK', 'Zvolen'),
  ('Trenčianska univerzita Alexandra Dubčeka v Trenčíne', 'university', 'SK', 'Trenčíne'),
  ('Trnavská univerzita v Trnave', 'university', 'SK', 'Trnave'),
  ('Ukrajinský vyšší pedagogický institut', 'university', 'CZ', null),
  ('Unicorn University', 'university', 'CZ', null),
  ('University College Prague', 'university', 'CZ', null),
  ('University of New York in Prague', 'university', 'CZ', null),
  ('Univerzita Alexandra Dubčeka v Trenčíne', 'university', 'SK', 'Trenčín'),
  ('Univerzita Hradec Králové', 'university', 'CZ', 'Hradec Králové'),
  ('Univerzita J. Selyeho', 'university', 'SK', null),
  ('Univerzita J. Selyeho v Komárne', 'university', 'SK', 'Komárno'),
  ('Univerzita Jana Amose Komenského Praha', 'university', 'CZ', null),
  ('Univerzita Jana Evangelisty Purkyně v Ústí nad Labem', 'university', 'CZ', 'Ústí nad Labem'),
  ('Univerzita Karlova', 'university', 'CZ', 'Praha'),
  ('Univerzita Komenského v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Univerzita Konštantína Filozofa v Nitre', 'university', 'SK', 'Nitra'),
  ('Univerzita Mateja Bela v Banskej Bystrici', 'university', 'SK', 'Banská Bystrica'),
  ('Univerzita Ostrava', 'university', 'CZ', 'Ostrava'),
  ('Univerzita Palackého v Olomouci', 'university', 'CZ', 'Olomouc'),
  ('Univerzita Pardubice', 'university', 'CZ', 'Pardubice'),
  ('Univerzita Pavla Jozefa Šafárika v Košiciach', 'university', 'SK', 'Košice'),
  ('Univerzita Tomáše Bati ve Zlíně', 'university', 'CZ', 'Zlín'),
  ('Univerzita prešovská', 'university', 'SK', 'Prešov'),
  ('Univerzita sv. Alžbety v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Univerzita sv. Cyrila a Metoda v Trnave', 'university', 'SK', 'Trnava'),
  ('Univerzita třetího věku', 'university', 'CZ', null),
  ('Univerzita v Trnave', 'university', 'SK', 'Trnava'),
  ('Univerzita v Žiline', 'university', 'SK', 'Žilina'),
  ('Univerzita veterinárskeho lekárstva a farmácie v Košiciach', 'university', 'SK', 'Košice'),
  ('Uzavření českých vysokých škol 17. listopadu 1939', 'university', 'CZ', null),
  ('Veterinární univerzita Brno', 'university', 'CZ', null),
  ('Vojenská katedra', 'university', 'CZ', null),
  ('Vysokoškolské katolické hnutí', 'university', 'CZ', null),
  ('Vysoká škola DTI', 'university', 'SK', null),
  ('Vysoká škola Danubius', 'university', 'SK', 'Bratislava'),
  ('Vysoká škola Goethe Uni Bratislava', 'university', 'SK', null),
  ('Vysoká škola Jagiellonská', 'university', 'CZ', null),
  ('Vysoká škola Karla Engliše', 'university', 'CZ', null),
  ('Vysoká škola Karlovy Vary', 'university', 'CZ', null),
  ('Vysoká škola NEWTON', 'university', 'CZ', null),
  ('Vysoká škola Sting', 'university', 'CZ', null),
  ('Vysoká škola aplikované psychologie', 'university', 'CZ', null),
  ('Vysoká škola aplikovaného práva', 'university', 'CZ', null),
  ('Vysoká škola bezpečnostného manažérstva v Košiciach', 'university', 'SK', 'Košice'),
  ('Vysoká škola báňská – Technická univerzita Ostrava', 'university', 'CZ', null),
  ('Vysoká škola chemicko-technologická v Praze', 'university', 'CZ', 'Praha'),
  ('Vysoká škola ekonomická v Praze', 'university', 'CZ', 'Praha'),
  ('Vysoká škola ekonomie a managementu', 'university', 'CZ', null),
  ('Vysoká škola ekonómie a manažmentu verejnej správy v Bratislave', 'university', 'SK', 'Bratislave'),
  ('Vysoká škola evropských a regionálních studií', 'university', 'CZ', null),
  ('Vysoká škola finanční a správní', 'university', 'CZ', null),
  ('Vysoká škola logistiky', 'university', 'CZ', null),
  ('Vysoká škola manažmentu v Trenčíne', 'university', 'SK', 'Trenčíne'),
  ('Vysoká škola mezinárodních a veřejných vztahů Praha', 'university', 'CZ', null),
  ('Vysoká škola múzických umení v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Vysoká škola obchodní a hotelová', 'university', 'CZ', null),
  ('Vysoká škola polytechnická Jihlava', 'university', 'CZ', null),
  ('Vysoká škola technická a ekonomická v Prešove', 'university', 'SK', 'Prešove'),
  ('Vysoká škola technická a ekonomická v Českých Budějovicích', 'university', 'CZ', 'Českých Budějovicích'),
  ('Vysoká škola tělesné výchovy a sportu Palestra', 'university', 'CZ', null),
  ('Vysoká škola uměleckoprůmyslová v Praze', 'university', 'CZ', 'Praze'),
  ('Vysoká škola výtvarných umení v Bratislave', 'university', 'SK', 'Bratislava'),
  ('Vysoká škola zdravotníctva a sociálnej práce sv. Alžbety v Bratislave', 'university', 'SK', 'Bratislave'),
  ('Vysoké učení technické v Brně', 'university', 'CZ', 'Brno'),
  ('Západomoravská vysoká škola Třebíč', 'university', 'CZ', null),
  ('Západočeská univerzita v Plzni', 'university', 'CZ', 'Plzeň'),
  ('Česká asociace doktorandek a doktorandů', 'university', 'CZ', null),
  ('Česká konference rektorů', 'university', 'CZ', null),
  ('Česká zemědělská univerzita v Praze', 'university', 'CZ', 'Praha'),
  ('České vysoké učení technické v Praze', 'university', 'CZ', 'Praha'),
  ('Škoda Auto Vysoká škola', 'university', 'CZ', null),
  ('Žilinská univerzita v Žiline', 'university', 'SK', 'Žiline');

-- -----------------------------------------------------------------------------
-- Source: 20260623170000_chat_rooms_cv_database_outreach.sql
-- -----------------------------------------------------------------------------

-- CV database employer outreach: chat without a job application (application_id null).

alter table public.chat_rooms
  alter column application_id drop not null;

comment on column public.chat_rooms.application_id is
  'Job application thread when set; null for employer CV-database outreach (company_id + individual_id).';

create unique index if not exists idx_chat_rooms_cv_outreach_pair
  on public.chat_rooms (company_id, individual_id)
  where application_id is null;

-- -----------------------------------------------------------------------------
-- Source: 20260624120000_employer_cv_monthly_pdf_access.sql
-- -----------------------------------------------------------------------------

-- Dedupe CV database PDF/view quota per (company, cv, month).
-- Nest increments employer_cv_monthly_usage.pdf_downloads_count once per CV per period.

create table if not exists public.employer_cv_monthly_pdf_access (
  company_id uuid not null references public.profiles (id) on delete cascade,
  cv_id uuid not null references public.cvs (id) on delete cascade,
  period_month date not null,
  created_at timestamptz not null default now(),
  primary key (company_id, cv_id, period_month)
);

create index if not exists idx_employer_cv_monthly_pdf_access_period
  on public.employer_cv_monthly_pdf_access (period_month);

alter table public.employer_cv_monthly_pdf_access enable row level security;

drop policy if exists "deny all employer_cv_monthly_pdf_access" on public.employer_cv_monthly_pdf_access;
create policy "deny all employer_cv_monthly_pdf_access"
  on public.employer_cv_monthly_pdf_access for all using (false) with check (false);

revoke all on public.employer_cv_monthly_pdf_access from anon, authenticated;
grant select, insert, update, delete on public.employer_cv_monthly_pdf_access to service_role;

comment on table public.employer_cv_monthly_pdf_access is
  'Tracks CVs that consumed monthly PDF/view quota for an employer (service_role via Nest).';

-- -----------------------------------------------------------------------------
-- Source: 20260625120000_listing_top_promotions.sql
-- -----------------------------------------------------------------------------

-- Paid TOP listing via credits (not subscription plan). Allow 0-credit tier promos.

alter table public.job_promotions
  drop constraint if exists job_promotions_credits_spent_check;

alter table public.job_promotions
  add constraint job_promotions_credits_spent_check check (credits_spent >= 0);

create table if not exists public.company_ad_promotions (
  id uuid primary key default gen_random_uuid(),
  company_ad_id uuid not null references public.company_ads (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('top_category')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  credits_spent integer not null check (credits_spent >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_company_ad_promotions_ad_kind
  on public.company_ad_promotions (company_ad_id, kind, ends_at desc);

alter table public.company_ad_promotions enable row level security;

drop policy if exists "deny all company_ad_promotions" on public.company_ad_promotions;

create policy "deny all company_ad_promotions"
  on public.company_ad_promotions for all using (false) with check (false);

grant select, insert on public.company_ad_promotions to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260627120000_perf_applicant_counts_chat_unread.sql
-- -----------------------------------------------------------------------------

-- Performance: aggregated applicant status counts and chat unread counts (Nest service_role RPCs).

-- ---------------------------------------------------------------------------
-- employer_application_status_counts
-- ---------------------------------------------------------------------------
create or replace function public.employer_application_status_counts(p_job_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'pending', coalesce(sum(case when status = 'pending' then 1 else 0 end), 0)::int,
    'reviewing', coalesce(sum(case when status = 'reviewing' then 1 else 0 end), 0)::int,
    'interview_invited', coalesce(sum(case when status = 'interview_invited' then 1 else 0 end), 0)::int,
    'rejected', coalesce(sum(case when status = 'rejected' then 1 else 0 end), 0)::int,
    'accepted', coalesce(sum(case when status = 'accepted' then 1 else 0 end), 0)::int,
    'withdrawn', coalesce(sum(case when status = 'withdrawn' then 1 else 0 end), 0)::int,
    'total', coalesce(count(*)::int, 0)
  )
  from public.applications
  where job_id = p_job_id
    and is_deleted = false;
$$;

revoke all on function public.employer_application_status_counts(uuid) from public;
grant execute on function public.employer_application_status_counts(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- chat_unread_counts_for_viewer — one round-trip for room list enrichment
-- ---------------------------------------------------------------------------
create or replace function public.chat_unread_counts_for_viewer(
  p_user_id uuid,
  p_room_ids uuid[]
)
returns table(room_id uuid, unread_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id as room_id,
    count(m.id)::bigint as unread_count
  from public.chat_rooms r
  left join public.chat_messages m
    on m.room_id = r.id
    and m.sender_id <> p_user_id
    and m.created_at > coalesce(
      case
        when r.company_id = p_user_id then r.company_last_read_at
        else r.individual_last_read_at
      end,
      '1970-01-01T00:00:00+00'::timestamptz
    )
  where r.id = any(p_room_ids)
    and (r.company_id = p_user_id or r.individual_id = p_user_id)
  group by r.id;
$$;

revoke all on function public.chat_unread_counts_for_viewer(uuid, uuid[]) from public;
grant execute on function public.chat_unread_counts_for_viewer(uuid, uuid[]) to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260628120000_api_user_sessions_jti_index.sql
-- -----------------------------------------------------------------------------

-- Session lifecycle hardening: index for fast revoked_at lookup keyed by session id.
-- SessionAuthGuard now consults api_user_sessions.revoked_at on every request,
-- and refresh rotation is enforced atomically via conditional UPDATE … RETURNING.

create index if not exists idx_api_user_sessions_id_active
  on public.api_user_sessions (id)
  where revoked_at is null;

-- Track which Supabase access JWT is currently bound to this BFF session, so a
-- stolen jb_at presented with a different jb_sid (or after the cookie pair was
-- rotated) cannot be replayed until JWT exp.
alter table public.api_user_sessions
  add column if not exists access_token_jti text;

comment on column public.api_user_sessions.access_token_jti is
  'Most recent Supabase access JWT identifier (sub|iat) bound to this session. '
  'Used by SessionAuthGuard to invalidate jb_at after logout or refresh rotation.';

-- -----------------------------------------------------------------------------
-- Source: 20260628120000_employer_applicants_list_rpc.sql
-- -----------------------------------------------------------------------------

-- Employer applicants: paginated application rows in SQL (Nest enriches page only).

create or replace function public.employer_list_application_rows(
  p_job_id uuid,
  p_employer_id uuid,
  p_status text default 'all',
  p_sort text default 'applied_at_desc',
  p_offset int default 0,
  p_limit int default 50,
  p_q text default null,
  p_has_cv text default 'any'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_q text := nullif(trim(coalesce(p_q, '')), '');
  v_rows jsonb;
  v_total bigint;
begin
  if not exists (
    select 1
    from public.job_offers j
    where j.id = p_job_id
      and j.company_id = p_employer_id
      and j.is_deleted = false
  ) then
    return jsonb_build_object('rows', '[]'::jsonb, 'total', 0);
  end if;

  with filtered as (
    select
      a.id,
      a.individual_id,
      a.status,
      a.created_at,
      a.message
    from public.applications a
    where a.job_id = p_job_id
      and a.is_deleted = false
      and (
        coalesce(p_status, 'all') = 'all'
        or a.status = p_status
      )
      and (
        coalesce(p_has_cv, 'any') = 'any'
        or (
          p_has_cv = 'yes'
          and exists (
            select 1
            from public.cvs c
            where c.user_id = a.individual_id
              and c.is_default_for_profile = true
              and c.visible_to_employers = true
          )
        )
        or (
          p_has_cv = 'no'
          and not exists (
            select 1
            from public.cvs c
            where c.user_id = a.individual_id
              and c.is_default_for_profile = true
              and c.visible_to_employers = true
          )
        )
      )
      and (
        v_q is null
        or exists (
          select 1
          from public.profiles p
          where p.id = a.individual_id
            and (
              coalesce(p.display_name, '') ilike '%' || v_q || '%'
              or coalesce(p.first_name, '') ilike '%' || v_q || '%'
              or coalesce(p.last_name, '') ilike '%' || v_q || '%'
              or coalesce(p.location, '') ilike '%' || v_q || '%'
            )
        )
      )
  ),
  counted as (
    select count(*)::bigint as cnt from filtered
  ),
  ordered as (
    select *
    from filtered f
    order by
      case when p_sort = 'applied_at_asc' then f.created_at end asc nulls last,
      case when p_sort <> 'applied_at_asc' then f.created_at end desc nulls last,
      f.id desc
    offset v_offset
    limit v_limit
  )
  select
    coalesce((select jsonb_agg(to_jsonb(o)) from ordered o), '[]'::jsonb),
    (select cnt from counted)
  into v_rows, v_total;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

revoke all on function public.employer_list_application_rows(uuid, uuid, text, text, int, int, text, text) from public;
grant execute on function public.employer_list_application_rows(uuid, uuid, text, text, int, int, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- Source: 20260628121000_storage_upload_lockdown_finish.sql
-- -----------------------------------------------------------------------------

-- Finish the storage upload lockdown started in 20260622120000_storage_upload_lockdown.sql.
--
-- Hosted Supabase: `storage.objects` is owned by `supabase_storage_admin`. The
-- migration role cannot GRANT that role (reserved) or DROP existing policies
-- (42501 must be owner). Instead we add RESTRICTIVE deny policies: permissive
-- client write policies remain on paper but every authenticated INSERT/UPDATE/
-- DELETE on these buckets is blocked. Nest continues to use service_role
-- (bypasses RLS).
--
-- Optional cleanup (Dashboard → Storage → Policies, or superuser psql): drop
--   profile-avatars: owner insert | owner update | owner delete
--   chat-media insert room participants | chat-media delete own prefix
--
-- Public read on profile-avatars is unchanged. Chat-media SELECT for room
-- participants is unchanged.

-- ---------------------------------------------------------------------------
-- profile-avatars: block authenticated writes (API / service_role only)
-- ---------------------------------------------------------------------------
do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile-avatars: lockdown deny client insert'
  ) then
    execute $sql$
      create policy "profile-avatars: lockdown deny client insert"
      on storage.objects
      as restrictive
      for insert
      to authenticated
      with check (bucket_id = 'profile-avatars' and false)
    $sql$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile-avatars: lockdown deny client update'
  ) then
    execute $sql$
      create policy "profile-avatars: lockdown deny client update"
      on storage.objects
      as restrictive
      for update
      to authenticated
      using (bucket_id = 'profile-avatars' and false)
      with check (bucket_id = 'profile-avatars' and false)
    $sql$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile-avatars: lockdown deny client delete'
  ) then
    execute $sql$
      create policy "profile-avatars: lockdown deny client delete"
      on storage.objects
      as restrictive
      for delete
      to authenticated
      using (bucket_id = 'profile-avatars' and false)
    $sql$;
  end if;
end
$policy$;

-- ---------------------------------------------------------------------------
-- chat-media: block authenticated insert/delete; keep SELECT policies
-- ---------------------------------------------------------------------------
do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat-media: lockdown deny client insert'
  ) then
    execute $sql$
      create policy "chat-media: lockdown deny client insert"
      on storage.objects
      as restrictive
      for insert
      to authenticated
      with check (bucket_id = 'chat-media' and false)
    $sql$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat-media: lockdown deny client delete'
  ) then
    execute $sql$
      create policy "chat-media: lockdown deny client delete"
      on storage.objects
      as restrictive
      for delete
      to authenticated
      using (bucket_id = 'chat-media' and false)
    $sql$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat-media: lockdown deny client update'
  ) then
    execute $sql$
      create policy "chat-media: lockdown deny client update"
      on storage.objects
      as restrictive
      for update
      to authenticated
      using (bucket_id = 'chat-media' and false)
      with check (bucket_id = 'chat-media' and false)
    $sql$;
  end if;
end
$policy$;

-- -----------------------------------------------------------------------------
-- Source: 20260628122000_gdpr_address_and_cv_column_revokes.sql
-- -----------------------------------------------------------------------------

-- Address and sensitive CV column revokes (GDPR follow-up to
-- 20260622120000_gdpr_privacy_enforcement.sql).
--
-- The 2026-06-22 GDPR migration introduced the public views
-- `job_offers_public` and `company_ads_public` that null the exact address
-- when `show_exact_address` is false, but it did NOT revoke SELECT on the
-- underlying address columns from `authenticated`. Any authenticated user
-- could still bypass the public view via direct PostgREST or the
-- `search_jobs_hybrid` RPC and read exact addresses.
--
-- Similarly, `cv_job_preferences.has_disability` and `cv_references.email`
-- / `cv_references.phone` remained readable by employer-role users via
-- PostgREST without a `cv_contact_unlocks` row.
--
-- This migration forces every read of these sensitive columns to go through
-- Nest (which uses `service_role` and applies the unlock / address-visibility
-- rules).

-- ---------------------------------------------------------------------------
-- Exact addresses: revoke base-table SELECT; clients must use *_public views
-- ---------------------------------------------------------------------------
revoke select (location_address)
  on public.job_offers from anon, authenticated;

revoke select (street_address)
  on public.company_ads from anon, authenticated;

comment on column public.job_offers.location_address is
  'Exact street address. Redacted by job_offers_public view when '
  'show_exact_address = false. Not readable by anon/authenticated directly.';

comment on column public.company_ads.street_address is
  'Exact street address. Redacted by company_ads_public view when '
  'show_exact_address = false. Not readable by anon/authenticated directly.';

-- ---------------------------------------------------------------------------
-- search_jobs_hybrid: restrict execute to service_role only.
--
-- PWA never calls this RPC directly (search goes through Nest at
-- `/api/search/jobs`, which holds the service-role key). Keeping anon/auth
-- execute means an attacker could call the RPC from the browser to bypass
-- address redaction (since the function returns setof job_offers including
-- location_address as a raw column).
-- ---------------------------------------------------------------------------
revoke execute on function public.search_jobs_hybrid(
  text,
  text,
  text,
  text,
  boolean,
  int,
  int,
  numeric,
  numeric,
  timestamptz,
  text,
  boolean
) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- cv_job_preferences.has_disability: sensitive special-category data (GDPR
-- art. 9). Only employer unlocks should expose it; revoke from anon/auth.
-- ---------------------------------------------------------------------------
revoke select (has_disability)
  on public.cv_job_preferences from anon, authenticated;

comment on column public.cv_job_preferences.has_disability is
  'GDPR special-category data. Read via Nest only (service_role) and only '
  'when the employer has a cv_contact_unlocks row for the CV. Direct '
  'PostgREST SELECT denied for anon/authenticated.';

-- ---------------------------------------------------------------------------
-- cv_references.email / phone: third-party PII; must be gated by unlock.
-- ---------------------------------------------------------------------------
revoke select (email, phone)
  on public.cv_references from anon, authenticated;

comment on column public.cv_references.email is
  'Reference contact email (third-party PII). Read via Nest only after '
  'cv_contact_unlocks. Direct PostgREST SELECT denied for anon/authenticated.';

comment on column public.cv_references.phone is
  'Reference contact phone (third-party PII). Read via Nest only after '
  'cv_contact_unlocks. Direct PostgREST SELECT denied for anon/authenticated.';

-- -----------------------------------------------------------------------------
-- Source: 20260628130000_cv_photos_private_bucket.sql
-- -----------------------------------------------------------------------------

-- Private bucket for CV photos.
--
-- CV photos used to live alongside profile avatars in the public
-- `profile-avatars` bucket, which means anyone with the URL could fetch them
-- regardless of CV visibility / contact-unlock state. CV photos are
-- candidate-identifying biometric-ish data that should be gated by the same
-- rules as the rest of the CV header.
--
-- New uploads land here; the Nest `GET /api/cv/:cvId/photo-url` endpoint
-- issues a short-lived signed URL after checking visibility / unlock.
--
-- Existing photos in `profile-avatars` remain readable until a backfill job
-- moves them (tracked in docs/uploads.md follow-up).
--
-- Hosted Supabase: do not COMMENT ON storage.buckets/objects or DROP POLICY
-- (owned by supabase_storage_admin). Bucket row upsert + RESTRICTIVE denies
-- below are migration-safe.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-photos',
  'cv-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Default-deny with no permissive policies; add RESTRICTIVE denies so client
-- roles cannot read/write even if a permissive policy is added later.
do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'cv-photos: lockdown deny client access'
  ) then
    execute $sql$
      create policy "cv-photos: lockdown deny client access"
      on storage.objects
      as restrictive
      for all
      to public
      using (bucket_id = 'cv-photos' and false)
      with check (bucket_id = 'cv-photos' and false)
    $sql$;
  end if;
end
$policy$;

-- -----------------------------------------------------------------------------
-- Source: 20260628130000_storage_async_finalize.sql
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Source: 20260628140000_chat_messages_keyset_index.sql
-- -----------------------------------------------------------------------------

-- Chat messages keyset pagination support.

create index if not exists idx_chat_messages_room_created_id
  on public.chat_messages (room_id, created_at desc, id desc);

-- -----------------------------------------------------------------------------
-- Source: 20260628140000_security_definer_search_path.sql
-- -----------------------------------------------------------------------------

-- Pin search_path on SECURITY DEFINER functions that were missing it.
--
-- A SECURITY DEFINER function with a mutable search_path resolves unqualified
-- identifiers against the caller's `search_path`, which on shared-role
-- Postgres setups can be subverted by an attacker who can install a function
-- or operator into an earlier schema. Pinning `search_path = public, pg_catalog`
-- closes that primitive.
--
-- Functions covered:
--   - public.handle_new_user (multiple variants from initial schema, full
--     metadata expansion, and subscription monthly-credits hook)
--   - public.increment_job_applications_count
--
-- We also fully qualify the obvious table references inside the bodies where
-- possible, but the primary defense is the pinned search_path.

do $$
declare
  fn record;
begin
  for fn in
    select n.nspname || '.' || p.proname || '(' ||
           pg_get_function_identity_arguments(p.oid) || ')' as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'handle_new_user',
        'increment_job_applications_count'
      )
      and p.prosecdef = true
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg
        where cfg ilike 'search_path=%'
      )
  loop
    execute format(
      'alter function %s set search_path = public, pg_catalog',
      fn.sig
    );
    raise notice 'pinned search_path on %', fn.sig;
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- Source: 20260628150000_force_row_level_security.sql
-- -----------------------------------------------------------------------------

-- Defense-in-depth: enable FORCE ROW LEVEL SECURITY on the most sensitive
-- application tables. Without FORCE, the table owner role (e.g. `postgres` in
-- direct DB sessions, pgAdmin, ad-hoc SQL via the Supabase dashboard) bypasses
-- RLS. With FORCE, even the owner is subject to policies — meaning a
-- compromised admin tool or a runaway `psql` session cannot mass-exfil data
-- without going through service_role-aware code paths.
--
-- service_role policies on each of these tables grant full access (or the
-- relevant subset), so the Nest backend continues to operate normally.

do $$
declare
  t text;
begin
  foreach t in array array[
    'applications',
    'application_status_history',
    'application_auto_messages',
    'application_notes',
    'cvs',
    'cv_personal_info',
    'cv_job_preferences',
    'cv_experience',
    'cv_education',
    'cv_languages',
    'cv_certifications',
    'cv_references',
    'cv_skills',
    'cv_pc_skills',
    'cv_contact_unlocks',
    'chat_rooms',
    'chat_messages',
    'credit_ledger',
    'credit_lots',
    'stripe_credit_fulfillments',
    'stripe_webhook_events',
    'audit_events',
    'auth_security_events',
    'api_user_sessions',
    'login_attempt_counters',
    'subscription_period_credit_grants',
    'consent_events',
    'content_reports',
    'profile_views',
    'profile_reviews'
  ]
  loop
    if exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t and c.relkind = 'r'
    ) then
      execute format('alter table public.%I force row level security', t);
      raise notice 'forced RLS on public.%', t;
    end if;
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- Source: 20260628151000_revoke_overbroad_grants_phase2.sql
-- -----------------------------------------------------------------------------

-- Phase 2 of the 2026-06 grants cleanup (follow-up to
-- 20260621151000_revoke_overbroad_grants.sql).
--
-- Several user-data tables still carry SELECT/INSERT/UPDATE/DELETE grants for
-- `anon` (from the initial 20250302000000 grants migration). RLS blocks reads
-- in practice, but the grant noise makes audits harder and would let a future
-- mistake (missing policy, dropped RLS) leak data instantly.
--
-- Strategy: revoke `anon` from every non-public-catalog table where Nest is
-- the only intended writer. Service-role keeps full access. `authenticated`
-- grants are kept where users genuinely need PostgREST access (own profile,
-- own CV editing, etc.) and the RLS policy enforces ownership.

do $$
declare
  t text;
begin
  -- Tables where anon should have NO grants at all. These are user-data
  -- tables exclusively accessed by Nest (`service_role`) and, where
  -- appropriate, by the owning user via authenticated PostgREST policies.
  foreach t in array array[
    'applications',
    'application_status_history',
    'application_auto_messages',
    'application_notes',
    'cvs',
    'cv_personal_info',
    'cv_job_preferences',
    'cv_experience',
    'cv_education',
    'cv_languages',
    'cv_certifications',
    'cv_references',
    'cv_skills',
    'cv_pc_skills',
    'cv_contact_unlocks',
    'chat_rooms',
    'chat_messages',
    'job_email_alerts',
    'job_email_alert_sent_jobs',
    'saved_jobs',
    'saved_companies',
    'saved_searches',
    'user_notifications',
    'user_device_sessions',
    'subscription_period_credit_grants'
  ]
  loop
    if exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t and c.relkind = 'r'
    ) then
      execute format('revoke all on public.%I from anon', t);
      raise notice 'revoked anon grants on public.%', t;
    end if;
  end loop;
end
$$;

-- Tables that should be service_role only (authenticated also has no
-- direct PostgREST need — Nest is the only writer). Revoke from
-- authenticated as well. RLS already denies these, but the grants make
-- reviewers wonder whether anything else relies on them.
do $$
declare
  t text;
begin
  foreach t in array array[
    'cv_contact_unlocks',
    'subscription_period_credit_grants',
    'application_notes',
    'application_auto_messages',
    'application_status_history'
  ]
  loop
    if exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t and c.relkind = 'r'
    ) then
      execute format('revoke all on public.%I from authenticated', t);
      raise notice 'revoked authenticated grants on public.%', t;
    end if;
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- Source: 20260629120000_cv_pdfs_storage.sql
-- -----------------------------------------------------------------------------

-- Private bucket for pre-rendered CV PDF exports (Playwright output).
-- Reads via Nest service role only; same visibility rules as CV aggregate.
--
-- Apply during low traffic (pause API or run off-peak). Do not run this file in
-- parallel with other migrations or a second SQL editor tab — DDL on cvs +
-- storage.objects can deadlock with live CV/storage traffic.
--
-- Lock order: public.cvs first, then storage (avoids circular waits with app).

alter table public.cvs
  add column if not exists pdf_storage_path text,
  add column if not exists pdf_content_hash text,
  add column if not exists pdf_generated_at timestamptz,
  add column if not exists pdf_generation_status text not null default 'pending';

comment on column public.cvs.pdf_storage_path is
  'Object path in cv-pdfs bucket, e.g. {user_id}/{cv_id}/latest.pdf';
comment on column public.cvs.pdf_content_hash is
  'SHA-256 of canonical CV export payload; used to skip redundant renders.';
comment on column public.cvs.pdf_generation_status is
  'pending | ready | failed — pre-rendered employer/candidate PDF export.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-pdfs',
  'cv-pdfs',
  false,
  15728640,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'cv-pdfs: lockdown deny client access'
  ) then
    execute $sql$
      create policy "cv-pdfs: lockdown deny client access"
      on storage.objects
      as restrictive
      for all
      to public
      using (bucket_id = 'cv-pdfs' and false)
      with check (bucket_id = 'cv-pdfs' and false)
    $sql$;
  end if;
end
$policy$;

-- -----------------------------------------------------------------------------
-- Source: 20260629120000_search_profiles_hybrid_revoke.sql
-- -----------------------------------------------------------------------------

-- Mirror search_jobs_hybrid lockdown: profile hybrid search must run via Nest
-- (service_role) so public fields are redacted consistently.

revoke execute on function public.search_profiles_hybrid(text, text, int, int)
  from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Source: 20260630120000_subscription_trial.sql
-- -----------------------------------------------------------------------------

-- Subscription free trial: Stripe `trialing` status + one-time trial consumption marker.

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_status_check;

alter table public.user_subscriptions
  add constraint user_subscriptions_status_check
  check (status in ('active', 'canceled', 'past_due', 'unpaid', 'trialing'));

alter table public.profiles
  add column if not exists subscription_trial_used_at timestamptz null;

comment on column public.profiles.subscription_trial_used_at is
  'Set when user started a Stripe subscription with a promotional trial (first-time only).';

-- -----------------------------------------------------------------------------
-- Source: 20260703120000_content_reports_company_ad.sql
-- -----------------------------------------------------------------------------

-- Allow user reports targeting a specific company/service ad (profesionali listing).

alter table public.content_reports
  drop constraint if exists content_reports_target_type_check;

alter table public.content_reports
  add constraint content_reports_target_type_check
  check (target_type in (
    'job_offer',
    'company_profile',
    'company_ad',
    'banner_ad',
    'company_review',
    'chat_message'
  ));

-- -----------------------------------------------------------------------------
-- Source: 20260704120000_supabase_linter_security_fixes.sql
-- -----------------------------------------------------------------------------

-- Supabase database linter follow-up (search_path, SECURITY DEFINER EXECUTE, extensions schema,
-- public bucket listing). Nest uses service_role; PWA uses Nest API for business RPCs.

-- ---------------------------------------------------------------------------
-- Extensions: move out of public (lint 0014)
-- ---------------------------------------------------------------------------
create schema if not exists extensions;

grant usage on schema extensions to postgres, anon, authenticated, service_role;

alter extension pg_trgm set schema extensions;
alter extension unaccent set schema extensions;

create or replace function public.jobbie_unaccent(text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions, pg_catalog
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

-- ---------------------------------------------------------------------------
-- Pin search_path on all public functions missing it (lint 0011)
-- ---------------------------------------------------------------------------
do $$
declare
  fn record;
begin
  for fn in
    select n.nspname || '.' || p.proname || '(' ||
           pg_get_function_identity_arguments(p.oid) || ')' as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg
        where cfg ilike 'search_path=%'
      )
  loop
    execute format(
      'alter function %s set search_path = public, extensions, pg_catalog',
      fn.sig
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER RPCs: deny anon/authenticated/PUBLIC execute (lint 0028/0029)
-- Re-grant authenticated only where storage RLS helpers need it.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select
      n.nspname as schema_name,
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
  loop
    execute format(
      'revoke all on function %I.%I(%s) from public, anon, authenticated',
      r.schema_name,
      r.proname,
      r.args
    );
  end loop;
end
$$;

do $$
declare
  r record;
begin
  for r in
    select
      n.nspname as schema_name,
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
  loop
    execute format(
      'grant execute on function %I.%I(%s) to service_role',
      r.schema_name,
      r.proname,
      r.args
    );
  end loop;
end
$$;

-- Chat-media / unlock helpers move to private schema: 20260704130000_supabase_linter_followup.sql

-- ---------------------------------------------------------------------------
-- Public buckets: drop broad SELECT (lint 0025). Known-path public URLs still work
-- when bucket.public = true; clients must not list entire buckets via PostgREST.
-- ---------------------------------------------------------------------------
drop policy if exists "profile-avatars: public read" on storage.objects;
drop policy if exists "job-photos: public read" on storage.objects;
drop policy if exists "blog-content: public read" on storage.objects;
drop policy if exists "blog-covers: public read" on storage.objects;

-- -----------------------------------------------------------------------------
-- Source: 20260704130000_supabase_linter_followup.sql
-- -----------------------------------------------------------------------------

-- Follow-up: move SECURITY DEFINER helpers out of PostgREST-exposed `public` schema,
-- and add explicit deny-all RLS policies (lint 0029 + 0008).

-- ---------------------------------------------------------------------------
-- private schema: storage RLS helpers (not exposed via /rest/v1/rpc)
-- ---------------------------------------------------------------------------
create schema if not exists private;

grant usage on schema private to postgres, authenticated, service_role;

create or replace function private.chat_media_user_can_upload_object(object_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  segs text[];
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;
  segs := storage.foldername(object_path);
  if coalesce(cardinality(segs), 0) < 3 then
    return false;
  end if;
  if segs[2] is distinct from uid::text then
    return false;
  end if;
  return exists (
    select 1
    from public.chat_rooms r
    where r.id::text = segs[1]
      and (r.company_id = uid or r.individual_id = uid)
  );
end;
$$;

create or replace function private.chat_media_user_can_read_object(object_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  segs text[];
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;
  segs := storage.foldername(object_path);
  if coalesce(cardinality(segs), 0) < 2 then
    return false;
  end if;
  return exists (
    select 1
    from public.chat_rooms r
    where r.id::text = segs[1]
      and (r.company_id = uid or r.individual_id = uid)
  );
end;
$$;

create or replace function private.chat_media_user_can_delete_object(object_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  segs text[];
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;
  segs := storage.foldername(object_path);
  if coalesce(cardinality(segs), 0) < 3 then
    return false;
  end if;
  if segs[2] is distinct from uid::text then
    return false;
  end if;
  return exists (
    select 1
    from public.chat_rooms r
    where r.id::text = segs[1]
      and (r.company_id = uid or r.individual_id = uid)
  );
end;
$$;

revoke all on function private.chat_media_user_can_upload_object(text) from public, anon;
revoke all on function private.chat_media_user_can_read_object(text) from public, anon;
revoke all on function private.chat_media_user_can_delete_object(text) from public, anon;

grant execute on function private.chat_media_user_can_upload_object(text)
  to authenticated, service_role;
grant execute on function private.chat_media_user_can_read_object(text)
  to authenticated, service_role;
grant execute on function private.chat_media_user_can_delete_object(text)
  to authenticated, service_role;

-- Drop policies before dropping the public helpers they reference.
drop policy if exists "chat-media insert room participants" on storage.objects;
drop policy if exists "chat-media select room participants" on storage.objects;
drop policy if exists "chat-media delete own prefix" on storage.objects;

drop function if exists public.chat_media_user_can_upload_object(text, uuid);
drop function if exists public.chat_media_user_can_read_object(text, uuid);
drop function if exists public.chat_media_user_can_delete_object(text, uuid);

create policy "chat-media insert room participants"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'chat-media'
    and private.chat_media_user_can_upload_object(name)
  );

create policy "chat-media select room participants"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'chat-media'
    and private.chat_media_user_can_read_object(name)
  );

create policy "chat-media delete own prefix"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'chat-media'
    and private.chat_media_user_can_delete_object(name)
  );

-- Nest-only unlock probe (not used from PWA PostgREST)
create or replace function private.employer_has_cv_contact_unlock(
  p_company_id uuid,
  p_cv_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.cv_contact_unlocks u
    where u.company_id = p_company_id
      and u.cv_id = p_cv_id
  );
$$;

revoke all on function private.employer_has_cv_contact_unlock(uuid, uuid) from public, anon, authenticated;
grant execute on function private.employer_has_cv_contact_unlock(uuid, uuid) to service_role;

drop function if exists public.employer_has_cv_contact_unlock(uuid, uuid);

-- ---------------------------------------------------------------------------
-- Explicit deny-all RLS (lint 0008): service_role-only tables
-- ---------------------------------------------------------------------------
drop policy if exists "deny all blog_posts" on public.blog_posts;
create policy "deny all blog_posts"
  on public.blog_posts for all using (false) with check (false);

drop policy if exists "deny all profile_reviews" on public.profile_reviews;
create policy "deny all profile_reviews"
  on public.profile_reviews for all using (false) with check (false);

drop policy if exists "deny all profile_views" on public.profile_views;
create policy "deny all profile_views"
  on public.profile_views for all using (false) with check (false);

drop policy if exists "deny all subscribers" on public.subscribers;
create policy "deny all subscribers"
  on public.subscribers for all using (false) with check (false);

drop policy if exists "deny all subscription_period_credit_grants"
  on public.subscription_period_credit_grants;
create policy "deny all subscription_period_credit_grants"
  on public.subscription_period_credit_grants for all using (false) with check (false);
