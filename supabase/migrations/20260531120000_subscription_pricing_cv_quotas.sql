-- Subscription pricing: zadarmo monthly credits; CV DB quotas per paid tier.

update public.subscription_plans set
  monthly_credits = 5,
  updated_at = now()
where slug = 'zadarmo';

update public.subscription_plans set
  max_cv_unlocks_monthly = 50,
  max_cv_contacts_monthly = 25,
  max_cv_pdf_downloads_monthly = 25,
  updated_at = now()
where slug = 'start';

update public.subscription_plans set
  max_cv_unlocks_monthly = 75,
  max_cv_contacts_monthly = 50,
  max_cv_pdf_downloads_monthly = 50,
  updated_at = now()
where slug = 'plus';

update public.subscription_plans set
  max_cv_unlocks_monthly = null,
  max_cv_contacts_monthly = null,
  max_cv_pdf_downloads_monthly = null,
  updated_at = now()
where slug = 'pro';
