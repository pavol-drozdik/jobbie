-- Promo campaigns Phase 5: release pending redemptions, require_no_published_offer, retry after cancel.

alter table public.promo_campaigns
  add column if not exists require_no_published_offer boolean not null default false;

alter table public.promo_campaign_redemptions
  drop constraint if exists promo_campaign_redemptions_user_campaign;

create unique index if not exists idx_promo_campaign_redemptions_user_campaign_active
  on public.promo_campaign_redemptions (campaign_id, user_id)
  where status <> 'cancelled';

create index if not exists idx_promo_campaign_redemptions_pending_created
  on public.promo_campaign_redemptions (created_at)
  where status = 'pending';

create or replace function public.release_promo_campaign_redemption(
  p_redemption_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_redemption public.promo_campaign_redemptions%rowtype;
  v_campaign public.promo_campaigns%rowtype;
begin
  if p_redemption_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_request');
  end if;

  select * into v_redemption
  from public.promo_campaign_redemptions r
  where r.id = p_redemption_id
  for update;

  if v_redemption.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_redemption.status <> 'pending' then
    return jsonb_build_object('ok', true, 'skipped', true);
  end if;

  update public.promo_campaign_redemptions
  set status = 'cancelled',
      completed_at = now()
  where id = p_redemption_id;

  select * into v_campaign
  from public.promo_campaigns c
  where c.id = v_redemption.campaign_id
  for update;

  if v_campaign.id is not null and v_campaign.redemption_count > 0 then
    update public.promo_campaigns
    set redemption_count = greatest(0, redemption_count - 1),
        updated_at = now()
    where id = v_campaign.id;
  end if;

  if v_redemption.pool_code_id is not null then
    update public.promo_campaign_codes
    set status = 'available',
        redeemed_by_user_id = null,
        redemption_id = null,
        redeemed_at = null
    where id = v_redemption.pool_code_id
      and status = 'redeemed';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.release_promo_campaign_redemption(uuid) from public;
grant execute on function public.release_promo_campaign_redemption(uuid) to service_role;
