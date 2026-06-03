/** Fallback when API does not return public_url; production default. */
export const DEFAULT_PWA_PUBLIC_URL = 'https://jobbie.sk'

export function buildJobPublicUrl(jobId: string, base = DEFAULT_PWA_PUBLIC_URL): string {
  return `${base.replace(/\/$/, '')}/app/jobs/${jobId}`
}

export function buildProfilePublicUrl(userId: string, base = DEFAULT_PWA_PUBLIC_URL): string {
  return `${base.replace(/\/$/, '')}/profil/${userId}`
}

export function buildBlogPublicUrl(slug: string, base = DEFAULT_PWA_PUBLIC_URL): string {
  return `${base.replace(/\/$/, '')}/blog/${slug}`
}

export function buildProfessionalAdUrl(adId: string, base = DEFAULT_PWA_PUBLIC_URL): string {
  return `${base.replace(/\/$/, '')}/profesionali/${adId}`
}
