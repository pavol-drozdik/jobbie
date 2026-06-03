-- Marketing blog posts (public catalog; Nest service_role only for DML).

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  excerpt text,
  body_html text not null default '',
  cover_image_url text,
  category text not null default 'tipy'
    check (category in ('tipy', 'kariera', 'brigady', 'firmy', 'novinky')),
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  published_at timestamptz,
  reading_time_minutes int
    check (reading_time_minutes is null or (reading_time_minutes >= 1 and reading_time_minutes <= 120)),
  author_name text not null,
  author_role text,
  author_bio text,
  author_avatar_color text,
  tags text[] not null default '{}',
  seo_title text,
  seo_description text,
  is_featured boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_slug_unique unique (slug)
);

create index if not exists idx_blog_posts_published_list
  on public.blog_posts (published_at desc, id desc)
  where status = 'published';

create index if not exists idx_blog_posts_category_published
  on public.blog_posts (category, published_at desc, id desc)
  where status = 'published';

create index if not exists idx_blog_posts_featured
  on public.blog_posts (is_featured, published_at desc)
  where status = 'published' and is_featured = true;

comment on table public.blog_posts is 'Marketing blog; public read via Nest GET /api/blog; admin CRUD via jobbie-admin API.';
comment on column public.blog_posts.body_html is 'Sanitized HTML from Nest/admin before persist.';
comment on column public.blog_posts.published_at is 'Set when status becomes published; used for list ordering.';

alter table public.blog_posts enable row level security;

-- No policies for anon/authenticated — reads/writes via service_role (Nest) only.

grant select, insert, update, delete on table public.blog_posts to service_role;
