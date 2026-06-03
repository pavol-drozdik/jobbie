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
