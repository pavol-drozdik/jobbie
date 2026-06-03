-- Allow user reports targeting a specific company/service ad (profesionali listing).

alter table public.content_reports
  drop constraint if exists content_reports_target_type_check;

alter table public.content_reports
  add constraint content_reports_target_type_check
  check (target_type in (
    'job_offer',
    'company_profile',
    'company_ad',
    'banner_ad',
    'company_review',
    'chat_message'
  ));
