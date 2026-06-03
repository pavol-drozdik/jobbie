import type {
  ChatDisplayMessage,
  ChatMessageReplyQuote,
  ChatOptimisticReplyPreview,
  ChatPlainEnvelopeV1,
} from '~/types/chat'
import { parseMessageContentToEnvelope } from '~/types/chat'
import { compressImageFileToJpeg } from '~/utils/image-compression'
import { CHAT_MEDIA_MAX_BYTES, validateChatDocumentUpload } from '~/utils/upload-policy'
import { S } from '~/utils/strings'
import { encodeKeysetCursor } from '~/utils/keyset-cursor'

type TypingEventPayload = { room_id: string; user_id: string }
type RoomReadPayload = { room_id: string; user_id: string; read_at: string }

const TYPING_IDLE_MS = 2000
/** Initial thread fetch — keeps DOM and hydration work bounded on room open. */
const CHAT_MESSAGES_INITIAL_LIMIT = 50
/** Page size when loading older messages above the current window. */
const CHAT_MESSAGES_OLDER_PAGE = 50

// Room socket: optimistic text rows, reply UUID normalization, media via Nest (validateChatDocumentUpload + compress).

/**
 * Canonical UUID for Nest `ChatMessageCreateDto` `@IsUUID()` / Postgres.
 * Returns '' for optimistic temp ids and invalid values (omit reply_to_message_id).
 */
