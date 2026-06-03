function plainTextFromHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncateExcerpt(text: string, maxLen = 280): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 120 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

export function resolveBlogExcerpt(row: {
  excerpt?: string | null;
  seo_description?: string | null;
  body_html?: string | null;
}): string | null {
  const explicit = plainTextFromHtml(row.excerpt ?? '');
  if (explicit) return explicit;
  const seo = plainTextFromHtml(row.seo_description ?? '');
  if (seo) return seo;
  const fromBody = plainTextFromHtml(row.body_html ?? '');
  if (!fromBody) return null;
  return truncateExcerpt(fromBody);
}
