-- CV job preferences: relocate/commute and remote-only flags (wizard step 3).

alter table public.cv_job_preferences
  add column if not exists open_to_relocate_commute boolean,
  add column if not exists remote_work_only boolean;

comment on column public.cv_job_preferences.open_to_relocate_commute is
  'Candidate open to relocation or longer commute for work.';
comment on column public.cv_job_preferences.remote_work_only is
  'Candidate prefers work from home only.';
