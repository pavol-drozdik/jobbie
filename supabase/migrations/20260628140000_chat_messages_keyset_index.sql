-- Chat messages keyset pagination support.

create index if not exists idx_chat_messages_room_created_id
  on public.chat_messages (room_id, created_at desc, id desc);
