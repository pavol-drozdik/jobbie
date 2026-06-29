-- Allow auth.users hard-delete to anonymize audit_events.actor_user_id (ON DELETE SET NULL).
-- The append-only trigger blocked any UPDATE, including FK-driven actor nullification.

create or replace function public.prevent_audit_events_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    -- Erasure: only actor_user_id may change, and only to NULL (FK ON DELETE SET NULL).
    if old.actor_user_id is not null
       and new.actor_user_id is null
       and new.id is not distinct from old.id
       and new.occurred_at is not distinct from old.occurred_at
       and new.actor_ip is not distinct from old.actor_ip
       and new.actor_user_agent is not distinct from old.actor_user_agent
       and new.session_id is not distinct from old.session_id
       and new.device_id is not distinct from old.device_id
       and new.event_type is not distinct from old.event_type
       and new.subject_type is not distinct from old.subject_type
       and new.subject_id is not distinct from old.subject_id
       and new.payload is not distinct from old.payload
       and new.prev_row_hash is not distinct from old.prev_row_hash
       and new.row_hash is not distinct from old.row_hash
    then
      return new;
    end if;
  end if;

  raise exception 'audit_events is append-only';
end;
$$;
