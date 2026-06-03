-- Defense-in-depth: enable FORCE ROW LEVEL SECURITY on the most sensitive
-- application tables. Without FORCE, the table owner role (e.g. `postgres` in
-- direct DB sessions, pgAdmin, ad-hoc SQL via the Supabase dashboard) bypasses
-- RLS. With FORCE, even the owner is subject to policies — meaning a
-- compromised admin tool or a runaway `psql` session cannot mass-exfil data
-- without going through service_role-aware code paths.
--
-- service_role policies on each of these tables grant full access (or the
-- relevant subset), so the Nest backend continues to operate normally.

do $$
declare
  t text;
begin
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
    'credit_ledger',
    'credit_lots',
    'stripe_credit_fulfillments',
    'stripe_webhook_events',
    'audit_events',
    'auth_security_events',
    'api_user_sessions',
    'login_attempt_counters',
    'subscription_period_credit_grants',
    'consent_events',
    'content_reports',
    'profile_views',
    'profile_reviews'
  ]
  loop
    if exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t and c.relkind = 'r'
    ) then
      execute format('alter table public.%I force row level security', t);
      raise notice 'forced RLS on public.%', t;
    end if;
  end loop;
end
$$;
