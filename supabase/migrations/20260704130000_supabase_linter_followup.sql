-- Follow-up: move SECURITY DEFINER helpers out of PostgREST-exposed `public` schema,
-- and add explicit deny-all RLS policies (lint 0029 + 0008).

-- ---------------------------------------------------------------------------
-- private schema: storage RLS helpers (not exposed via /rest/v1/rpc)
-- ---------------------------------------------------------------------------
create schema if not exists private;

grant usage on schema private to postgres, authenticated, service_role;

create or replace function private.chat_media_user_can_upload_object(object_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  segs text[];
  uid uuid := auth.uid();
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

create or replace function private.chat_media_user_can_read_object(object_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  segs text[];
  uid uuid := auth.uid();
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

create or replace function private.chat_media_user_can_delete_object(object_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  segs text[];
  uid uuid := auth.uid();
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

revoke all on function private.chat_media_user_can_upload_object(text) from public, anon;
revoke all on function private.chat_media_user_can_read_object(text) from public, anon;
revoke all on function private.chat_media_user_can_delete_object(text) from public, anon;

grant execute on function private.chat_media_user_can_upload_object(text)
  to authenticated, service_role;
grant execute on function private.chat_media_user_can_read_object(text)
  to authenticated, service_role;
grant execute on function private.chat_media_user_can_delete_object(text)
  to authenticated, service_role;

-- Drop policies before dropping the public helpers they reference.
drop policy if exists "chat-media insert room participants" on storage.objects;
drop policy if exists "chat-media select room participants" on storage.objects;
drop policy if exists "chat-media delete own prefix" on storage.objects;

drop function if exists public.chat_media_user_can_upload_object(text, uuid);
drop function if exists public.chat_media_user_can_read_object(text, uuid);
drop function if exists public.chat_media_user_can_delete_object(text, uuid);

create policy "chat-media insert room participants"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'chat-media'
    and private.chat_media_user_can_upload_object(name)
  );

create policy "chat-media select room participants"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'chat-media'
    and private.chat_media_user_can_read_object(name)
  );

create policy "chat-media delete own prefix"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'chat-media'
    and private.chat_media_user_can_delete_object(name)
  );

-- Nest-only unlock probe (not used from PWA PostgREST)
create or replace function private.employer_has_cv_contact_unlock(
  p_company_id uuid,
  p_cv_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.cv_contact_unlocks u
    where u.company_id = p_company_id
      and u.cv_id = p_cv_id
  );
$$;

revoke all on function private.employer_has_cv_contact_unlock(uuid, uuid) from public, anon, authenticated;
grant execute on function private.employer_has_cv_contact_unlock(uuid, uuid) to service_role;

drop function if exists public.employer_has_cv_contact_unlock(uuid, uuid);

-- ---------------------------------------------------------------------------
-- Explicit deny-all RLS (lint 0008): service_role-only tables
-- ---------------------------------------------------------------------------
drop policy if exists "deny all blog_posts" on public.blog_posts;
create policy "deny all blog_posts"
  on public.blog_posts for all using (false) with check (false);

drop policy if exists "deny all profile_reviews" on public.profile_reviews;
create policy "deny all profile_reviews"
  on public.profile_reviews for all using (false) with check (false);

drop policy if exists "deny all profile_views" on public.profile_views;
create policy "deny all profile_views"
  on public.profile_views for all using (false) with check (false);

drop policy if exists "deny all subscribers" on public.subscribers;
create policy "deny all subscribers"
  on public.subscribers for all using (false) with check (false);

drop policy if exists "deny all subscription_period_credit_grants"
  on public.subscription_period_credit_grants;
create policy "deny all subscription_period_credit_grants"
  on public.subscription_period_credit_grants for all using (false) with check (false);
