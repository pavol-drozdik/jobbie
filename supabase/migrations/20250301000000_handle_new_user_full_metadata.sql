-- Extend handle_new_user to set full profile from raw_user_meta_data
-- (deferred signUp: app sends role, names/company, looking_for_work, offering_work, preferences in one signUp).
create or replace function public.handle_new_user()
returns trigger as $$
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
  v_looking_for_work boolean;
  v_offering_work boolean;
  v_job_interests text;
  v_location text;
  v_sector text;
begin
  set local row_security = off;
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role := coalesce(meta->>'role', 'individual');
  if user_role not in ('company', 'individual') then
    user_role := 'individual';
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
  v_looking_for_work := coalesce((meta->>'looking_for_work') = 'true', true);
  v_offering_work := coalesce((meta->>'offering_work') = 'true', true);
  v_job_interests := nullif(trim(meta->>'job_interests'), '');
  v_location := nullif(trim(meta->>'location'), '');
  v_sector := nullif(trim(meta->>'sector'), '');

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
    looking_for_work,
    offering_work,
    job_interests,
    location,
    sector
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
    v_looking_for_work,
    v_offering_work,
    v_job_interests,
    v_location,
    v_sector
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
    looking_for_work = excluded.looking_for_work,
    offering_work = excluded.offering_work,
    job_interests = coalesce(excluded.job_interests, profiles.job_interests),
    location = coalesce(excluded.location, profiles.location),
    sector = coalesce(excluded.sector, profiles.sector),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;
