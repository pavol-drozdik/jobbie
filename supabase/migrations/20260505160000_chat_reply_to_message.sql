-- Single-level reply references (no FK: preserve orphan UUIDs if parent rows are removed).

alter table public.chat_messages
  add column if not exists reply_to_message_id uuid null;

create index if not exists idx_chat_messages_reply_to_message_id
  on public.chat_messages (reply_to_message_id)
  where reply_to_message_id is not null;
