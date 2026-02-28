-- Create profile row when a new user signs up (auth.users insert).
-- Role comes from raw_user_meta_data.role (Flutter sends this on signUp); default 'individual'.
-- RLS is disabled for this insert because auth.uid() is not set yet during signup.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
begin
  set local row_security = off;
  user_role := coalesce(
    new.raw_user_meta_data->>'role',
    'individual'
  );
  if user_role not in ('company', 'individual') then
    user_role := 'individual';
  end if;
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    user_role,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
