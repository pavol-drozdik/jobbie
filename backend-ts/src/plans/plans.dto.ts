export interface PlanResponseDto {
  id: string;
  slug: string;
  name_sk: string;
  price_monthly_cents: number;
  max_active_jobs: number;
  sort_order: number;
}

export interface MySubscriptionResponseDto {
  plan_id: string;
  plan_name_sk: string;
  status: string;
  current_period_end: string | null;
}
