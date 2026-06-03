const BLOG_STORAGE_BUCKETS = '(blog-content|blog-covers)';

const SUPABASE_CLOUD_PATTERN = new RegExp(
  `^https://[a-z0-9.-]+\\.supabase\\.co/storage/v1/object/public/${BLOG_STORAGE_BUCKETS}/`,
  'i',
);

const LOCAL_SUPABASE_PATTERN = new RegExp(
  `^https?://(127\\.0\\.0\\.1|localhost)(:\\d+)?/storage/v1/object/public/${BLOG_STORAGE_BUCKETS}/`,
  'i',
);

function projectHostPattern(): RegExp | null {
  const raw = process.env.SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).host.replace(/\./g, '\\.');
    return new RegExp(
      `^https?://${host}/storage/v1/object/public/${BLOG_STORAGE_BUCKETS}/`,
      'i',
    );
  } catch {
    return null;
  }
}

export function isTrustedBlogImageSrc(src: string | null | undefined): boolean {
  const raw = (src ?? '').trim();
  if (!raw || /^\s*javascript:/i.test(raw) || /^\s*data:/i.test(raw)) return false;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    const href = url.href;
    if (SUPABASE_CLOUD_PATTERN.test(href)) return true;
    if (LOCAL_SUPABASE_PATTERN.test(href)) return true;
    const projectPattern = projectHostPattern();
    return projectPattern?.test(href) ?? false;
  } catch {
    return false;
  }
}
