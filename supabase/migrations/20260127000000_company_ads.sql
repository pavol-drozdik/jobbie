-- Company / promo ads (Firmy): browsable listings; credits charged on publish (NestJS enforces business rules).

create table if not exists public.company_ads (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  thumbnail_url text,
  title text not null,
  body text not null,
  category text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'expired')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_ads_owner_id on public.company_ads(owner_id);
create index if not exists idx_company_ads_category on public.company_ads(category);
create index if not exists idx_company_ads_status_ends_at on public.company_ads(status, ends_at desc);

create trigger company_ads_updated_at
  before update on public.company_ads
  for each row execute function public.set_updated_at();

alter table public.company_ads enable row level security;

-- Browse: active, non-expired ads for everyone; owners see all their rows (drafts, expired).
create policy "company_ads_select_public_and_owner"
  on public.company_ads
  for select
  using (
    (status = 'active' and ends_at is not null and ends_at > now())
    or (auth.uid() is not null and owner_id = auth.uid())
  );

create policy "company_ads_insert_owner"
  on public.company_ads
  for insert
  with check (auth.uid() is not null and owner_id = auth.uid());

create policy "company_ads_update_owner"
  on public.company_ads
  for update
  using (auth.uid() is not null and owner_id = auth.uid());

create policy "company_ads_delete_owner"
  on public.company_ads
  for delete
  using (auth.uid() is not null and owner_id = auth.uid());

comment on table public.company_ads is 'Promotional company ads (Firmy); visibility periods and credits handled by API.';
