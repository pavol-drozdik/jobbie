-- Promo campaigns Phase 3: profile role filter, first-subscription-only, fixed amount off, archive.

alter table public.promo_campaigns
  add column if not exists eligible_profile_role text not null default 'both',
  add column if not exists require_no_prior_subscription boolean not null default false,
  add column if not exists discount_kind text,
  add column if not exists reward_amount_cents integer,
  add column if not exists archived_at timestamptz;

alter table public.promo_campaigns
  drop constraint if exists promo_campaigns_eligible_profile_role_check;

alter table public.promo_campaigns
  add constraint promo_campaigns_eligible_profile_role_check
  check (eligible_profile_role in ('both', 'company', 'individual'));

alter table public.promo_campaigns
  drop constraint if exists promo_campaigns_discount_kind_check;

alter table public.promo_campaigns
  add constraint promo_campaigns_discount_kind_check
  check (
    discount_kind is null
    or discount_kind in ('percent', 'amount_off')
  );

alter table public.promo_campaigns
  drop constraint if exists promo_campaigns_reward_amount_cents_check;

alter table public.promo_campaigns
  add constraint promo_campaigns_reward_amount_cents_check
  check (
    reward_amount_cents is null
    or (reward_amount_cents >= 1 and reward_amount_cents <= 50000)
  );

alter table public.promo_campaigns
  drop constraint if exists promo_campaigns_phase3_discount_shape;

alter table public.promo_campaigns
  add constraint promo_campaigns_phase3_discount_shape
  check (
    (
      reward_type = 'free_credits'
      and discount_kind is null
      and reward_amount_cents is null
    )
    or (
      reward_type <> 'free_credits'
      and discount_kind in ('percent', 'amount_off')
      and (
        (discount_kind = 'percent' and reward_percent is not null and reward_amount_cents is null)
        or (discount_kind = 'amount_off' and reward_amount_cents is not null and reward_percent is null)
      )
    )
  );

update public.promo_campaigns
set
  eligible_profile_role = 'both',
  discount_kind = case
    when reward_type = 'free_credits' then null
    else 'percent'
  end
where discount_kind is null;

alter table public.promo_campaign_redemptions
  add column if not exists amount_applied_cents integer;

alter table public.promo_campaign_redemptions
  drop constraint if exists promo_campaign_redemptions_amount_applied_cents_check;

alter table public.promo_campaign_redemptions
  add constraint promo_campaign_redemptions_amount_applied_cents_check
  check (
    amount_applied_cents is null
    or (amount_applied_cents >= 1 and amount_applied_cents <= 50000)
  );

create index if not exists idx_promo_campaigns_archived_at
  on public.promo_campaigns (archived_at)
  where archived_at is not null;
