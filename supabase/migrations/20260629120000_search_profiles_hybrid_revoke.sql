-- Mirror search_jobs_hybrid lockdown: profile hybrid search must run via Nest
-- (service_role) so public fields are redacted consistently.

revoke execute on function public.search_profiles_hybrid(text, text, int, int)
  from anon, authenticated;
