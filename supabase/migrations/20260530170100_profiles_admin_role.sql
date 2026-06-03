-- Desktop admin RBAC: null = legacy super_admin for app_role=admin.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type public.admin_role as enum ('super_admin', 'moderator', 'analyst');
  end if;
end $$;

alter table public.profiles
  add column if not exists admin_role public.admin_role;

comment on column public.profiles.admin_role is
  'Desktop admin scope: analyst (read), moderator (+moderation), super_admin (all). Null + app_role=admin => super_admin.';
