-- profile_reviews: writes only via Nest API (Supabase service role). RLS on; no policies for authenticated/anon.
-- notification_preferences: JSON flags for in-app notification preferences (push deferred).

create table if not exists public.profile_reviews (
  id uuid primary key default gen_random_uuid(),
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint profile_reviews_reviewer_reviewee_unique unique (reviewer_id, reviewee_id),
  constraint profile_reviews_no_self check (reviewer_id <> reviewee_id)
);

create index if not exists idx_profile_reviews_reviewee on public.profile_reviews(reviewee_id);
create index if not exists idx_profile_reviews_reviewer on public.profile_reviews(reviewer_id);

alter table public.profile_reviews enable row level security;

comment on table public.profile_reviews is 'User-to-user profile reviews; backend-only writes via service role.';

alter table public.profiles
  add column if not exists notification_preferences jsonb not null default '{"new_applications": true, "messages": true, "reviews": true}'::jsonb;

comment on column public.profiles.notification_preferences is 'Boolean flags: new_applications, messages, reviews (in-app; push not implemented yet).';
