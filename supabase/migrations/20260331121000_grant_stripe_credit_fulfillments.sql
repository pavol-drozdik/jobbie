-- Grant access so NestJS backend (service_role) can insert fulfillment rows.
-- Without these grants Postgres returns: "permission denied for table stripe_credit_fulfillments".
grant select, insert, update, delete on public.stripe_credit_fulfillments to anon, authenticated, service_role;

-- Keep RLS enabled, but allow authenticated users to see/insert only their own rows.
-- service_role bypasses RLS anyway.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stripe_credit_fulfillments'
      and policyname = 'authenticated_own_credit_fulfillments'
  ) then
    create policy authenticated_own_credit_fulfillments
      on public.stripe_credit_fulfillments
      for all
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stripe_credit_fulfillments'
      and policyname = 'service_role_full_credit_fulfillments'
  ) then
    create policy service_role_full_credit_fulfillments
      on public.stripe_credit_fulfillments
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;
