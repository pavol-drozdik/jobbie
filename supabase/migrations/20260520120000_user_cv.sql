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
