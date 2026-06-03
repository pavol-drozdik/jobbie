-- Nest (service_role) must INSERT search_query_logs; RLS denies clients but grants were missing.

grant select, insert on public.search_query_logs to service_role;
