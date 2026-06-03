-- Normalize legacy Base44 / English job and company-ad category values to canonical slugs.

update public.job_offers
set category = 'stavba'
where lower(trim(category)) in ('construction');

update public.job_offers
set category = 'stahovanie'
where lower(trim(category)) in ('moving');

update public.job_offers
set category = 'domacnost'
where lower(trim(category)) in ('cleaning');

update public.job_offers
set category = 'sklad'
where lower(trim(category)) in ('warehouse');

update public.job_offers
set category = 'zahrada'
where lower(trim(category)) in ('garden');

update public.job_offers
set category = 'eventy'
where lower(trim(category)) in ('events');

update public.job_offers
set category = 'starostlivost'
where lower(trim(category)) in ('care');

update public.job_offers
set category = 'gastro'
where lower(trim(category)) in ('food', 'restaurant');

update public.job_offers
set category = 'auto'
where lower(trim(category)) in ('transport', 'logistics', 'doprava');

update public.job_offers
set category = 'ine'
where lower(trim(category)) in ('other');

update public.company_ads
set category = 'stavba'
where lower(trim(category)) in ('construction');

update public.company_ads
set category = 'stahovanie'
where lower(trim(category)) in ('moving');

update public.company_ads
set category = 'domacnost'
where lower(trim(category)) in ('cleaning');

update public.company_ads
set category = 'sklad'
where lower(trim(category)) in ('warehouse');

update public.company_ads
set category = 'zahrada'
where lower(trim(category)) in ('garden');

update public.company_ads
set category = 'eventy'
where lower(trim(category)) in ('events');

update public.company_ads
set category = 'starostlivost'
where lower(trim(category)) in ('care');

update public.company_ads
set category = 'gastro'
where lower(trim(category)) in ('food', 'restaurant');

update public.company_ads
set category = 'auto'
where lower(trim(category)) in ('transport', 'logistics', 'doprava');

update public.company_ads
set category = 'ine'
where lower(trim(category)) in ('other');

update public.job_email_alerts
set category = 'stavba'
where category is not null and lower(trim(category)) in ('construction');

update public.job_email_alerts
set category = 'stahovanie'
where category is not null and lower(trim(category)) in ('moving');

update public.job_email_alerts
set category = 'domacnost'
where category is not null and lower(trim(category)) in ('cleaning');

update public.job_email_alerts
set category = 'sklad'
where category is not null and lower(trim(category)) in ('warehouse');

update public.job_email_alerts
set category = 'zahrada'
where category is not null and lower(trim(category)) in ('garden');

update public.job_email_alerts
set category = 'eventy'
where category is not null and lower(trim(category)) in ('events');

update public.job_email_alerts
set category = 'starostlivost'
where category is not null and lower(trim(category)) in ('care');

update public.job_email_alerts
set category = 'gastro'
where category is not null and lower(trim(category)) in ('food', 'restaurant');

update public.job_email_alerts
set category = 'auto'
where category is not null and lower(trim(category)) in ('transport', 'logistics', 'doprava');

update public.job_email_alerts
set category = 'ine'
where category is not null and lower(trim(category)) in ('other');

-- Multi-category column: replace legacy tokens inside arrays.
update public.job_email_alerts
set categories = (
  select coalesce(array_agg(distinct mapped order by mapped), '{}'::text[])
  from (
    select case lower(trim(c))
      when 'construction' then 'stavba'
      when 'moving' then 'stahovanie'
      when 'cleaning' then 'domacnost'
      when 'warehouse' then 'sklad'
      when 'garden' then 'zahrada'
      when 'events' then 'eventy'
      when 'care' then 'starostlivost'
      when 'food' then 'gastro'
      when 'restaurant' then 'gastro'
      when 'transport' then 'auto'
      when 'logistics' then 'auto'
      when 'doprava' then 'auto'
      when 'other' then 'ine'
      else lower(trim(c))
    end as mapped
    from unnest(categories) as c
    where trim(c) <> ''
  ) s
)
where categories is not null and cardinality(categories) > 0;
