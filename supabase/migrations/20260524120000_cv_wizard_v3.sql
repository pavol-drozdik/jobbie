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
