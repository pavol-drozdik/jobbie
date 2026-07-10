-- Unified promo campaigns (signup, checkout, first-publish). Replaces registration_promo_*.

create table if not exists public.promo_campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null default '',
  enabled boolean not null default false,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  reward_type text not null check (
    reward_type in ('free_credits', 'credit_pack_discount', 'subscription_discount')
  ),
  reward_credits integer check (reward_credits is null or (reward_credits > 0 and reward_credits <= 500)),
  reward_percent integer check (reward_percent is null or (reward_percent >= 1 and reward_percent <= 100)),
  reward_all_credit_packs boolean not null default true,
  reward_credit_pack_slugs text[] not null default '{}',
  reward_all_subscription_plans boolean not null default true,
  reward_subscription_plan_slugs text[] not null default '{}',
  subscription_discount_duration text check (
    subscription_discount_duration is null
    or subscription_discount_duration in ('once', 'forever')
  ),
  stripe_coupon_id text,
  require_new_account boolean not null default false,
  new_account_max_hours integer not null default 48 check (new_account_max_hours > 0),
  require_first_publish boolean not null default false,
  require_promo_code boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_campaigns_count_lte_max check (
    max_redemptions is null or redemption_count <= max_redemptions
  ),
  constraint promo_campaigns_free_credits check (
    reward_type <> 'free_credits' or reward_credits is not null
  ),
  constraint promo_campaigns_discount_percent check (
    reward_type = 'free_credits' or reward_percent is not null
  ),
  constraint promo_campaigns_subscription_duration check (
    reward_type <> 'subscription_discount' or subscription_discount_duration is not null
  )
);

create unique index if not exists idx_promo_campaigns_code_upper
  on public.promo_campaigns (upper(trim(code)));

create table if not exists public.promo_campaign_redemptions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.promo_campaigns (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  context text not null check (
    context in ('signup', 'first_publish', 'credit_checkout', 'subscription_checkout')
  ),
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  credits_granted integer check (credits_granted is null or credits_granted > 0),
  percent_applied integer check (percent_applied is null or (percent_applied >= 1 and percent_applied <= 100)),
  target_slug text,
  payment_intent_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint promo_campaign_redemptions_user_campaign unique (campaign_id, user_id)
);

create index if not exists idx_promo_campaign_redemptions_user
  on public.promo_campaign_redemptions (user_id, created_at desc);

create index if not exists idx_promo_campaign_redemptions_pi
  on public.promo_campaign_redemptions (payment_intent_id)
  where payment_intent_id is not null;

drop trigger if exists promo_campaigns_updated_at on public.promo_campaigns;
create trigger promo_campaigns_updated_at
  before update on public.promo_campaigns
  for each row execute function public.set_updated_at();

alter table public.promo_campaigns enable row level security;
alter table public.promo_campaign_redemptions enable row level security;

drop policy if exists "deny all promo_campaigns" on public.promo_campaigns;
create policy "deny all promo_campaigns"
  on public.promo_campaigns for all using (false) with check (false);

drop policy if exists "deny all promo_campaign_redemptions" on public.promo_campaign_redemptions;
create policy "deny all promo_campaign_redemptions"
  on public.promo_campaign_redemptions for all using (false) with check (false);

revoke all on public.promo_campaigns from anon, authenticated;
revoke all on public.promo_campaign_redemptions from anon, authenticated;
grant select, insert, update, delete on public.promo_campaigns to service_role;
grant select, insert, update, delete on public.promo_campaign_redemptions to service_role;

-- Migrate legacy registration promo rows when present.
insert into public.promo_campaigns (
  code,
  name,
  enabled,
  max_redemptions,
  redemption_count,
  starts_at,
  ends_at,
  reward_type,
  reward_credits,
  reward_all_credit_packs,
  reward_all_subscription_plans,
  require_new_account,
  new_account_max_hours,
  require_promo_code
)
select
  c.code,
  coalesce(c.code, 'Registration promo'),
  c.enabled,
  c.max_redemptions,
  c.redemption_count,
  c.starts_at,
  c.ends_at,
  'free_credits',
  c.credits_amount,
  true,
  true,
  true,
  48,
  true
from public.registration_promo_campaigns c
where not exists (
  select 1 from public.promo_campaigns p
  where upper(trim(p.code)) = upper(trim(c.code))
);

insert into public.promo_campaign_redemptions (
  campaign_id,
  user_id,
  context,
  status,
  credits_granted,
  completed_at,
  created_at
)
select
  p.id,
  r.user_id,
  'signup',
  'completed',
  r.credits_granted,
  r.created_at,
  r.created_at
from public.registration_promo_redemptions r
join public.registration_promo_campaigns old_c on old_c.id = r.campaign_id
join public.promo_campaigns p on upper(trim(p.code)) = upper(trim(old_c.code))
on conflict (campaign_id, user_id) do nothing;

insert into public.promo_campaigns (
  code,
  name,
  enabled,
  max_redemptions,
  reward_type,
  reward_credits,
  reward_all_credit_packs,
  reward_all_subscription_plans,
  require_new_account,
  new_account_max_hours,
  require_promo_code
)
select
  'LAUNCH20',
  'LAUNCH20',
  false,
  50,
  'free_credits',
  20,
  true,
  true,
  true,
  48,
  true
where not exists (
  select 1 from public.promo_campaigns p where upper(trim(p.code)) = 'LAUNCH20'
);

drop function if exists public.claim_registration_promo_redemption(uuid, text, integer);

drop table if exists public.registration_promo_redemptions;
drop table if exists public.registration_promo_campaigns;

create or replace function public.claim_promo_campaign_redemption(
  p_user_id uuid,
  p_campaign_id uuid,
  p_context text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_campaign public.promo_campaigns%rowtype;
  v_redemption_id uuid;
begin
  if p_user_id is null or p_campaign_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_request');
  end if;

  if p_context not in ('signup', 'first_publish', 'credit_checkout', 'subscription_checkout') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_context');
  end if;

  select * into v_campaign
  from public.promo_campaigns c
  where c.id = p_campaign_id
  for update;

  if v_campaign.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
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

  if v_campaign.max_redemptions is not null
    and v_campaign.redemption_count >= v_campaign.max_redemptions then
    return jsonb_build_object('ok', false, 'reason', 'exhausted');
  end if;

  if exists (
    select 1 from public.promo_campaign_redemptions r
    where r.campaign_id = p_campaign_id and r.user_id = p_user_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_redeemed');
  end if;

  insert into public.promo_campaign_redemptions (
    campaign_id,
    user_id,
    context,
    status
  ) values (
    p_campaign_id,
    p_user_id,
    p_context,
    'pending'
  )
  returning id into v_redemption_id;

  update public.promo_campaigns
  set redemption_count = redemption_count + 1,
      updated_at = now()
  where id = p_campaign_id
    and (max_redemptions is null or redemption_count < max_redemptions)
  returning * into v_campaign;

  if v_campaign.id is null then
    raise exception 'promo_campaign_exhausted' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'campaign_id', v_campaign.id,
    'redemption_id', v_redemption_id,
    'reward_type', v_campaign.reward_type,
    'reward_credits', v_campaign.reward_credits,
    'reward_percent', v_campaign.reward_percent
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_redeemed');
end;
$$;

revoke all on function public.claim_promo_campaign_redemption(uuid, uuid, text) from public;
grant execute on function public.claim_promo_campaign_redemption(uuid, uuid, text) to service_role;
