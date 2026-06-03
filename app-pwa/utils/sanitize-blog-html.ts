import { sanitizeForDisplayFromApi } from '~/utils/sanitize-display-html'

const BLOG_ALLOWED_TAGS = [
  'p',
  'h2',
  'h3',
  'h4',
  'div',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'u',
  'strike',
  's',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'a',
  'img',
  'pre',
  'code',
] as const

const BLOG_ALLOWED_ATTR = ['id', 'href', 'src', 'alt', 'width', 'height', 'loading', 'class'] as const

const BLOG_ALLOWED_DIV_CLASSES = new Set(['highlight-box'])

const BLOG_STORAGE_BUCKETS = '(blog-content|blog-covers)'

const SUPABASE_CLOUD_PATTERN = new RegExp(
  `^https://[a-z0-9.-]+\\.supabase\\.co/storage/v1/object/public/${BLOG_STORAGE_BUCKETS}/`,
  'i',
)

const LOCAL_SUPABASE_PATTERN = new RegExp(
  `^https?://(127\\.0\\.0\\.1|localhost)(:\\d+)?/storage/v1/object/public/${BLOG_STORAGE_BUCKETS}/`,
  'i',
)

function projectHostPattern(): RegExp | null {
  const raw = (process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim()
  if (!raw) return null
  try {
    const host = new URL(raw).host.replace(/\./g, '\\.')
    return new RegExp(
      `^https?://${host}/storage/v1/object/public/${BLOG_STORAGE_BUCKETS}/`,
      'i',
    )
  } catch {
    return null
  }
}

export function isTrustedBlogImageSrc(src: string | null | undefined): boolean {
  const raw = (src ?? '').trim()
  if (!raw || /^\s*javascript:/i.test(raw) || /^\s*data:/i.test(raw)) return false
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
    const href = url.href
    if (SUPABASE_CLOUD_PATTERN.test(href)) return true
    if (LOCAL_SUPABASE_PATTERN.test(href)) return true
    const projectPattern = projectHostPattern()
    return projectPattern?.test(href) ?? false
  } catch {
    return false
  }
}

function stripUntrustedImages(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag)
    const src = srcMatch?.[1] ?? srcMatch?.[2] ?? srcMatch?.[3] ?? ''
    return isTrustedBlogImageSrc(src) ? tag : ''
  })
}

function addLazyLoadingToImages(html: string): string {
  return html.replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async"')
}

function stripUnsafeDivClasses(html: string): string {
  return html.replace(
    /<div\b([^>]*)\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')([^>]*)>/gi,
    (full, before, classDouble, classSingle, after) => {
      const raw = classDouble ?? classSingle ?? ''
      const safe = raw
        .split(/\s+/)
        .filter((c) => BLOG_ALLOWED_DIV_CLASSES.has(c))
        .join(' ')
      if (!safe) return `<div${before}${after}>`
      return `<div${before} class="${safe}"${after}>`
    },
  )
}

function hardenBlogAnchors(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (_full, attrs: string) => {
    let next = attrs
    if (!/\brel\s*=/i.test(next)) {
      next += ' rel="noopener noreferrer"'
    }
    if (!/\btarget\s*=/i.test(next)) {
      next += ' target="_blank"'
    }
    return `<a${next}>`
  })
}

export function sanitizeBlogBodyForDisplay(raw: string | null | undefined): string {
  const base = sanitizeForDisplayFromApi(raw)
  if (!base) return ''
  return hardenBlogAnchors(
    addLazyLoadingToImages(stripUnsafeDivClasses(stripUntrustedImages(base))),
  )
}