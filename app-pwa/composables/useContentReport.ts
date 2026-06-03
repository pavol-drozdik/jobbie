export type ContentReportTargetType =
  | 'job_offer'
  | 'company_profile'
  | 'company_ad'
  | 'banner_ad'
  | 'company_review'
  | 'chat_message'

export function useContentReport() {
  const { api } = useApi()
  const reporting = ref(false)
  const error = ref<string | null>(null)

  async function submitReport(input: {
    target_type: ContentReportTargetType
    target_id: string
    reason: string
  }): Promise<boolean> {
    reporting.value = true
    error.value = null
    try {
      const res = await api('/api/reports', {
        method: 'POST',
        body: input,
      })
      if (!res.ok) {
        error.value = 'Nepodarilo sa odoslať nahlásenie.'
        return false
      }
      return true
    } catch {
      error.value = 'Nepodarilo sa odoslať nahlásenie.'
      return false
    } finally {
      reporting.value = false
    }
  }

  return { submitReport, reporting, error }
}
