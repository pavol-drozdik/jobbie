-- Fix chat-media storage RLS: policies that subquery public.chat_rooms under the invoker
-- can fail (nested RLS / evaluation context). Use SECURITY DEFINER helpers to validate
-- room membership reliably. Also reaffirm bucket MIME (null = any) and 15 MB limit.

-- ---------------------------------------------------------------------------
-- Helpers (bypass RLS on chat_rooms only inside these controlled checks)
-- ---------------------------------------------------------------------------
create or replace function public.chat_media_user_can_upload_object(object_path text, uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  segs text[];
begin
  if uid is null then
    return false;
  end if;
  segs := storage.foldername(object_path);
  if coalesce(cardinality(segs), 0) < 3 then
    return false;
  end if;
  if segs[2] is distinct from uid::text then
    return false;
  end if;
  return exists (
    select 1
    from public.chat_rooms r
    where r.id::text = segs[1]
      and (r.company_id = uid or r.individual_id = uid)
  );
end;
$$;

create or replace function public.chat_media_user_can_read_object(object_path text, uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  segs text[];
begin
  if uid is null then
    return false;
  end if;
  segs := storage.foldername(object_path);
  if coalesce(cardinality(segs), 0) < 2 then
    return false;
  end if;
  return exists (
    select 1
    from public.chat_rooms r
    where r.id::text = segs[1]
      and (r.company_id = uid or r.individual_id = uid)
  );
end;
$$;

create or replace function public.chat_media_user_can_delete_object(object_path text, uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  segs text[];
begin
  if uid is null then
    return false;
  end if;
  segs := storage.foldername(object_path);
  if coalesce(cardinality(segs), 0) < 3 then
    return false;
  end if;
  if segs[2] is distinct from uid::text then
    return false;
  end if;
  return exists (
    select 1
    from public.chat_rooms r
    where r.id::text = segs[1]
      and (r.company_id = uid or r.individual_id = uid)
  );
end;
$$;

revoke all on function public.chat_media_user_can_upload_object(text, uuid) from public;
revoke all on function public.chat_media_user_can_read_object(text, uuid) from public;
revoke all on function public.chat_media_user_can_delete_object(text, uuid) from public;

grant execute on function public.chat_media_user_can_upload_object(text, uuid) to authenticated, service_role;
grant execute on function public.chat_media_user_can_read_object(text, uuid) to authenticated, service_role;
grant execute on function public.chat_media_user_can_delete_object(text, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- storage.objects policies for chat-media
-- ---------------------------------------------------------------------------
drop policy if exists "chat-media insert room participants" on storage.objects;
drop policy if exists "chat-media select room participants" on storage.objects;
drop policy if exists "chat-media delete own prefix" on storage.objects;

create policy "chat-media insert room participants"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-media'
  and public.chat_media_user_can_upload_object(name, auth.uid())
);

create policy "chat-media select room participants"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-media'
  and public.chat_media_user_can_read_object(name, auth.uid())
);

create policy "chat-media delete own prefix"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-media'
  and public.chat_media_user_can_delete_object(name, auth.uid())
);

-- ---------------------------------------------------------------------------
-- Bucket: any MIME + 15 MB (matches PWA MAX_CHAT_FILE_BYTES)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  15728640,
  null
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
