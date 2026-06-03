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
