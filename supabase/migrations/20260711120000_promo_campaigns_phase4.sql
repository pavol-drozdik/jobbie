-- Promo campaigns Phase 4: repeating subscription duration + unique code pools.

alter table public.promo_campaigns
  add column if not exists code_mode text not null default 'shared',
  add column if not exists subscription_discount_duration_months integer;

alter table public.promo_campaigns
  drop constraint if exists promo_campaigns_code_mode_check;

alter table public.promo_campaigns
  add constraint promo_campaigns_code_mode_check
  check (code_mode in ('shared', 'unique_pool'));

alter table public.promo_campaigns
  drop constraint if exists promo_campaigns_subscription_duration;

alter table public.promo_campaigns
  add constraint promo_campaigns_subscription_duration
  check (
    reward_type <> 'subscription_discount'
    or subscription_discount_duration in ('once', 'forever', 'repeating')
  );

alter table public.promo_campaigns
  drop constraint if exists promo_campaigns_subscription_repeating_months;

alter table public.promo_campaigns
  add constraint promo_campaigns_subscription_repeating_months
  check (
    subscription_discount_duration <> 'repeating'
    or (
      subscription_discount_duration_months is not null
      and subscription_discount_duration_months between 1 and 36
    )
  );

create table if not exists public.promo_campaign_codes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.promo_campaigns (id) on delete cascade,
  code text not null,
  status text not null default 'available' check (
    status in ('available', 'redeemed', 'disabled')
  ),
  redeemed_by_user_id uuid references public.profiles (id) on delete set null,
  redemption_id uuid,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);

create unique index if not exists idx_promo_campaign_codes_code_upper
  on public.promo_campaign_codes (upper(trim(code)));

create index if not exists idx_promo_campaign_codes_campaign_status
  on public.promo_campaign_codes (campaign_id, status, created_at desc);

alter table public.promo_campaign_redemptions
  add column if not exists pool_code_id uuid references public.promo_campaign_codes (id) on delete set null;

alter table public.promo_campaign_codes
  drop constraint if exists promo_campaign_codes_redemption_id_fkey;

alter table public.promo_campaign_codes
  add constraint promo_campaign_codes_redemption_id_fkey
  foreign key (redemption_id) references public.promo_campaign_redemptions (id) on delete set null;

alter table public.promo_campaign_codes enable row level security;

drop policy if exists "deny all promo_campaign_codes" on public.promo_campaign_codes;
create policy "deny all promo_campaign_codes"
  on public.promo_campaign_codes for all using (false) with check (false);

revoke all on public.promo_campaign_codes from anon, authenticated;
grant select, insert, update, delete on public.promo_campaign_codes to service_role;

create or replace function public.claim_promo_campaign_redemption(
  p_user_id uuid,
  p_campaign_id uuid,
  p_context text,
  p_pool_code_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_campaign public.promo_campaigns%rowtype;
  v_pool public.promo_campaign_codes%rowtype;
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

  if v_campaign.archived_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
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

  if v_campaign.code_mode = 'unique_pool' then
    if p_pool_code_id is null then
      return jsonb_build_object('ok', false, 'reason', 'pool_code_invalid');
    end if;

    select * into v_pool
    from public.promo_campaign_codes pc
    where pc.id = p_pool_code_id
    for update;

    if v_pool.id is null
      or v_pool.campaign_id <> p_campaign_id
      or v_pool.status <> 'available' then
      return jsonb_build_object('ok', false, 'reason', 'pool_code_exhausted');
    end if;
  elsif p_pool_code_id is not null then
    return jsonb_build_object('ok', false, 'reason', 'pool_code_invalid');
  end if;

  insert into public.promo_campaign_redemptions (
    campaign_id,
    user_id,
    context,
    status,
    pool_code_id
  ) values (
    p_campaign_id,
    p_user_id,
    p_context,
    'pending',
    p_pool_code_id
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

  if p_pool_code_id is not null then
    update public.promo_campaign_codes
    set status = 'redeemed',
        redeemed_by_user_id = p_user_id,
        redemption_id = v_redemption_id,
        redeemed_at = now()
    where id = p_pool_code_id
      and status = 'available';

    if not found then
      raise exception 'promo_pool_code_exhausted' using errcode = 'P0001';
    end if;
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

revoke all on function public.claim_promo_campaign_redemption(uuid, uuid, text, uuid) from public;
grant execute on function public.claim_promo_campaign_redemption(uuid, uuid, text, uuid) to service_role;

-- Drop legacy 3-arg overload if present (Supabase may have created it).
drop function if exists public.claim_promo_campaign_redemption(uuid, uuid, text);
