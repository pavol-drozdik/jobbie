-- Employer applicants v2: reviewing status, notes, per-job reply settings, auto-reply log fields.

-- ---------------------------------------------------------------------------
-- applications.status: add reviewing + status_updated_at
-- ---------------------------------------------------------------------------
alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in (
    'pending', 'reviewing', 'rejected', 'withdrawn',
    'interview_invited', 'accepted'
  ));

alter table public.applications
  add column if not exists status_updated_at timestamptz;

create index if not exists idx_applications_job_status
  on public.applications (job_id, status)
  where is_deleted = false;

-- ---------------------------------------------------------------------------
-- application_notes (company-only, via Nest service_role)
-- ---------------------------------------------------------------------------
create table if not exists public.application_notes (
  application_id uuid primary key references public.applications(id) on delete cascade,
  company_id uuid not null references public.profiles(id) on delete cascade,
  note text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_application_notes_company
  on public.application_notes (company_id);

alter table public.application_notes enable row level security;

drop policy if exists "service role full application_notes" on public.application_notes;
create policy "service role full application_notes"
  on public.application_notes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- job_applicant_reply_settings (per job, company-scoped)
-- ---------------------------------------------------------------------------
create table if not exists public.job_applicant_reply_settings (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.job_offers(id) on delete cascade,
  company_id uuid not null references public.profiles(id) on delete cascade,
  rejection_auto_reply_enabled boolean not null default false,
  rejection_subject text not null default 'Vaša reakcia na pracovnú ponuku',
  rejection_template text not null default '',
  interview_auto_reply_enabled boolean not null default false,
  interview_subject text not null default 'Pozvanie na pohovor',
  interview_template text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id)
);

create index if not exists idx_job_applicant_reply_settings_company
  on public.job_applicant_reply_settings (company_id);

drop trigger if exists job_applicant_reply_settings_updated_at on public.job_applicant_reply_settings;
create trigger job_applicant_reply_settings_updated_at
  before update on public.job_applicant_reply_settings
  for each row execute function public.set_updated_at();

alter table public.job_applicant_reply_settings enable row level security;

drop policy if exists "service role full job_applicant_reply_settings" on public.job_applicant_reply_settings;
create policy "service role full job_applicant_reply_settings"
  on public.job_applicant_reply_settings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- application_auto_messages: log channel, subject, body, delivery status
-- ---------------------------------------------------------------------------
alter table public.application_auto_messages
  add column if not exists channel text
    check (channel is null or channel in ('email', 'in_app'));

alter table public.application_auto_messages
  add column if not exists delivery_status text not null default 'sent'
    check (delivery_status in ('sent', 'failed', 'skipped'));

alter table public.application_auto_messages
  add column if not exists subject text;

alter table public.application_auto_messages
  add column if not exists body text;

alter table public.application_auto_messages
  add column if not exists sent_by uuid references public.profiles(id) on delete set null;

alter table public.application_auto_messages
  add column if not exists error_message text;

-- ---------------------------------------------------------------------------
-- RPC: employer_set_application_status (reviewing + status_updated_at)
-- ---------------------------------------------------------------------------
create or replace function public.employer_set_application_status(
  p_application_id uuid,
  p_new_status text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app record;
  v_company_id uuid;
begin
  if p_new_status not in (
    'pending', 'reviewing', 'rejected', 'interview_invited', 'accepted'
  ) then
    raise exception 'invalid_status';
  end if;

  select a.id, a.job_id, a.individual_id, a.status, a.is_deleted
  into v_app
  from public.applications a
  where a.id = p_application_id;

  if not found then
    raise exception 'not_found';
  end if;

  if v_app.is_deleted then
    raise exception 'not_found';
  end if;

  if v_app.status = 'withdrawn' then
    raise exception 'withdrawn';
  end if;

  select j.company_id into v_company_id
  from public.job_offers j
  where j.id = v_app.job_id and not j.is_deleted;

  if v_company_id is null or v_company_id <> p_actor_id then
    raise exception 'forbidden';
  end if;

  if v_app.status = p_new_status then
    return jsonb_build_object(
      'id', v_app.id,
      'status', v_app.status,
      'unchanged', true
    );
  end if;

  insert into public.application_status_history (
    application_id, old_status, new_status, changed_by, source
  ) values (
    p_application_id, v_app.status, p_new_status, p_actor_id, 'employer_ui'
  );

  update public.applications
  set
    status = p_new_status,
    updated_at = now(),
    status_updated_at = now()
  where id = p_application_id;

  return jsonb_build_object(
    'id', p_application_id,
    'status', p_new_status,
    'old_status', v_app.status,
    'unchanged', false
  );
end;
$$;

revoke all on function public.employer_set_application_status(uuid, text, uuid) from public;
grant execute on function public.employer_set_application_status(uuid, text, uuid) to service_role;

grant select, insert, update, delete on public.application_notes to service_role;
grant select, insert, update, delete on public.job_applicant_reply_settings to service_role;
