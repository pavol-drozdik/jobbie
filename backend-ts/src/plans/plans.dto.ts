export interface PlanResponseDto {
  id: string;
  slug: string;
  name_sk: string;
  price_monthly_cents: number;
  max_active_jobs: number;
  monthly_credits: number;
  max_cv_unlocks_monthly: number | null;
  max_cv_contacts_monthly: number | null;
  max_cv_pdf_downloads_monthly: number | null;
  sort_order: number;
  /** Stripe Price `recurring.trial_period_days` (0 = none). */
  trial_period_days: number;
}

export interface MySubscriptionResponseDto {
  plan_id: string;
  plan_name_sk: string;
  status: string;
  current_period_end: string | null;
}
