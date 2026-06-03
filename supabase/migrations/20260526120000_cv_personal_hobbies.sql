-- Optional hobbies textarea for CV builder (separate from personal summary / about_me).
alter table public.cv_personal_info
  add column if not exists hobbies text;

comment on column public.cv_personal_info.hobbies is 'Free-text hobbies; shown when optional section enabled.';
