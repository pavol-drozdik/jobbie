/** Public PWA base URL for deep links from admin tools (no trailing slash). */
export function getPwaPublicUrl(): string {
  const raw =
    process.env.PWA_PUBLIC_URL?.trim() ||
    process.env.JOBBIE_PUBLIC_URL?.trim() ||
    'https://jobbie.sk';
  return raw.replace(/\/$/, '');
}
