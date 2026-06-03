-- Finish the storage upload lockdown started in 20260622120000_storage_upload_lockdown.sql.
--
-- Hosted Supabase: `storage.objects` is owned by `supabase_storage_admin`. The
-- migration role cannot GRANT that role (reserved) or DROP existing policies
-- (42501 must be owner). Instead we add RESTRICTIVE deny policies: permissive
-- client write policies remain on paper but every authenticated INSERT/UPDATE/
-- DELETE on these buckets is blocked. Nest continues to use service_role
-- (bypasses RLS).
--
-- Optional cleanup (Dashboard → Storage → Policies, or superuser psql): drop
--   profile-avatars: owner insert | owner update | owner delete
--   chat-media insert room participants | chat-media delete own prefix
--
-- Public read on profile-avatars is unchanged. Chat-media SELECT for room
-- participants is unchanged.

-- ---------------------------------------------------------------------------
-- profile-avatars: block authenticated writes (API / service_role only)
-- ---------------------------------------------------------------------------
do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile-avatars: lockdown deny client insert'
  ) then
    execute $sql$
      create policy "profile-avatars: lockdown deny client insert"
      on storage.objects
      as restrictive
      for insert
      to authenticated
      with check (bucket_id = 'profile-avatars' and false)
    $sql$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile-avatars: lockdown deny client update'
  ) then
    execute $sql$
      create policy "profile-avatars: lockdown deny client update"
      on storage.objects
      as restrictive
      for update
      to authenticated
      using (bucket_id = 'profile-avatars' and false)
      with check (bucket_id = 'profile-avatars' and false)
    $sql$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile-avatars: lockdown deny client delete'
  ) then
    execute $sql$
      create policy "profile-avatars: lockdown deny client delete"
      on storage.objects
      as restrictive
      for delete
      to authenticated
      using (bucket_id = 'profile-avatars' and false)
    $sql$;
  end if;
end
$policy$;

-- ---------------------------------------------------------------------------
-- chat-media: block authenticated insert/delete; keep SELECT policies
-- ---------------------------------------------------------------------------
do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat-media: lockdown deny client insert'
  ) then
    execute $sql$
      create policy "chat-media: lockdown deny client insert"
      on storage.objects
      as restrictive
      for insert
      to authenticated
      with check (bucket_id = 'chat-media' and false)
    $sql$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat-media: lockdown deny client delete'
  ) then
    execute $sql$
      create policy "chat-media: lockdown deny client delete"
      on storage.objects
      as restrictive
      for delete
      to authenticated
      using (bucket_id = 'chat-media' and false)
    $sql$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat-media: lockdown deny client update'
  ) then
    execute $sql$
      create policy "chat-media: lockdown deny client update"
      on storage.objects
      as restrictive
      for update
      to authenticated
      using (bucket_id = 'chat-media' and false)
      with check (bucket_id = 'chat-media' and false)
    $sql$;
  end if;
end
$policy$;
