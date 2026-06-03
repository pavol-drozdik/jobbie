-- Deprecate blog author/excerpt/tags in admin UI; keep columns for legacy rows.

alter table public.blog_posts
  alter column author_name drop not null;

alter table public.blog_posts
  alter column author_name set default 'Redakcia Jobbie';

alter table public.blog_posts
  alter column tags set default '{}';

comment on column public.blog_posts.author_name is 'Legacy; optional. Public site no longer surfaces author block.';
comment on column public.blog_posts.excerpt is 'Legacy; optional. List cards use title only.';
comment on column public.blog_posts.tags is 'Legacy; optional. Not shown on public blog.';
