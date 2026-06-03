-- Scalability: list/catalog indexes for company ads, employer CV browse, applicants.
-- Follow-up: GIN/trgm on company_ads title/body when text search moves from API to SQL.

-- Public company ads catalog. Predicate cannot use now() (not IMMUTABLE).
-- API/view still filter ends_at > now(); this index covers status = active + sort.
create index if not exists idx_company_ads_active_list
  on public.company_ads (created_at desc)
  where status = 'active' and ends_at is not null;

-- Price filters on active listings (same partial predicate as list index)
create index if not exists idx_company_ads_price_range
  on public.company_ads (price_min, price_max)
  where status = 'active' and ends_at is not null;

-- Employer CV database: visible shells sorted by recency
create index if not exists idx_cvs_employer_visible_updated
  on public.cvs (updated_at desc)
  where visible_to_employers = true;

-- Employer applicants list per job
create index if not exists idx_applications_job_created
  on public.applications (job_id, created_at desc);
