-- company_ads was added in 20260127000000_company_ads.sql after 20250302000000_grant_api_roles_public_tables.sql.
-- Without GRANT, Postgres returns "permission denied for table company_ads" (42501) for the Nest client.

grant select, insert, update, delete on public.company_ads to anon, authenticated, service_role;
