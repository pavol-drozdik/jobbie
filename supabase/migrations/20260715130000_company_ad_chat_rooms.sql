-- Profesionáli: chat inquiry threads tied to a company ad (no job application).

alter table public.chat_rooms
  alter column job_id drop not null;

alter table public.chat_rooms
  add column if not exists company_ad_id uuid references public.company_ads (id) on delete cascade;

comment on column public.chat_rooms.company_ad_id is
  'Profesionáli ad inquiry when set; job_id may be null.';

alter table public.chat_rooms
  drop constraint if exists chat_rooms_context_check;

alter table public.chat_rooms
  add constraint chat_rooms_context_check
  check (job_id is not null or company_ad_id is not null);

drop index if exists public.idx_chat_rooms_cv_outreach_pair;

create unique index if not exists idx_chat_rooms_cv_outreach_pair
  on public.chat_rooms (company_id, individual_id)
  where application_id is null and company_ad_id is null;

create unique index if not exists idx_chat_rooms_company_ad_inquiry
  on public.chat_rooms (company_ad_id, individual_id)
  where company_ad_id is not null;

create index if not exists idx_chat_rooms_company_ad_id
  on public.chat_rooms (company_ad_id)
  where company_ad_id is not null;
