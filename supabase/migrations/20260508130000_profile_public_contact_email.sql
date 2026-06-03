-- Allow users to opt in to showing their login email on the public profile / firm detail.

alter table public.profiles
  add column if not exists public_show_account_email boolean not null default false;

comment on column public.profiles.public_show_account_email is
  'When true, GET /profiles/:id may include contact_email from auth.users for visitors.';
