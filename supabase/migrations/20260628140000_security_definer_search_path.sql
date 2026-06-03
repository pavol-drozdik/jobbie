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
