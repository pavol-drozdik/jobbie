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
