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
