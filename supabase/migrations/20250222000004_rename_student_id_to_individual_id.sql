-- Run this only if you already have applications and chat_rooms with student_id column.
-- Renames student_id to individual_id and updates indexes.

alter table public.applications rename column student_id to individual_id;

drop index if exists public.idx_applications_student_id;
create index if not exists idx_applications_individual_id on public.applications(individual_id);

alter table public.chat_rooms rename column student_id to individual_id;

drop index if exists public.idx_chat_rooms_student_id;
create index if not exists idx_chat_rooms_individual_id on public.chat_rooms(individual_id);

-- Recreate RLS policies that reference the old column name (drop and recreate)
drop policy if exists "User can insert own application" on public.applications;
drop policy if exists "User can read own applications" on public.applications;
create policy "User can insert own application" on public.applications
  for insert with check (individual_id = auth.uid());
create policy "User can read own applications" on public.applications
  for select using (individual_id = auth.uid());

drop policy if exists "Participants can read chat rooms" on public.chat_rooms;
drop policy if exists "Participants can insert chat room (via app logic)" on public.chat_rooms;
create policy "Participants can read chat rooms" on public.chat_rooms
  for select using (company_id = auth.uid() or individual_id = auth.uid());
create policy "Participants can insert chat room (via app logic)" on public.chat_rooms
  for insert with check (company_id = auth.uid() or individual_id = auth.uid());

drop policy if exists "Room participants can read messages" on public.chat_messages;
drop policy if exists "Room participants can send messages" on public.chat_messages;
create policy "Room participants can read messages" on public.chat_messages
  for select using (
    exists (
      select 1 from public.chat_rooms r
      where r.id = chat_messages.room_id
        and (r.company_id = auth.uid() or r.individual_id = auth.uid())
    )
  );
create policy "Room participants can send messages" on public.chat_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_rooms r
      where r.id = chat_messages.room_id
        and (r.company_id = auth.uid() or r.individual_id = auth.uid())
    )
  );
