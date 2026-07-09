-- Registration promo codes: limited signup credit grants (Nest + claim RPC + grant_credits).

create table if not exists public.registration_promo_campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  credits_amount integer not null check (credits_amount > 0 and credits_amount <= 500),
  max_redemptions integer not null check (max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  enabled boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registration_promo_campaigns_count_lte_max
    check (redemption_count <= max_redemptions)
);

create unique index if not exists idx_registration_promo_campaigns_code_upper
  on public.registration_promo_campaigns (upper(trim(code)));

create table if not exists public.registration_promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.registration_promo_campaigns (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  credits_granted integer not null check (credits_granted > 0),
  created_at timestamptz not null default now(),
  constraint registration_promo_redemptions_user_unique unique (user_id)
);

create index if not exists idx_registration_promo_redemptions_campaign
  on public.registration_promo_redemptions (campaign_id, created_at desc);

drop trigger if exists registration_promo_campaigns_updated_at on public.registration_promo_campaigns;
create trigger registration_promo_campaigns_updated_at
  before update on public.registration_promo_campaigns
  for each row execute function public.set_updated_at();

alter table public.registration_promo_campaigns enable row level security;
alter table public.registration_promo_redemptions enable row level security;

drop policy if exists "deny all registration_promo_campaigns" on public.registration_promo_campaigns;
create policy "deny all registration_promo_campaigns"
  on public.registration_promo_campaigns for all using (false) with check (false);

drop policy if exists "deny all registration_promo_redemptions" on public.registration_promo_redemptions;
create policy "deny all registration_promo_redemptions"
  on public.registration_promo_redemptions for all using (false) with check (false);

revoke all on public.registration_promo_campaigns from anon, authenticated;
revoke all on public.registration_promo_redemptions from anon, authenticated;
grant select, insert, update, delete on public.registration_promo_campaigns to service_role;
grant select, insert, update, delete on public.registration_promo_redemptions to service_role;

insert into public.registration_promo_campaigns (
  code,
  credits_amount,
  max_redemptions,
  enabled
)
select 'LAUNCH20', 20, 50, false
where not exists (
  select 1
  from public.registration_promo_campaigns c
  where upper(trim(c.code)) = 'LAUNCH20'
);

-- Atomic claim: locks campaign, enforces cap + new-account window, inserts redemption row.
create or replace function public.claim_registration_promo_redemption(
  p_user_id uuid,
  p_code text,
  p_new_account_hours integer default 48
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_campaign public.registration_promo_campaigns%rowtype;
  v_profile_created_at timestamptz;
  v_redemption_id uuid;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_user');
  end if;

  if p_code is null or length(trim(p_code)) < 1 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  if p_new_account_hours is null or p_new_account_hours < 1 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_window');
  end if;

  select created_at into v_profile_created_at
  from public.profiles
  where id = p_user_id;

  if v_profile_created_at is null then
    return jsonb_build_object('ok', false, 'reason', 'profile_not_found');
  end if;

  if v_profile_created_at < now() - make_interval(hours => p_new_account_hours) then
    return jsonb_build_object('ok', false, 'reason', 'account_too_old');
  end if;

  if exists (
    select 1 from public.registration_promo_redemptions r where r.user_id = p_user_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_redeemed');
  end if;

  select * into v_campaign
  from public.registration_promo_campaigns c
  where upper(trim(c.code)) = upper(trim(p_code))
  for update;

  if v_campaign.id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  if not v_campaign.enabled then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;

  if v_campaign.starts_at is not null and v_campaign.starts_at > now() then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;

  if v_campaign.ends_at is not null and v_campaign.ends_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;

  if v_campaign.redemption_count >= v_campaign.max_redemptions then
    return jsonb_build_object('ok', false, 'reason', 'exhausted');
  end if;

  insert into public.registration_promo_redemptions (
    campaign_id,
    user_id,
    credits_granted
  ) values (
    v_campaign.id,
    p_user_id,
    v_campaign.credits_amount
  )
  returning id into v_redemption_id;

  update public.registration_promo_campaigns
  set redemption_count = redemption_count + 1,
      updated_at = now()
  where id = v_campaign.id
    and redemption_count < max_redemptions
  returning * into v_campaign;

  if v_campaign.id is null then
    raise exception 'registration_promo_exhausted' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'campaign_id', v_campaign.id,
    'redemption_id', v_redemption_id,
    'credits_amount', v_campaign.credits_amount
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_redeemed');
end;
$$;

revoke all on function public.claim_registration_promo_redemption(uuid, text, integer) from public;
grant execute on function public.claim_registration_promo_redemption(uuid, text, integer) to service_role;
