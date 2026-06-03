-- Backfill blog cover from first inline storage image when cover was never persisted.

update public.blog_posts bp
set cover_image_url = sub.src
from (
  select
    id,
    (regexp_match(
      body_html,
      'src="(https://[^"]+/storage/v1/object/public/(?:blog-content|blog-covers)/[^"]+)"'
    ))[1] as src
  from public.blog_posts
  where cover_image_url is null
    and body_html ~ 'storage/v1/object/public/(blog-content|blog-covers)/'
) sub
where bp.id = sub.id
  and sub.src is not null;

-- Backfill excerpt from plain body text when perex was left empty.

update public.blog_posts
set excerpt = trim(left(
  regexp_replace(
    regexp_replace(body_html, '<[^>]+>', ' ', 'g'),
    '\s+',
    ' ',
    'g'
  ),
  280
))
where (excerpt is null or btrim(excerpt) = '')
  and btrim(regexp_replace(regexp_replace(body_html, '<[^>]+>', ' ', 'g'), '\s+', ' ', 'g')) <> '';

comment on column public.blog_posts.excerpt is 'Perex for cards and post header; auto-derived from SEO/body on save when empty.';
