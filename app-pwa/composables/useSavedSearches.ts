export interface SavedSearchDto {
  id: string
  user_id: string
  name: string | null
  query_json: Record<string, unknown>
  notify_email: boolean
  last_notified_at: string | null
  created_at: string
  updated_at: string
}

const CV_ALERTS_SOURCE = 'cv_job_alerts' as const

export function useSavedSearches() {
  const config = useRuntimeConfig()
  const { session } = useAuth()
  const baseUrl = computed(() => String(config.public.apiBaseUrl || '').replace(/\/$/, ''))

  function authHeaders(): Record<string, string> {
    const token = session.value?.access_token
    if (!token) {
      return {}
    }
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  }

  async function listSavedSearches(): Promise<SavedSearchDto[]> {
    return await $fetch<SavedSearchDto[]>(`${baseUrl.value}/api/saved-searches`, {
      headers: authHeaders(),
    })
  }

  async function createSavedSearch(body: {
    name?: string
    query_json: Record<string, unknown>
    notify_email?: boolean
  }): Promise<SavedSearchDto> {
    return await $fetch<SavedSearchDto>(`${baseUrl.value}/api/saved-searches`, {
      method: 'POST',
      headers: authHeaders(),
      body,
    })
  }

  async function updateSavedSearch(
    id: string,
    body: { name?: string; query_json?: Record<string, unknown>; notify_email?: boolean },
  ): Promise<SavedSearchDto> {
    return await $fetch<SavedSearchDto>(`${baseUrl.value}/api/saved-searches/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body,
    })
  }

  async function ensureCvJobAlertsSearch(params: {
    desired_positions: string[]
    desired_locations: string[]
  }): Promise<void> {
    const list = await listSavedSearches()
    const tagged = list.find((s) => s.query_json?.source === CV_ALERTS_SOURCE)
    const query_json: Record<string, unknown> = {
      source: CV_ALERTS_SOURCE,
      desired_positions: params.desired_positions,
      desired_locations: params.desired_locations,
    }
    if (tagged) {
      await updateSavedSearch(tagged.id, { notify_email: true, query_json })
      return
    }
    await createSavedSearch({
      name: 'Oznámenia z životopisu',
      notify_email: true,
      query_json,
    })
  }

  return { listSavedSearches, createSavedSearch, updateSavedSearch, ensureCvJobAlertsSearch }
}
