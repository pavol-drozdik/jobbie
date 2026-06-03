-- Revoke DML from anon on service-only tables (RLS denies access; grants should not imply privilege).

revoke insert, update, delete on public.stripe_credit_fulfillments from anon;
revoke insert, update, delete on public.credit_ledger from anon;
revoke insert, update, delete on public.credit_lots from anon;
revoke insert, update, delete on public.audit_events from anon;
revoke insert, update, delete on public.audit_chain_state from anon;
revoke insert, update, delete on public.auth_security_events from anon;
revoke insert, update, delete on public.profile_field_changes from anon;
revoke insert, update, delete on public.stripe_webhook_events from anon;
revoke insert, update, delete on public.stripe_financial_events from anon;
revoke insert, update, delete on public.api_request_logs from anon;
revoke insert, update, delete on public.storage_access_events from anon;
revoke insert, update, delete on public.moderation_decisions from anon;
revoke insert, update, delete on public.client_event_batches from anon;
revoke insert, update, delete on public.push_subscriptions from anon;
revoke insert, update, delete on public.cv_contact_unlocks from anon;
revoke insert, update, delete on public.job_promotions from anon;
revoke insert, update, delete on public.banner_ads from anon;

-- authenticated: same service-only tables (Nest uses service_role)
revoke insert, update, delete on public.stripe_credit_fulfillments from authenticated;
revoke insert, update, delete on public.credit_ledger from authenticated;
revoke insert, update, delete on public.credit_lots from authenticated;
revoke insert, update, delete on public.audit_events from authenticated;
revoke insert, update, delete on public.audit_chain_state from authenticated;
revoke insert, update, delete on public.auth_security_events from authenticated;
revoke insert, update, delete on public.profile_field_changes from authenticated;
revoke insert, update, delete on public.stripe_webhook_events from authenticated;
revoke insert, update, delete on public.stripe_financial_events from authenticated;
revoke insert, update, delete on public.api_request_logs from authenticated;
revoke insert, update, delete on public.storage_access_events from authenticated;
revoke insert, update, delete on public.moderation_decisions from authenticated;
revoke insert, update, delete on public.client_event_batches from authenticated;
revoke insert, update, delete on public.push_subscriptions from authenticated;
revoke insert, update, delete on public.cv_contact_unlocks from authenticated;
revoke insert, update, delete on public.job_promotions from authenticated;
revoke insert, update, delete on public.banner_ads from authenticated;
