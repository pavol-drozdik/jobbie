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
