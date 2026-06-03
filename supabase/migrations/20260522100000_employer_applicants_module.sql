-- Employer applicants: interview_invited status, history, auto-message templates, idempotency log, realtime.

-- ---------------------------------------------------------------------------
-- applications.status: add interview_invited
-- ---------------------------------------------------------------------------
alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in ('pending', 'accepted', 'rejected', 'withdrawn', 'interview_invited'));

-- ---------------------------------------------------------------------------
-- application_status_history
-- ---------------------------------------------------------------------------
create table if not exists public.application_status_history (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid not null references public.applications(id) on delete cascade,
  old_status text not null,
  new_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  source text not null default 'employer_ui'
    check (source in ('employer_ui', 'system'))
);

create index if not exists idx_application_status_history_app_changed
  on public.application_status_history (application_id, changed_at desc);

alter table public.application_status_history enable row level security;

drop policy if exists "service role full application_status_history" on public.application_status_history;
create policy "service role full application_status_history"
  on public.application_status_history
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- company_applicant_message_templates
-- ---------------------------------------------------------------------------
create table if not exists public.company_applicant_message_templates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.profiles(id) on delete cascade,
  status_type text not null
    check (status_type in ('rejected', 'interview_invited', 'accepted')),
  message_text text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, status_type)
);

create index if not exists idx_company_applicant_msg_templates_company
  on public.company_applicant_message_templates (company_id);

create trigger company_applicant_message_templates_updated_at
  before update on public.company_applicant_message_templates
  for each row execute function public.set_updated_at();

alter table public.company_applicant_message_templates enable row level security;

drop policy if exists "service role full company_applicant_message_templates" on public.company_applicant_message_templates;
create policy "service role full company_applicant_message_templates"
  on public.company_applicant_message_templates
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- application_auto_messages (idempotency: one auto message per app per target status)
-- ---------------------------------------------------------------------------
create table if not exists public.application_auto_messages (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid not null references public.applications(id) on delete cascade,
  target_status text not null
    check (target_status in ('rejected', 'interview_invited', 'accepted')),
  message_id uuid references public.chat_messages(id) on delete set null,
  sent_at timestamptz not null default now(),
  unique (application_id, target_status)
);

create index if not exists idx_application_auto_messages_application
  on public.application_auto_messages (application_id);

alter table public.application_auto_messages enable row level security;

drop policy if exists "service role full application_auto_messages" on public.application_auto_messages;
create policy "service role full application_auto_messages"
  on public.application_auto_messages
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Atomic status update + history (called by Nest with service role)
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
  if p_new_status not in ('pending', 'rejected', 'interview_invited', 'accepted') then
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
  set status = p_new_status, updated_at = now()
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

-- ---------------------------------------------------------------------------
-- Realtime: applications changes for employer dashboards
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Grants (API uses service role; explicit for migrations consistency)
grant select, insert, update, delete on public.application_status_history to service_role;
grant select, insert, update, delete on public.company_applicant_message_templates to service_role;
grant select, insert, update, delete on public.application_auto_messages to service_role;
