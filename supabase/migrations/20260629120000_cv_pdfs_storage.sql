-- Private bucket for pre-rendered CV PDF exports (Playwright output).
-- Reads via Nest service role only; same visibility rules as CV aggregate.
--
-- Apply during low traffic (pause API or run off-peak). Do not run this file in
-- parallel with other migrations or a second SQL editor tab — DDL on cvs +
-- storage.objects can deadlock with live CV/storage traffic.
--
-- Lock order: public.cvs first, then storage (avoids circular waits with app).

alter table public.cvs
  add column if not exists pdf_storage_path text,
  add column if not exists pdf_content_hash text,
  add column if not exists pdf_generated_at timestamptz,
  add column if not exists pdf_generation_status text not null default 'pending';

comment on column public.cvs.pdf_storage_path is
  'Object path in cv-pdfs bucket, e.g. {user_id}/{cv_id}/latest.pdf';
comment on column public.cvs.pdf_content_hash is
  'SHA-256 of canonical CV export payload; used to skip redundant renders.';
comment on column public.cvs.pdf_generation_status is
  'pending | ready | failed — pre-rendered employer/candidate PDF export.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-pdfs',
  'cv-pdfs',
  false,
  15728640,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'cv-pdfs: lockdown deny client access'
  ) then
    execute $sql$
      create policy "cv-pdfs: lockdown deny client access"
      on storage.objects
      as restrictive
      for all
      to public
      using (bucket_id = 'cv-pdfs' and false)
      with check (bucket_id = 'cv-pdfs' and false)
    $sql$;
  end if;
end
$policy$;
