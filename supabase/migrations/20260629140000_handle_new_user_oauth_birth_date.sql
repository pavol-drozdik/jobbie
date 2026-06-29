-- OAuth signups cannot pass custom metadata before auth.users INSERT (Supabase limitation).
-- Validate birth_date only when present in metadata (email/password signup path).
-- OAuth registration applies birth_date via updateUser on /auth/callback.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  user_role text;
  meta jsonb;
  v_display_name text;
  v_company_name text;
  v_first_name text;
  v_last_name text;
  v_registered_office text;
  v_registration_number text;
  v_tax_id text;
  v_vat_id text;
  v_job_interests text;
  v_location text;
  v_sector text;
  v_birth_date_raw text;
  v_birth_date date;
  v_customer_role boolean;
  v_worker_role boolean;
  v_provider_role boolean;
begin
  set local row_security = off;
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role := coalesce(meta->>'role', 'individual');
  if user_role not in ('company', 'individual') then
    user_role := 'individual';
  end if;

  if user_role = 'individual' then
    v_birth_date_raw := nullif(trim(meta->>'birth_date'), '');
    if v_birth_date_raw is not null then
      if v_birth_date_raw !~ '^\d{4}-\d{2}-\d{2}$' then
        raise exception 'individual_registration_invalid_birth_date'
          using errcode = 'P0001';
      end if;
      begin
        v_birth_date := v_birth_date_raw::date;
      exception
        when others then
          raise exception 'individual_registration_invalid_birth_date'
            using errcode = 'P0001';
      end;
      if v_birth_date > (current_date - interval '16 years') then
        raise exception 'individual_registration_minimum_age'
          using errcode = 'P0001';
      end if;
    end if;
  end if;

  v_display_name := coalesce(
    meta->>'display_name',
    meta->>'name',
    trim(coalesce(meta->>'first_name', '') || ' ' || coalesce(meta->>'last_name', ''))
  );
  v_company_name := nullif(trim(meta->>'company_name'), '');
  v_first_name := nullif(trim(meta->>'first_name'), '');
  v_last_name := nullif(trim(meta->>'last_name'), '');
  v_registered_office := nullif(trim(meta->>'registered_office'), '');
  v_registration_number := nullif(trim(meta->>'ico'), '');
  v_tax_id := nullif(trim(meta->>'dic'), '');
  v_vat_id := nullif(trim(meta->>'ic_dph'), '');
  v_job_interests := nullif(trim(meta->>'job_interests'), '');
  v_location := nullif(trim(meta->>'location'), '');
  v_sector := nullif(trim(meta->>'sector'), '');
  v_customer_role := coalesce((meta->>'customer_role') = 'true', false);
  v_worker_role := coalesce((meta->>'worker_role') = 'true', false);
  v_provider_role := coalesce((meta->>'provider_role') = 'true', false);

  insert into public.profiles (
    id,
    role,
    display_name,
    company_name,
    first_name,
    last_name,
    registered_office,
    registration_number,
    tax_id,
    vat_id,
    job_interests,
    location,
    sector,
    customer_role,
    worker_role,
    provider_role
  )
  values (
    new.id,
    user_role,
    nullif(trim(v_display_name), ''),
    v_company_name,
    v_first_name,
    v_last_name,
    v_registered_office,
    v_registration_number,
    v_tax_id,
    v_vat_id,
    v_job_interests,
    v_location,
    v_sector,
    v_customer_role,
    v_worker_role,
    v_provider_role
  )
  on conflict (id) do update set
    role = excluded.role,
    display_name = coalesce(excluded.display_name, profiles.display_name),
    company_name = coalesce(excluded.company_name, profiles.company_name),
    first_name = coalesce(excluded.first_name, profiles.first_name),
    last_name = coalesce(excluded.last_name, profiles.last_name),
    registered_office = coalesce(excluded.registered_office, profiles.registered_office),
    registration_number = coalesce(excluded.registration_number, profiles.registration_number),
    tax_id = coalesce(excluded.tax_id, profiles.tax_id),
    vat_id = coalesce(excluded.vat_id, profiles.vat_id),
    job_interests = coalesce(excluded.job_interests, profiles.job_interests),
    location = coalesce(excluded.location, profiles.location),
    sector = coalesce(excluded.sector, profiles.sector),
    customer_role = excluded.customer_role,
    worker_role = excluded.worker_role,
    provider_role = excluded.provider_role,
    updated_at = now();

  insert into public.user_subscriptions (user_id, plan_id, status)
  select new.id, p.id, 'active'
  from public.subscription_plans p
  where p.slug = 'zadarmo'
  limit 1
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Unlink OAuth/social identities on account closure so the provider can bind to a new auth.users row.
-- Hard deleteUser is avoided: profiles.id references auth.users ON DELETE CASCADE.
create or replace function public.unlink_auth_identities_for_closed_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = auth, public, pg_catalog
as $$
begin
  if p_user_id is null then
    return;
  end if;
  delete from auth.identities where user_id = p_user_id;
end;
$$;

revoke all on function public.unlink_auth_identities_for_closed_account(uuid) from public;
revoke all on function public.unlink_auth_identities_for_closed_account(uuid) from anon;
revoke all on function public.unlink_auth_identities_for_closed_account(uuid) from authenticated;
grant execute on function public.unlink_auth_identities_for_closed_account(uuid) to service_role;
