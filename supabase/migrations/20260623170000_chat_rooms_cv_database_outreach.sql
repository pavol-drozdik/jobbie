-- CV database employer outreach: chat without a job application (application_id null).

alter table public.chat_rooms
  alter column application_id drop not null;

comment on column public.chat_rooms.application_id is
  'Job application thread when set; null for employer CV-database outreach (company_id + individual_id).';

create unique index if not exists idx_chat_rooms_cv_outreach_pair
  on public.chat_rooms (company_id, individual_id)
  where application_id is null;
