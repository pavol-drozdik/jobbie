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
