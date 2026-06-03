-- Allow monthly frequency on job email alerts (ponuky na e-mail).

alter table public.job_email_alerts
  drop constraint if exists job_email_alerts_frequency_check;

alter table public.job_email_alerts
  add constraint job_email_alerts_frequency_check
  check (frequency in ('daily', 'weekly', 'monthly', 'immediate'));

comment on column public.job_email_alerts.frequency is
  'Digest cadence: daily, weekly, monthly, or legacy immediate (deprecated in API).';
