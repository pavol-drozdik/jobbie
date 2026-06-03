-- Delta: applicant auto-response template defaults.
-- Guarded so it no-ops when the applicants module table is not present.

do $$
begin
  if to_regclass('public.company_applicant_message_templates') is null then
    return;
  end if;

  comment on table public.company_applicant_message_templates is
    'Product name: company_auto_response_templates (automatic applicant response templates by status).';

  create index if not exists idx_application_auto_messages_app_status
    on public.application_auto_messages (application_id, target_status);

  with default_templates as (
    select *
    from (
      values
        ('rejected'::text, 'Dobry den {{candidateName}}, je nam to luto, ale na poziciu {{jobTitle}} sme sa rozhodli prijat ineho uchadzaca. S pozdravom {{companyName}}.'::text),
        ('interview_invited'::text, 'Dobry den {{candidateName}}, po posudeni uchadzacov sme sa rozhodli pozvat Vas na pohovor na poziciu {{jobTitle}}. Prosim, kontaktujte nas, aby sme si dohodli datum a cas. S pozdravom {{companyName}}.'::text),
        ('accepted'::text, 'Dobry den {{candidateName}}, gratulujeme, boli ste prijaty na poziciu {{jobTitle}}. S pozdravom {{companyName}}.'::text)
    ) as t(status_type, template_text)
  ),
  company_ids as (
    select distinct company_id from public.company_applicant_message_templates
    union
    select distinct company_id from public.job_offers where company_id is not null and is_deleted = false
  )
  insert into public.company_applicant_message_templates (company_id, status_type, enabled, message_text)
  select c.company_id, d.status_type, false, d.template_text
  from company_ids c
  cross join default_templates d
  left join public.company_applicant_message_templates ex
    on ex.company_id = c.company_id and ex.status_type = d.status_type
  where ex.id is null;

  update public.company_applicant_message_templates
  set message_text = d.template_text,
      updated_at = now()
  from (
    values
      ('rejected'::text, 'Dobry den {{candidateName}}, je nam to luto, ale na poziciu {{jobTitle}} sme sa rozhodli prijat ineho uchadzaca. S pozdravom {{companyName}}.'::text),
      ('interview_invited'::text, 'Dobry den {{candidateName}}, po posudeni uchadzacov sme sa rozhodli pozvat Vas na pohovor na poziciu {{jobTitle}}. Prosim, kontaktujte nas, aby sme si dohodli datum a cas. S pozdravom {{companyName}}.'::text),
      ('accepted'::text, 'Dobry den {{candidateName}}, gratulujeme, boli ste prijaty na poziciu {{jobTitle}}. S pozdravom {{companyName}}.'::text)
  ) as d(status_type, template_text)
  where public.company_applicant_message_templates.status_type = d.status_type
    and (
      public.company_applicant_message_templates.message_text is null
      or btrim(public.company_applicant_message_templates.message_text) = ''
      or public.company_applicant_message_templates.message_text in (
        'Prepacte, ale rozhodli sme sa pokracovat s inymi kandidatmi.',
        'Radi by sme vas pozvali na pohovor.',
        'Gratulujeme, boli ste prijaty.'
      )
    );
end $$;
