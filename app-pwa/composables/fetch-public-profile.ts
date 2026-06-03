import type { ProfileDetailPayload } from '~/components/profile/PublicProfileCard.vue'

export type PublicProfileSeoPayload = {
  display_name: string | null
  company_name: string | null
  role: string
  bio: string | null
  description: string | null
}

/** Fetch full public profile detail for SSR and card hydration (optional auth). */
export async function fetchPublicProfileDetail(
  profileId: string,
): Promise<ProfileDetailPayload | null> {
  const config = useRuntimeConfig()
  const base = String(config.public.apiBaseUrl || '').replace(/\/+$/, '')
  if (!base || !profileId) return null
  try {
    return await $fetch<ProfileDetailPayload>(
      `${base}/api/profiles/${encodeURIComponent(profileId)}`,
    )
  } catch {
    return null
  }
}

/** Fetch public profile fields for SSR/SEO (optional auth). */
export async function fetchPublicProfile(profileId: string): Promise<PublicProfileSeoPayload | null> {
  const detail = await fetchPublicProfileDetail(profileId)
  return detail?.profile ?? null
}
