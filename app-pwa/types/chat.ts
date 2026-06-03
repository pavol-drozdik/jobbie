/** Message body JSON stored/transmitted as UTF-8 (server encrypts at rest). */
export type ChatPlainEnvelopeV1 =
  | { v: 1; kind: 'text'; text: string }
  | {
      v: 1
      kind: 'image'
      storage_path: string
      mime: string
      size: number
      /** Legacy client-side encrypted blobs only */
      file_iv_b64?: string
    }
  | {
      v: 1
      kind: 'file'
      storage_path: string
      mime: string
      size: number
      original_name: string
    }

/** Server-provided quote preview for reply messages */
export type ChatMessageReplyQuote =
  | { deleted: true }
  | {
      sender_name: string | null
      snippet: string
      kind: 'text'
    }
  | {
      sender_name: string | null
      snippet: string
      kind: 'image'
      storage_path: string
      mime: string
      /** Hydrated client-side: signed URL for inline thumbnail */
      imageUrl?: string | null
    }
  | {
      sender_name: string | null
      snippet: string
      kind: 'file'
      storage_path: string
      mime: string
      original_name: string
    }

/** Hydrated payload + optional object URL for image rows */
export interface ChatDisplayMessage {
  id: string
  room_id: string
  sender_id: string
  content: string
  created_at: string
  plain: ChatPlainEnvelopeV1
  imageUrl?: string | null
  fileUrl?: string | null
  /** Set when signed media-url hydration failed (legacy or missing object). */
  mediaUnavailable?: boolean
  reply_to_message_id: string | null
  reply_quote: ChatMessageReplyQuote | null
}

/** Composer reply strip + optimistic send preview */
export type ChatReplyPreviewKind = 'text' | 'image' | 'file'

export interface ChatReplyComposerDraft {
  targetId: string
  senderLabel: string
  snippet: string
  kind: ChatReplyPreviewKind
  /** Signed URL for thumbnail when replying to an image */
  imagePreviewUrl?: string | null
}

/** Passed to `send()` optimistic branch (same fields minus target id) */
export type ChatOptimisticReplyPreview = Omit<ChatReplyComposerDraft, 'targetId'>

/** Room row from GET /api/chat/rooms or embedded in chat layout */
export interface ChatRoomListItem {
  id: string
  job_id: string
  company_id: string
  individual_id: string
  application_id: string | null
  created_at: string
  other_user_id: string
  other_user_name: string | null
  other_user_avatar_url: string | null
  application_status: string
  job_title?: string | null
  last_message_at?: string | null
  last_message_preview?: string | null
  unread_count?: number
  peer_last_read_at?: string | null
  /** Whether the other participant has a virtual CV (drives "Zobraziť životopis" CTA). */
  other_user_has_cv?: boolean
}

function parseEnvelopeJson(content: string): ChatPlainEnvelopeV1 | null {
  const s = typeof content === 'string' ? content.trim() : ''
  if (!s.startsWith('{')) return null
  try {
    const o = JSON.parse(content) as Record<string, unknown>
    if (o.v !== 1) return null
    if (o.kind === 'text' && typeof o.text === 'string') {
      return { v: 1, kind: 'text', text: o.text }
    }
    if (
      o.kind === 'image' &&
      typeof o.storage_path === 'string' &&
      typeof o.mime === 'string' &&
      typeof o.size === 'number'
    ) {
      if (typeof o.file_iv_b64 === 'string') {
        return {
          v: 1,
          kind: 'image',
          storage_path: o.storage_path,
          mime: o.mime,
          size: o.size,
          file_iv_b64: o.file_iv_b64,
        }
      }
      return {
        v: 1,
        kind: 'image',
        storage_path: o.storage_path,
        mime: o.mime,
        size: o.size,
      }
    }
    if (
      o.kind === 'file' &&
      typeof o.storage_path === 'string' &&
      typeof o.mime === 'string' &&
      typeof o.size === 'number' &&
      typeof o.original_name === 'string'
    ) {
      return {
        v: 1,
        kind: 'file',
        storage_path: o.storage_path,
        mime: o.mime,
        size: o.size,
        original_name: o.original_name,
      }
    }
    return null
  } catch {
    return null
  }
}

/** Short label for reply composer preview (matches server preview spirit). */
export function snippetFromChatPlain(plain: ChatPlainEnvelopeV1): string {
  if (plain.kind === 'text') {
    const t = plain.text.trim()
    return t.length > 120 ? `${t.slice(0, 120)}…` : t
  }
  if (plain.kind === 'image') return '[Fotka]'
  if (plain.kind === 'file') return plain.original_name?.trim() || '[Príloha]'
  return '[Správa]'
}

/** Turn API message `content` (plaintext JSON string or legacy raw text) into an envelope. */
export function parseMessageContentToEnvelope(content: string): ChatPlainEnvelopeV1 {
  const parsed = parseEnvelopeJson(content)
  if (parsed) return parsed
  const s = typeof content === 'string' ? content : ''
  return { v: 1, kind: 'text', text: s || '[Správa]' }
}
