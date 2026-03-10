-- Grant table-level permissions so the Data API (anon, authenticated, service_role) can access tables.
-- RLS still applies for anon/authenticated; service_role bypasses RLS. Without these grants you get "permission denied for table".

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on public.profiles to anon, authenticated, service_role;
grant select, insert, update, delete on public.job_offers to anon, authenticated, service_role;
grant select, insert, update, delete on public.applications to anon, authenticated, service_role;
grant select, insert, update, delete on public.chat_rooms to anon, authenticated, service_role;
grant select, insert, update, delete on public.chat_messages to anon, authenticated, service_role;
grant select, insert, update, delete on public.subscription_plans to anon, authenticated, service_role;
grant select, insert, update, delete on public.user_subscriptions to anon, authenticated, service_role;
grant select, insert, update, delete on public.job_views to anon, authenticated, service_role;
grant select, insert, update, delete on public.job_impressions to anon, authenticated, service_role;
grant select, insert, update, delete on public.saved_jobs to anon, authenticated, service_role;

-- Allow service_role to use sequences (for insert default uuid_generate_v4() etc.)
grant usage on all sequences in schema public to anon, authenticated, service_role;
