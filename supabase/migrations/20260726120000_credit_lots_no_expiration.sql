-- Credits do not expire: clear scheduled expiry on remaining lots.
update public.credit_lots
set expires_at = null
where expires_at is not null
  and amount_remaining > 0;
