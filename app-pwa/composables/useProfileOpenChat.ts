import { ROUTES } from '~/utils/app-routes'

export interface ProfileOpenChatApplication {
  id: string
  job_title: string | null
  status: string
}

export type ProfileOpenChatResult =
  | { room_id: string }
  | { applications: ProfileOpenChatApplication[] }

export function useProfileOpenChat() {
  const { api } = useApi()

  async function postOpenChat(
    profileId: string,
    opts?: { application_id?: string },
  ): Promise<{
    ok: boolean
    data?: ProfileOpenChatResult
    error?: string
  }> {
    const res = await api<ProfileOpenChatResult>(
      `/api/profiles/${encodeURIComponent(profileId)}/open-chat`,
      {
        method: 'POST',
        body: opts?.application_id ? { application_id: opts.application_id } : {},
      },
    )
    if (!res.ok) {
      const msg =
        typeof res.error === 'string'
          ? res.error
          : (res.error as { message?: string } | undefined)?.message
      return { ok: false, error: msg ?? 'Chyba' }
    }
    if (!res.data) {
      return { ok: false, error: 'Prázdna odpoveď' }
    }
    return { ok: true, data: res.data }
  }

  async function navigateToChatRoom(roomId: string): Promise<void> {
    await navigateTo(ROUTES.chatRoom(roomId))
  }

  return { postOpenChat, navigateToChatRoom }
}
