-- Tables created after 20250302000000_grant_api_roles_public_tables.sql did not receive GRANTs.
-- Without them, Postgres returns "permission denied for table" even for service_role-based server clients.
-- RLS on profile_reviews / profile_views: no policies for anon/authenticated → they still cannot access rows;
-- service_role bypasses RLS in Supabase and can read/write as granted below.

grant select, insert, update, delete on public.profile_reviews to anon, authenticated, service_role;
grant select, insert, update, delete on public.profile_views to anon, authenticated, service_role;
