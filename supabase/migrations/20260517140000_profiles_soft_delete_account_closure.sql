-- Account closure uses profiles.is_deleted + PII scrub + auth ban (no auth.users delete).
-- FKs to profiles remain valid so job_offers, applications, chat_rooms, and chat_messages stay intact.

comment on column public.profiles.is_deleted is
  'When true, the user closed their account: PII cleared, auth user banned, Typesense profile/jobs removed; relational rows kept for counterparties.';