function normalizeReplyToMessageIdForApi(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return ''
  const t = String(raw).trim()
  if (t.length === 0 || t.startsWith('optimistic:')) return ''
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) {
    return t.toLowerCase()
  }
  const compact = t.replace(/-/g, '')
  if (/^[0-9a-f]{32}$/i.test(compact)) {
    return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20, 32)}`.toLowerCase()
  }
  return ''
}

function normalizeChatMediaApiBase(raw: string | undefined): string {
  let base = (raw ?? '').trim()
  if (!base) {
    base = 'http://localhost:8000'
  }
  base = base.replace(/\/+$/, '')
  if (base.toLowerCase().endsWith('/api')) {
    base = base.replace(/\/api$/i, '')
  }
  return base
}

function resolveChatFileContentType(file: File): string {
  if (file.type && file.type.length > 0) return file.type
  const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : ''
  const byExt: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    zip: 'application/zip',
  }
  if (ext && byExt[ext]) return byExt[ext]!
  return 'application/octet-stream'
}

type RawMessage = {
  id: string
  room_id: string
  sender_id: string
  content: string
  created_at: string
  reply_to_message_id?: string | null
  reply_quote?: ChatMessageReplyQuote | null
}

function normalizeReplyQuote(raw: unknown): ChatMessageReplyQuote | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.deleted === true) return { deleted: true }
  if (typeof o.snippet !== 'string') return null
  const sn = o.sender_name
  const sender_name = sn === null || typeof sn === 'string' ? sn : null
  const snippet = o.snippet
  if (
    o.kind === 'image' &&
    typeof o.storage_path === 'string' &&
    typeof o.mime === 'string'
  ) {
    return {
      sender_name,
      snippet,
      kind: 'image',
      storage_path: o.storage_path,
      mime: o.mime,
      imageUrl: typeof o.imageUrl === 'string' ? o.imageUrl : null,
    }
  }
  if (
    o.kind === 'file' &&
    typeof o.storage_path === 'string' &&
    typeof o.mime === 'string'
  ) {
    return {
      sender_name,
      snippet,
      kind: 'file',
      storage_path: o.storage_path,
      mime: o.mime,
      original_name:
        typeof o.original_name === 'string' && o.original_name.length > 0
          ? o.original_name
          : snippet,
    }
  }
  return { sender_name, snippet, kind: 'text' }
}

export type ChatAttachSendResult = { ok: true } | { ok: false; errorMessage: string }

export function useChatSocket(roomIdRef: MaybeRefOrGetter<string>) {
  const { api } = useApi()
  const { session, user } = useAuth()
  const realtime = useRealtimeSocket()
  const configPublic = useRuntimeConfig().public
  const messages = ref<ChatDisplayMessage[]>([])
  const hasMoreOlderMessages = ref(false)
  const loadingOlderMessages = ref(false)
  const connected = realtime.connected
  const typingPeers = ref<Set<string>>(new Set())
  const peerReadAt = ref<string | null>(null)
  const currentRoomId = ref<string>('')
  /** Room id last joined on the Socket.IO server (for leave_room on navigate away). */
  const joinedSocketRoomId = ref<string>('')
  /**
   * Same message is emitted twice when a socket is in both `chat:<room>` and `user:<id>`
   * (see ChatGateway.emitMessageToRoom). Concurrent appendMessage runs pass the duplicate
   * check before hydrateMessage finishes — guard ids synchronously before awaiting.
   */
  const socketMessageInflightIds = new Set<string>()
  let typingIdleTimer: ReturnType<typeof setTimeout> | null = null
  let typingActive = false

  function resolveRoomId(): string {
    const v = typeof roomIdRef === 'function' ? roomIdRef() : toValue(roomIdRef)
    return typeof v === 'string' ? v : ''
  }

  async function fetchChatMediaDisplayUrl(
    roomId: string,
    envelope: ChatPlainEnvelopeV1 & { kind: 'image' | 'file' },
  ): Promise<string> {
    const pathParam = encodeURIComponent(envelope.storage_path)
    const res = await api<{ signedUrl?: string }>(
      `/api/chat/rooms/${encodeURIComponent(roomId)}/media-url?path=${pathParam}`,
    )
    if (res.ok && typeof res.data?.signedUrl === 'string' && res.data.signedUrl) {
      return res.data.signedUrl
    }
    const text = res.body
    let parsed: { signedUrl?: string }
    try {
      parsed = text ? (JSON.parse(text) as { signedUrl?: string }) : {}
    } catch {
      parsed = {}
    }
    if (!res.ok || typeof parsed.signedUrl !== 'string' || !parsed.signedUrl) {
      throw new Error('signed url failed')
    }
    return parsed.signedUrl
  }

  async function resolveQuoteImageUrl(
    roomId: string,
    quote: ChatMessageReplyQuote | null,
  ): Promise<ChatMessageReplyQuote | null> {
    if (!quote || 'deleted' in quote) return quote
    if (quote.kind !== 'image') return quote
    if (typeof quote.imageUrl === 'string' && quote.imageUrl.length > 0) return quote
    try {
      const imageUrl = await fetchChatMediaDisplayUrl(roomId, {
        v: 1,
        kind: 'image',
        storage_path: quote.storage_path,
        mime: quote.mime,
        size: 0,
      })
      return { ...quote, imageUrl }
    } catch {
      return { ...quote, imageUrl: null }
    }
  }

  async function hydrateMessage(
    m: RawMessage,
    options?: { deferMedia?: boolean },
  ): Promise<ChatDisplayMessage> {
    const plain = parseMessageContentToEnvelope(m.content)
    const reply_to_message_id =
      typeof m.reply_to_message_id === 'string' && m.reply_to_message_id.length > 0
        ? m.reply_to_message_id
        : null
    const rawQuote = normalizeReplyQuote(m.reply_quote)
    const reply_quote = await resolveQuoteImageUrl(m.room_id, rawQuote)
    const base: ChatDisplayMessage = {
      id: m.id,
      room_id: m.room_id,
      sender_id: m.sender_id,
      content: m.content,
      created_at: m.created_at,
      plain,
      reply_to_message_id,
      reply_quote,
    }
    if (plain.kind === 'text') return base
    if (options?.deferMedia && (plain.kind === 'image' || plain.kind === 'file') && !plain.file_iv_b64) {
      return base
    }
    if (plain.kind === 'image') {
      if (plain.file_iv_b64) {
        return {
          ...base,
          plain: {
            v: 1,
            kind: 'text',
            text: '[Obrázok zo starého šifrovania nie je dostupný.]',
          },
        }
      }
      try {
        const imageUrl = await fetchChatMediaDisplayUrl(m.room_id, plain)
        return { ...base, imageUrl }
      } catch {
        return {
          ...base,
          plain: { v: 1, kind: 'text', text: '[Obrázok sa nepodarilo načítať]' },
        }
      }
    }
    if (plain.kind === 'file') {
      try {
        const fileUrl = await fetchChatMediaDisplayUrl(m.room_id, plain)
        return { ...base, fileUrl }
      } catch {
        return {
          ...base,
          plain: {
            v: 1,
            kind: 'text',
            text: '[Prílohu sa nepodarilo načítať]',
          },
        }
      }
    }
    return base
  }

  /**
   * Defensive enrichment: if the server still returns the legacy reply_quote
   * shape (`{ sender_name, snippet }` => normalized to `kind: 'text'`) but the
   * parent message is locally known and is an image/file, rewrite the quote
   * with the parent's real envelope so the embedded preview renders the
   * thumbnail instead of the "[Fotka]" placeholder text.
   */
  function enrichReplyQuotesFromLocalParents(): void {
    if (messages.value.length === 0) return
    const byId = new Map<string, ChatDisplayMessage>()
    for (const m of messages.value) byId.set(m.id, m)
    let changed = false
    const next = messages.value.map((m) => {
      if (!m.reply_to_message_id) return m
      const q = m.reply_quote
      if (!q || 'deleted' in q) return m
      if (q.kind === 'image' || q.kind === 'file') return m
      const parent = byId.get(m.reply_to_message_id)
      if (!parent) return m
      const parentPlain = parent.plain
      if (parentPlain.kind === 'image') {
        changed = true
        return {
          ...m,
          reply_quote: {
            sender_name: q.sender_name,
            snippet: '',
            kind: 'image' as const,
            storage_path: parentPlain.storage_path,
            mime: parentPlain.mime,
            imageUrl: parent.imageUrl ?? null,
          },
        }
      }
      if (parentPlain.kind === 'file') {
        changed = true
        return {
          ...m,
          reply_quote: {
            sender_name: q.sender_name,
            snippet: parentPlain.original_name,
            kind: 'file' as const,
            storage_path: parentPlain.storage_path,
            mime: parentPlain.mime,
            original_name: parentPlain.original_name,
          },
        }
      }
      return m
    })
    if (changed) messages.value = next
  }

  async function loadMessages(): Promise<void> {
    const id = currentRoomId.value
    if (!id || !session.value?.access_token) return
    hasMoreOlderMessages.value = false
    const res = await api<RawMessage[]>(`/api/chat/rooms/${id}/messages`, {
      query: { limit: String(CHAT_MESSAGES_INITIAL_LIMIT) },
    })
    if (res.ok && Array.isArray(res.data)) {
      const rows = await Promise.all(
        res.data.map((m) => hydrateMessage(m, { deferMedia: true })),
      )
      messages.value = rows
      hasMoreOlderMessages.value = res.data.length >= CHAT_MESSAGES_INITIAL_LIMIT
      enrichReplyQuotesFromLocalParents()
    }
  }

  async function loadOlderMessages(): Promise<void> {
    const id = currentRoomId.value
    if (!id || !session.value?.access_token || loadingOlderMessages.value || !hasMoreOlderMessages.value) {
      return
    }
    loadingOlderMessages.value = true
    try {
      const oldest = messages.value[0]
      if (!oldest) {
        hasMoreOlderMessages.value = false
        return
      }
      const before = encodeKeysetCursor(oldest.created_at, oldest.id)
      const res = await api<RawMessage[]>(`/api/chat/rooms/${id}/messages`, {
        query: { limit: String(CHAT_MESSAGES_OLDER_PAGE), before },
      })
      if (!res.ok || !Array.isArray(res.data) || res.data.length === 0) {
        hasMoreOlderMessages.value = false
        return
      }
      const rows = await Promise.all(
        res.data.map((m) => hydrateMessage(m, { deferMedia: true })),
      )
      const existingIds = new Set(messages.value.map((m) => m.id))
      const older = rows.filter((m) => !existingIds.has(m.id))
      if (older.length === 0) {
        hasMoreOlderMessages.value = false
        return
      }
      messages.value = [...older, ...messages.value]
      hasMoreOlderMessages.value = res.data.length >= CHAT_MESSAGES_OLDER_PAGE
      enrichReplyQuotesFromLocalParents()
    } finally {
      loadingOlderMessages.value = false
    }
  }

  async function loadMessagesAround(anchorMessageId: string): Promise<boolean> {
    const id = currentRoomId.value
    if (!id || !session.value?.access_token) return false
    const res = await api<RawMessage[]>(`/api/chat/rooms/${id}/messages/around/${anchorMessageId}`, {
      query: { before: '60', after: '60' },
    })
    if (!res.ok || !Array.isArray(res.data)) return false
    if (import.meta.client) {
      for (const m of messages.value) {
        if (m.imageUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(m.imageUrl)
        }
        if (m.fileUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(m.fileUrl)
        }
      }
    }
    const rows = await Promise.all(res.data.map((m) => hydrateMessage(m)))
    messages.value = rows
    enrichReplyQuotesFromLocalParents()
    return true
  }

  const mediaHydrateInflight = new Set<string>()

  async function ensureMessageMediaLoaded(messageId: string): Promise<void> {
    if (mediaHydrateInflight.has(messageId)) return
    const idx = messages.value.findIndex((m) => m.id === messageId)
    if (idx === -1) return
    const msg = messages.value[idx]!
    const plain = msg.plain
    if (msg.imageUrl || msg.fileUrl) return
    if (plain.kind !== 'image' && plain.kind !== 'file') return
    if (plain.kind === 'image' && plain.file_iv_b64) return
    mediaHydrateInflight.add(messageId)
    try {
      const raw: RawMessage = {
        id: msg.id,
        room_id: msg.room_id,
        sender_id: msg.sender_id,
        content: msg.content,
        created_at: msg.created_at,
        reply_to_message_id: msg.reply_to_message_id,
        reply_quote: msg.reply_quote,
      }
      const hydrated = await hydrateMessage(raw)
      if (messages.value[idx]?.id === messageId) {
        messages.value[idx] = hydrated
        enrichReplyQuotesFromLocalParents()
      }
    } catch {
      if (messages.value[idx]?.id === messageId) {
        messages.value[idx] = { ...messages.value[idx]!, mediaUnavailable: true }
      }
    } finally {
      mediaHydrateInflight.delete(messageId)
    }
  }

  async function appendMessage(msg: RawMessage | null | undefined): Promise<void> {
    if (!msg || typeof msg.id !== 'string' || typeof msg.room_id !== 'string') return
    const rid = currentRoomId.value
    if (rid && msg.room_id !== rid) return
    const mid = msg.id
    if (messages.value.some((m) => m.id === mid)) return
    if (socketMessageInflightIds.has(mid)) return
    socketMessageInflightIds.add(mid)
    try {
      const hydrated = await hydrateMessage(msg)
      if (messages.value.some((m) => m.id === hydrated.id)) return
      /**
       * Promote optimistic placeholder for the sender's own message:
       * gateway emits to chat:<room> + user:<id>, and `send()` may also
       * reach POST ok concurrently. Replacing the optimistic row in place
       * keeps the array stable (no momentary duplicate row).
       */
      const selfId = user.value?.id
      if (selfId && hydrated.sender_id === selfId) {
        const optimisticIdx = messages.value.findIndex(
          (m) => m.id.startsWith('optimistic:') && m.content === hydrated.content,
        )
        if (optimisticIdx >= 0) {
          messages.value.splice(optimisticIdx, 1, hydrated)
          messages.value.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          )
          enrichReplyQuotesFromLocalParents()
          return
        }
      }
      messages.value = [...messages.value, hydrated]
      messages.value.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      enrichReplyQuotesFromLocalParents()
    } finally {
      socketMessageInflightIds.delete(mid)
    }
  }

  function handleSocketMessage(payload: unknown): void {
    void appendMessage(payload as RawMessage)
  }

  function handleRoomRead(payload: unknown): void {
    const p = payload as RoomReadPayload | null
    if (!p || p.room_id !== currentRoomId.value) return
    const selfId = user.value?.id
    if (!selfId || p.user_id === selfId) return
    peerReadAt.value = p.read_at
  }

  function setPeerTyping(userId: string, typing: boolean): void {
    const selfId = user.value?.id
    if (!userId || userId === selfId) return
    const next = new Set(typingPeers.value)
    if (typing) {
      next.add(userId)
    } else {
      next.delete(userId)
    }
    typingPeers.value = next
  }

  function handleTypingStart(payload: unknown): void {
    const p = payload as TypingEventPayload | null
    if (!p || p.room_id !== currentRoomId.value) return
    setPeerTyping(p.user_id, true)
  }

  function handleTypingStop(payload: unknown): void {
    const p = payload as TypingEventPayload | null
    if (!p || p.room_id !== currentRoomId.value) return
    setPeerTyping(p.user_id, false)
  }

  function handleVisibilityChange(): void {
    if (!import.meta.client) return
    if (document.visibilityState === 'visible') {
      void loadMessages()
    }
  }

  function sendTypingStop(): void {
    if (!typingActive) return
    typingActive = false
    if (typingIdleTimer !== null) {
      clearTimeout(typingIdleTimer)
      typingIdleTimer = null
    }
    const id = currentRoomId.value
    if (!id) return
    realtime.emit('typing_stop', { room_id: id })
  }

  function notifyTyping(): void {
    const id = currentRoomId.value
    if (!id) return
    if (!typingActive) {
      typingActive = true
      realtime.emit('typing_start', { room_id: id })
    }
    if (typingIdleTimer !== null) {
      clearTimeout(typingIdleTimer)
    }
    typingIdleTimer = setTimeout(sendTypingStop, TYPING_IDLE_MS)
  }

  function envelopeToPayload(envelope: ChatPlainEnvelopeV1): string {
    return JSON.stringify(envelope)
  }

  async function markRoomRead(): Promise<void> {
    const id = currentRoomId.value
    if (!id || !session.value?.access_token) return
    await api(`/api/chat/rooms/${id}/read`, { method: 'PATCH' })
  }

  const { uploadChatMedia } = useStorageUpload()

  async function uploadChatMediaThroughApi(
    roomId: string,
    file: File,
  ): Promise<
    | { ok: true; storage_path: string; mime: string; size: number; original_name: string }
    | { ok: false; errorMessage: string }
  > {
    try {
      const uploaded = await uploadChatMedia(roomId, file)
      return {
        ok: true,
        storage_path: uploaded.storage_path,
        mime: uploaded.mime,
        size: uploaded.size,
        original_name: uploaded.original_name,
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : S.chatAttachUploadFailed
      return { ok: false, errorMessage: msg || S.chatAttachUploadFailed }
    }
  }

  async function send(
    content: string,
    replyToMessageId?: string | null,
    optimisticReplyPreview?: ChatOptimisticReplyPreview | null,
  ): Promise<boolean> {
    const id = currentRoomId.value
    const text = (content ?? '').trim()
    if (!text || !id || !session.value?.access_token) return false
    const uid = user.value?.id
    if (!uid) return false
    sendTypingStop()
    const payload = envelopeToPayload({ v: 1, kind: 'text', text })
    const rid = normalizeReplyToMessageIdForApi(replyToMessageId)
    /**
     * Always insert an optimistic placeholder for text sends so the composer
     * feels instant. Replies additionally carry the local quote so the bubble
     * shows the embedded "replied-to" preview before the server hydrates.
     */
    const tempId = `optimistic:${crypto.randomUUID()}`
    let replyQuoteForOptimistic: ChatMessageReplyQuote | null = null
    if (rid.length > 0 && optimisticReplyPreview) {
      const previewKind = optimisticReplyPreview.kind ?? 'text'
      if (previewKind === 'image') {
        replyQuoteForOptimistic = {
          sender_name: optimisticReplyPreview.senderLabel,
          snippet: optimisticReplyPreview.snippet,
          kind: 'image',
          storage_path: '',
          mime: 'image/*',
          imageUrl: optimisticReplyPreview.imagePreviewUrl ?? null,
        }
      } else if (previewKind === 'file') {
        replyQuoteForOptimistic = {
          sender_name: optimisticReplyPreview.senderLabel,
          snippet: optimisticReplyPreview.snippet,
          kind: 'file',
          storage_path: '',
          mime: 'application/octet-stream',
          original_name: optimisticReplyPreview.snippet,
        }
      } else {
        replyQuoteForOptimistic = {
          sender_name: optimisticReplyPreview.senderLabel,
          snippet: optimisticReplyPreview.snippet,
          kind: 'text',
        }
      }
    }
    const optimisticRow: ChatDisplayMessage = {
      id: tempId,
      room_id: id,
      sender_id: uid,
      content: payload,
      created_at: new Date().toISOString(),
      plain: { v: 1, kind: 'text', text },
      reply_to_message_id: rid.length > 0 ? rid : null,
      reply_quote: replyQuoteForOptimistic,
    }
    messages.value = [...messages.value, optimisticRow]
    const body: Record<string, string> = {
      room_id: id,
      content: payload,
    }
    if (rid.length > 0) {
      body.reply_to_message_id = rid
    }
    const res = await api<RawMessage>('/api/chat/messages', {
      method: 'POST',
      body,
    })
    if (!res.ok || !res.data) {
      messages.value = messages.value.filter((m) => m.id !== tempId)
      return false
    }
    /**
     * Single source of truth (Option A): the socket echo from `emitMessageToRoom`
     * promotes the optimistic placeholder via `appendMessage`. If the echo has
     * not arrived yet we promote it here so the sender never sees a duplicate.
     */
    const optimisticIdx = messages.value.findIndex((m) => m.id === tempId)
    if (optimisticIdx >= 0) {
      const hydrated = await hydrateMessage(res.data)
      const existingRealIdx = messages.value.findIndex((m) => m.id === hydrated.id)
      if (existingRealIdx >= 0) {
        messages.value.splice(optimisticIdx, 1)
      } else {
        messages.value.splice(optimisticIdx, 1, hydrated)
        messages.value.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )
      }
      enrichReplyQuotesFromLocalParents()
    }
    return true
  }

  async function sendImage(
    file: File,
    replyToMessageId?: string | null,
  ): Promise<ChatAttachSendResult> {
    const id = currentRoomId.value
    if (!id || !session.value?.access_token) {
      return { ok: false, errorMessage: S.chatAttachUploadFailed }
    }
    sendTypingStop()
    let jpeg: File
    try {
      jpeg = await compressImageFileToJpeg(file)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('väčší')) {
        return { ok: false, errorMessage: msg }
      }
      return { ok: false, errorMessage: S.chatAttachImageUnsupported }
    }
    try {
      const uploaded = await uploadChatMediaThroughApi(id, jpeg)
      if (!uploaded.ok) {
        return { ok: false, errorMessage: uploaded.errorMessage }
      }
      void api('/api/analytics/storage-access', {
        method: 'POST',
        body: {
          bucket_id: 'chat-media',
          object_path: uploaded.storage_path,
          action: 'upload',
          bytes: uploaded.size,
        },
      })
      const envelope: ChatPlainEnvelopeV1 = {
        v: 1,
        kind: 'image',
        storage_path: uploaded.storage_path,
        mime: uploaded.mime,
        size: uploaded.size,
      }
      const body: Record<string, string> = {
        room_id: id,
        content: envelopeToPayload(envelope),
      }
      const rid = normalizeReplyToMessageIdForApi(replyToMessageId)
      if (rid.length > 0) {
        body.reply_to_message_id = rid
      }
      const res = await api<RawMessage>('/api/chat/messages', {
        method: 'POST',
        body,
      })
      if (res.ok && res.data) {
        // Single source of truth: socket echo from `emitMessageToRoom` will
        // insert the row via `appendMessage`. The id-dedup keeps it safe.
        return { ok: true }
      }
      return { ok: false, errorMessage: S.chatAttachMessageFailed }
    } catch (err) {
      const msg = err instanceof Error ? err.message.trim() : ''
      return { ok: false, errorMessage: msg || S.chatAttachUploadFailed }
    }
  }

  async function sendFile(
    file: File,
    replyToMessageId?: string | null,
  ): Promise<ChatAttachSendResult> {
    const id = currentRoomId.value
    if (!id || !session.value?.access_token) {
      return { ok: false, errorMessage: S.chatAttachUploadFailed }
    }
    if (file.size > CHAT_MEDIA_MAX_BYTES) {
      return { ok: false, errorMessage: S.chatAttachFileTooLarge }
    }
    const docValidation = validateChatDocumentUpload(file)
    if (docValidation) {
      return { ok: false, errorMessage: docValidation }
    }
    sendTypingStop()
    const fileForUpload =
      file.type && file.type.length > 0
        ? file
        : new File([file], file.name, { type: resolveChatFileContentType(file) })
    try {
      const uploaded = await uploadChatMediaThroughApi(id, fileForUpload)
      if (!uploaded.ok) {
        return { ok: false, errorMessage: uploaded.errorMessage }
      }
      void api('/api/analytics/storage-access', {
        method: 'POST',
        body: {
          bucket_id: 'chat-media',
          object_path: uploaded.storage_path,
          action: 'upload',
          bytes: uploaded.size,
        },
      })
      const envelope: ChatPlainEnvelopeV1 = {
        v: 1,
        kind: 'file',
        storage_path: uploaded.storage_path,
        mime: uploaded.mime,
        size: uploaded.size,
        original_name: uploaded.original_name,
      }
      const body: Record<string, string> = {
        room_id: id,
        content: envelopeToPayload(envelope),
      }
      const rid = normalizeReplyToMessageIdForApi(replyToMessageId)
      if (rid.length > 0) {
        body.reply_to_message_id = rid
      }
      const res = await api<RawMessage>('/api/chat/messages', {
        method: 'POST',
        body,
      })
      if (res.ok && res.data) {
        // Single source of truth: socket echo from `emitMessageToRoom` will
        // insert the row via `appendMessage`. The id-dedup keeps it safe.
        return { ok: true }
      }
      return { ok: false, errorMessage: S.chatAttachMessageFailed }
    } catch (err) {
      const msg = err instanceof Error ? err.message.trim() : ''
      return { ok: false, errorMessage: msg || S.chatAttachUploadFailed }
    }
  }

  function leaveJoinedSocketRoom(): void {
    const id = joinedSocketRoomId.value
    if (!id) return
    realtime.leaveRoom(id)
    joinedSocketRoomId.value = ''
  }

  function joinActiveRoom(): void {
    const id = currentRoomId.value
    if (!id || !session.value?.access_token) return
    if (joinedSocketRoomId.value && joinedSocketRoomId.value !== id) {
      realtime.leaveRoom(joinedSocketRoomId.value)
    }
    realtime.joinRoom(id)
    joinedSocketRoomId.value = id
  }

  function handleSocketConnect(): void {
    joinActiveRoom()
  }

  async function syncRoomContentAfterJoin(): Promise<void> {
    const id = currentRoomId.value
    if (!id || !session.value?.access_token) return
    await loadMessages()
    void markRoomRead()
  }

  if (import.meta.client) {
    watch(
      () => resolveRoomId(),
      (newId, prevId) => {
        if (!newId) {
          leaveJoinedSocketRoom()
          currentRoomId.value = ''
          return
        }
        if (newId !== prevId && prevId) {
          sendTypingStop()
          typingPeers.value = new Set()
          peerReadAt.value = null
          messages.value = []
          socketMessageInflightIds.clear()
          if (joinedSocketRoomId.value) {
            realtime.leaveRoom(joinedSocketRoomId.value)
            joinedSocketRoomId.value = ''
          }
        }
        currentRoomId.value = newId
        joinActiveRoom()
      },
      { immediate: true },
    )

    realtime.on('message', handleSocketMessage)
    realtime.on('typing_start', handleTypingStart)
    realtime.on('typing_stop', handleTypingStop)
    realtime.on('room_read', handleRoomRead)
    realtime.onConnected(handleSocketConnect)
    realtime.on('connect', handleSocketConnect)
  }

  onMounted(() => {
    if (!import.meta.client) return
    joinActiveRoom()
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    sendTypingStop()
    leaveJoinedSocketRoom()
    realtime.off('message', handleSocketMessage)
    realtime.off('typing_start', handleTypingStart)
    realtime.off('typing_stop', handleTypingStop)
    realtime.off('room_read', handleRoomRead)
    realtime.off('connect', handleSocketConnect)
    if (import.meta.client) {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      for (const m of messages.value) {
        if (m.imageUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(m.imageUrl)
        }
        if (m.fileUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(m.fileUrl)
        }
      }
    }
    typingPeers.value = new Set()
    currentRoomId.value = ''
    joinedSocketRoomId.value = ''
  })

  return {
    messages,
    connected,
    peerReadAt,
    loadMessages,
    loadOlderMessages,
    hasMoreOlderMessages,
    loadingOlderMessages,
    syncRoomContentAfterJoin,
    loadMessagesAround,
    ensureMessageMediaLoaded,
    markRoomRead,
    send,
    sendImage,
    sendFile,
    typingPeers,
    notifyTyping,
  }
}
