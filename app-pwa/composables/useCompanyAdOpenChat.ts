import { ROUTES } from '~/utils/app-routes'

export type CompanyAdOpenChatResult = { room_id: string }

export function useCompanyAdOpenChat() {
  const { api } = useApi()

  async function postOpenChat(companyAdId: string): Promise<{
    ok: boolean
    data?: CompanyAdOpenChatResult
    error?: string
  }> {
    const res = await api<CompanyAdOpenChatResult>(
      `/api/company-ads/${encodeURIComponent(companyAdId)}/open-chat`,
      { method: 'POST', body: {} },
    )
    if (!res.ok) {
      const msg =
        typeof res.error === 'string'
          ? res.error
          : (res.error as { message?: string } | undefined)?.message
      return { ok: false, error: msg ?? 'Chyba' }
    }
    if (!res.data?.room_id) {
      return { ok: false, error: 'Prázdna odpoveď' }
    }
    return { ok: true, data: res.data }
  }

  async function navigateToChatRoom(roomId: string): Promise<void> {
    await navigateTo(ROUTES.chatRoom(roomId))
  }

  return { postOpenChat, navigateToChatRoom }
}
