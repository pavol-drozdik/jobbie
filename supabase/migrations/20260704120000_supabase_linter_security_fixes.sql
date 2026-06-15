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
