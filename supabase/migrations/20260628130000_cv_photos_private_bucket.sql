-- Private bucket for CV photos.
--
-- CV photos used to live alongside profile avatars in the public
-- `profile-avatars` bucket, which means anyone with the URL could fetch them
-- regardless of CV visibility / contact-unlock state. CV photos are
-- candidate-identifying biometric-ish data that should be gated by the same
-- rules as the rest of the CV header.
--
-- New uploads land here; the Nest `GET /api/cv/:cvId/photo-url` endpoint
-- issues a short-lived signed URL after checking visibility / unlock.
--
-- Existing photos in `profile-avatars` remain readable until a backfill job
-- moves them (tracked in docs/uploads.md follow-up).
--
-- Hosted Supabase: do not COMMENT ON storage.buckets/objects or DROP POLICY
-- (owned by supabase_storage_admin). Bucket row upsert + RESTRICTIVE denies
-- below are migration-safe.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-photos',
  'cv-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Default-deny with no permissive policies; add RESTRICTIVE denies so client
-- roles cannot read/write even if a permissive policy is added later.
do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'cv-photos: lockdown deny client access'
  ) then
    execute $sql$
      create policy "cv-photos: lockdown deny client access"
      on storage.objects
      as restrictive
      for all
      to public
      using (bucket_id = 'cv-photos' and false)
      with check (bucket_id = 'cv-photos' and false)
    $sql$;
  end if;
end
$policy$;
