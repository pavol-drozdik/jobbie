-- Run this only if you already applied the initial schema with role 'student'.
-- It updates the role check to 'individual' and renames existing student rows.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('company', 'individual'));

update public.profiles set role = 'individual' where role = 'student';
