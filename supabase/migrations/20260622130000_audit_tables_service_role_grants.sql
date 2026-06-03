-- Nest AuditService / retention / payments write these tables via service_role.
-- RLS denies anon/authenticated; table-level grants were never added when audit tables were created
-- (see login_attempt_counters in 20260503120000_enterprise_auth_security.sql for the pattern).

grant select, insert, delete on public.auth_security_events to service_role;
grant select, insert, delete on public.profile_field_changes to service_role;
grant select, insert, delete on public.credit_ledger to service_role;
grant select on public.audit_events to service_role;
grant select, insert, delete on public.client_event_batches to service_role;
grant select, insert, delete on public.api_request_logs to service_role;
grant select, insert, delete on public.storage_access_events to service_role;
grant select, insert, update, delete on public.stripe_webhook_events to service_role;
grant select, insert, delete on public.stripe_financial_events to service_role;
grant select, insert on public.moderation_decisions to service_role;
