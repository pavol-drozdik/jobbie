<template>
  <div
    class="chat-page-root mt-[30px] flex min-h-0 flex-1 flex-col bg-marketing-mint px-0 pb-3 pt-0 max-[700px]:min-h-0 max-[700px]:flex-none max-[700px]:px-[10px] min-[701px]:-mx-3 min-[701px]:mt-0 min-[701px]:min-h-[calc(100dvh-5.5rem)] min-[701px]:flex-1"
  >
    <div
      class="relative flex w-full min-h-0 flex-col overflow-hidden bg-white max-[700px]:mt-0 max-[700px]:h-[calc(100dvh-0.625rem-3.5rem-max(0.25rem,env(safe-area-inset-top,0px)))] max-[700px]:max-h-[calc(100dvh-0.625rem-3.5rem-max(0.25rem,env(safe-area-inset-top,0px)))] max-[700px]:max-w-none max-[700px]:shrink-0 max-[700px]:flex-none max-[700px]:rounded-[20px] min-[701px]:mx-auto min-[701px]:mt-[30px] min-[701px]:flex-1 min-[701px]:max-h-[calc(100dvh-6rem)] min-[701px]:max-w-[1400px] min-[701px]:min-h-[calc(100dvh-6rem)] min-[701px]:flex-row min-[701px]:rounded-[20px]"
    >
      <div class="hidden min-h-0 min-[701px]:block min-[701px]:max-h-[calc(100dvh-6rem)]">
        <ChatRoomsSidebar
          class="max-h-[calc(100dvh-6rem)]"
          :rooms="rooms"
          :loading="roomsLoading"
          :active-room-id="roomId"
        />
      </div>
      <div
        class="relative flex min-h-0 w-full min-w-0 flex-col bg-[#ffffff] max-[700px]:min-h-0 max-[700px]:max-h-full max-[700px]:flex-1 max-[700px]:overflow-hidden min-[701px]:max-h-[calc(100dvh-6rem)] min-[701px]:flex-1 min-[701px]:border-l min-[701px]:border-black/[0.07]"
      >
        <div
          v-if="loading"
          class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/[0.93] backdrop-blur-[1px]"
          aria-busy="true"
          :aria-label="S.loading"
        >
          <span
            class="size-9 shrink-0 animate-spin rounded-full border-2 border-marketing-green border-t-transparent"
            aria-hidden="true"
          />
          <p class="m-0 text-sm font-medium text-black/40">{{ S.loading }}</p>
        </div>
        <div
          class="flex shrink-0 items-center gap-4 border-b border-black/[0.07] bg-white px-4 py-4 min-[701px]:px-7"
        >
          <NuxtLink
            :to="ROUTES.chat"
            class="flex size-9 shrink-0 items-center justify-center rounded-full text-lg text-black/70 hover:bg-black/5 min-[701px]:hidden"
            aria-label="Späť"
          >
            <AppIcon name="chevron-left" :size="22" />
          </NuxtLink>
          <div
            class="flex size-[50px] shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
            :style="{ backgroundColor: headerAvatarBg }"
          >
            {{ headerInitials }}
          </div>
          <div class="min-w-0 flex-1">
            <NuxtLink
              v-if="roomMeta"
              :to="ROUTES.publicProfile(roomMeta.other_user_id)"
              class="mb-1 block truncate text-[20px] font-bold text-black hover:underline"
            >
              {{ roomMeta.other_user_name || S.chatOpenProfile }}
            </NuxtLink>
            <span v-else class="mb-1 block text-[20px] font-bold text-black">{{ S.chat }}</span>
            <div
              v-if="jobTitleDisplay"
              class="inline-flex max-w-full items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-marketing-panel px-3 py-1 text-sm font-semibold text-marketing-green"
            >
              <AppIcon name="briefcase" :size="12" class="shrink-0 text-marketing-green" />
              <span class="truncate">{{ jobTitleDisplay }}</span>
            </div>
          </div>
          <button
            type="button"
            class="flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-black/10 p-2 text-black/60 transition-colors hover:bg-black/5 min-[701px]:rounded-lg min-[701px]:px-2.5 min-[701px]:py-1.5"
            :aria-expanded="showSearch"
            :aria-label="S.chatSearchAriaToggle"
            @click="showSearch = !showSearch"
          >
            <AppIcon name="search" :size="18" />
            <span class="hidden text-xs font-semibold min-[701px]:inline">{{ S.chatSearchResults }}</span>
          </button>
        </div>
        <div
          v-if="showSearch"
          class="flex shrink-0 flex-col gap-2 border-b border-black/[0.07] bg-white px-4 py-2 min-[701px]:px-7"
        >
          <div class="flex gap-2">
            <input
              v-model="threadSearchQ"
              type="search"
              class="addjob-input addjob-input--compact cv-field min-w-0 flex-1"
              :placeholder="S.chatSearchInMessagesPlaceholder"
              @keydown.enter="runThreadSearchImmediate"
            >
            <button
              type="button"
              class="shrink-0 rounded-full bg-marketing-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              :disabled="threadSearchSearching"
              @click="runThreadSearchImmediate"
            >
              {{ threadSearchSearching ? S.loading : S.chatSearchRun }}
            </button>
          </div>
          <p v-if="showSearchMinHint" class="text-xs text-black/45">{{ S.chatSearchMinCharsHint }}</p>
        </div>
        <div
          v-if="searchHits.length"
          class="max-h-32 shrink-0 overflow-y-auto border-b border-black/[0.07] bg-white px-4 py-2 text-sm min-[701px]:px-7"
        >
          <button
            v-for="h in searchHits"
            :key="h.id"
            type="button"
            class="block w-full truncate py-1 text-left hover:text-marketing-green"
            @click="scrollToMessage(h.id)"
          >
            {{ h.snippet }}
          </button>
        </div>
        <p
          v-else-if="showSearchNoHits"
          class="shrink-0 border-b border-black/[0.07] bg-white px-4 py-2 text-sm text-black/45 min-[701px]:px-7"
        >
          {{ S.chatSearchNoResults }}
        </p>
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden max-[700px]:basis-0">
          <div
            ref="scrollEl"
            class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-4 py-7 min-[701px]:px-7"
            @scroll="onMessagesScroll"
          >
            <div
              v-if="loadingOlderMessages && hasMoreOlderMessages && !showEmptyThreadIntro"
              class="flex shrink-0 justify-center py-2 text-sm font-medium text-black/50"
              aria-live="polite"
            >
              {{ S.loading }}
            </div>
            <div
              v-if="showEmptyThreadIntro"
              class="flex min-h-[min(45vh,280px)] flex-1 flex-col items-center justify-center gap-4 px-2 py-6 text-center"
              role="region"
              :aria-label="emptyThreadHeadline"
            >
              <div
                class="flex size-[72px] shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
                :style="{ backgroundColor: headerAvatarBg }"
              >
                {{ headerInitials }}
              </div>
              <div class="max-w-sm space-y-2">
                <p class="m-0 text-[19px] font-bold leading-snug text-black">{{ emptyThreadHeadline }}</p>
                <p class="m-0 text-[15px] font-normal leading-relaxed text-black/50">{{ emptyThreadSubline }}</p>
              </div>
              <div class="flex max-w-md flex-wrap justify-center gap-2">
                <button
                  v-for="(chip, ci) in emptyThreadChips"
                  :key="ci"
                  type="button"
                  class="rounded-full border border-black/12 bg-white px-4 py-2 text-sm font-semibold text-black/85 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-colors hover:border-marketing-green/40 hover:bg-marketing-mint disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="Boolean(sending)"
                  @click="sendEmptyThreadChip(chip.text)"
                >
                  {{ chip.text }}
                </button>
              </div>
            </div>
            <template v-for="(seg, idx) in visibleSegments" :key="seg.type === 'divider' ? `d-${idx}` : seg.msg.id">
              <div v-if="seg.type === 'divider'" class="msg-day-divider my-3 flex items-center gap-3">
                <span class="h-px flex-1 bg-black/10" />
                <span class="whitespace-nowrap text-[13px] font-medium text-black/35">{{ seg.label }}</span>
                <span class="h-px flex-1 bg-black/10" />
              </div>
              <ChatMessageBubble
                v-else
                :msg="seg.msg"
                :is-me="isMe(seg.msg)"
                :avatar-initials="bubbleInitials(seg.msg)"
                :avatar-bg="isMe(seg.msg) ? '#22c55e' : bubbleAvatarColor(seg.msg.sender_id)"
                :highlight-needle="highlightNeedle"
                :show-read-receipt="showReadReceiptFor(seg.msg)"
                :time-formatted="timeStr(seg.msg.created_at)"
                :deleted-quote-label="S.chatOriginalMessageDeleted"
                :image-lightbox-aria="S.chatImageLightboxAria"
                :reply-icon-aria-label="S.chatReplyAriaLabel"
                :swipe-reply-enabled="swipeReplyEnabled"
                :read-receipt-label="S.chatReadReceipt"
                @reply="startReplyTo(seg.msg)"
                @quote-click="onReplyQuoteClick(seg.msg)"
                @image-click="openImageLightbox"
              />
            </template>
            <div
              v-if="showTypingIndicator"
              class="flex w-full min-w-0 justify-start"
              :aria-label="S.typingLabel"
            >
              <div class="flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-3 text-black shadow-sm">
                <span class="typing-dots" aria-hidden="true">
                  <span class="typing-dot" />
                  <span class="typing-dot" />
                  <span class="typing-dot" />
                </span>
                <span class="text-xs text-black/50">{{ S.typingLabel }}</span>
              </div>
            </div>
          </div>
          <p
            v-if="attachError"
            class="shrink-0 border-b border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-800 min-[701px]:px-7"
            role="alert"
          >
            {{ attachError }}
          </p>
          <div
            v-if="pendingAttachment"
            class="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] bg-marketing-soft px-4 py-2.5 min-[701px]:px-7"
          >
            <div class="flex min-w-0 items-center gap-2 text-sm text-black/80">
              <AppIcon name="paperclip" :size="14" class="shrink-0 text-black/40" />
              <span class="truncate font-medium" :title="pendingAttachment.file.name">
                {{ S.chatPendingAttachmentLabel }}: {{ pendingAttachment.file.name }}
              </span>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-black/50 transition-colors hover:bg-black/5 hover:text-black disabled:opacity-40"
              :disabled="Boolean(sending)"
              :aria-label="S.chatPendingAttachmentRemove"
              @click="clearPendingAttachment"
            >
              ×
            </button>
          </div>
          <ChatReplyPreview
            v-if="replyDraft"
            :sender-label="replyDraft.senderLabel"
            :snippet="replyDraft.snippet"
            :kind="replyDraft.kind"
            :image-preview-url="replyDraft.imagePreviewUrl"
            @cancel="clearReplyDraft"
          />
          <div
            class="flex shrink-0 items-center gap-3 border-t border-black/[0.07] bg-white px-4 py-4 pb-5 min-[701px]:px-7"
          >
            <input
              ref="fileInputRef"
              type="file"
              :accept="CHAT_FILE_ACCEPT"
              class="sr-only"
              :disabled="sending"
              @change="onPickFile"
            >
            <button
              type="button"
              class="flex size-11 shrink-0 items-center justify-center text-black/30 transition-colors hover:text-marketing-green disabled:opacity-50"
              :aria-label="S.chatAttachFile"
              :disabled="Boolean(sending)"
              @click="openAttachMenu"
            >
              <AppIcon name="paperclip" :size="18" />
            </button>
            <div class="flex h-14 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-black/[0.06] bg-marketing-soft px-4">
              <input
                v-model="composerText"
                type="text"
                class="addjob-input addjob-input--inset cv-field min-w-0 flex-1"
                :placeholder="showEmptyThreadIntro ? S.chatFirstMessagePlaceholder : S.chatWriteMessage"
                :disabled="sending"
                @input="notifyTyping"
                @keydown="onComposerKeydown"
              >
            </div>
            <button
              type="button"
              class="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-marketing-green text-white transition-all hover:opacity-90 hover:scale-105 disabled:opacity-50"
              :disabled="Boolean(sending || !canSendMessage)"
              :aria-label="S.chatSend"
              @click="sendMessage"
            >
              <AppIcon name="send" :size="18" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <Teleport to="body">
    <div
      v-if="lightboxImageUrl"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 pb-4 pt-[90px]"
      role="dialog"
      aria-modal="true"
      :aria-label="S.chatImageLightboxAria"
      @click.self="closeImageLightbox"
    >
      <button
        type="button"
        class="absolute right-4 top-[calc(90px+0.5rem)] z-[1] flex size-10 items-center justify-center rounded-full bg-white/15 text-2xl leading-none text-white hover:bg-white/25"
        :aria-label="S.chatAttachmentCloseModal"
        @click="closeImageLightbox"
      >
        ×
      </button>
      <img
        :src="lightboxImageUrl"
        alt=""
        class="max-h-[calc(100dvh-90px-2rem)] max-w-[95vw] object-contain"
        @click.stop
      >
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Thin page shell — message send/receive/optimistic UI lives in useChatSocket.
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { validateImageUpload } from '~/utils/image-compression'
import {
  CHAT_FILE_ACCEPT,
  CHAT_MEDIA_MAX_BYTES,
  validateChatDocumentUpload,
  validateStorageUploadMetadata,
} from '~/utils/upload-policy'
import type {
  ChatRoomListItem,
  ChatDisplayMessage,
  ChatReplyComposerDraft,
} from '~/types/chat'
import { snippetFromChatPlain } from '~/types/chat'

definePageMeta({
  layout: 'app',
  middleware: ['auth'],
  ssr: false,
})

const route = useRoute()
const roomId = computed(() => route.params.roomId as string)
const { user, session } = useAuth()
const { api } = useApi()
const fileInputRef = ref<HTMLInputElement | null>(null)
const scrollEl = ref<HTMLElement | null>(null)
const roomMeta = ref<ChatRoomListItem | null>(null)
const {
  messages,
  send: sendSocket,
  sendImage,
  sendFile,
  typingPeers,
  notifyTyping,
  peerReadAt,
  loadMessagesAround,
  loadOlderMessages,
  hasMoreOlderMessages,
  loadingOlderMessages,
  ensureMessageMediaLoaded,
  syncRoomContentAfterJoin,
} = useChatSocket(roomId)

provide('chatHydrateMedia', ensureMessageMediaLoaded)

/** Max messages rendered in the thread DOM at once. */
const CHAT_RENDER_MESSAGE_MAX = 120
const renderMessageStart = ref(0)
const { rooms, loading: roomsLoading, refresh: refreshRooms } = useChatRooms()

const loading = ref(true)
const composerText = ref('')
const sending = ref(false)
const showSearch = ref(false)
const threadSearchQ = ref('')
const searchHits = ref<{ id: string; snippet: string }[]>([])
const threadSearchSearching = ref(false)
const threadSearchRan = ref(false)
const suppressScrollToBottom = ref(false)
let threadSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null
const attachError = ref('')
let attachErrorClearTimer: ReturnType<typeof setTimeout> | null = null
const pendingAttachment = ref<{ file: File; treatAsImage: boolean } | null>(null)
const lightboxImageUrl = ref<string | null>(null)
const replyDraft = ref<ChatReplyComposerDraft | null>(null)

const headerAvatarBg = computed(() => bubbleAvatarColor(roomMeta.value?.other_user_id ?? 'unknown'))

const jobTitleDisplay = computed(() => (roomMeta.value?.job_title ?? '').trim() || '')

const highlightNeedle = computed(() => {
  if (!showSearch.value) return ''
  const t = threadSearchQ.value.trim()
  return t.length >= 2 ? t : ''
})

const showSearchMinHint = computed(
  () => showSearch.value && threadSearchQ.value.trim().length === 1,
)

const showSearchNoHits = computed(
  () =>
    showSearch.value &&
    threadSearchRan.value &&
    !threadSearchSearching.value &&
    searchHits.value.length === 0 &&
    threadSearchQ.value.trim().length >= 2,
)

const PALETTE = ['#7c3aed', '#0ea5e9', '#f59e0b', '#ef4444', '#10b981', '#6366f1']

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function bubbleAvatarColor(uid: string): string {
  return PALETTE[hashStr(uid) % PALETTE.length]
}

function headerInitialsFn(): string {
  const m = roomMeta.value
  const n = (m?.other_user_name ?? '').trim()
  if (n.length > 0) {
    const p = n.split(/\s+/).filter(Boolean)
    if (p.length >= 2) return (p[0]![0]! + p[1]![0]!).toUpperCase()
    return n.slice(0, 2).toUpperCase()
  }
  return (m?.other_user_id ?? '??').replace(/-/g, '').slice(0, 2).toUpperCase()
}

const headerInitials = computed(() => headerInitialsFn())

function bubbleInitials(msg: ChatDisplayMessage): string {
  if (isMe(msg)) return 'Ja'
  return headerInitialsFn()
}

type Segment =
  | { type: 'divider'; label: string }
  | { type: 'msg'; msg: ChatDisplayMessage }

const swipeReplyEnabled = ref(false)
let swipeMediaCleanup: (() => void) | null = null

function dayDividerLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const today =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  if (today) return 'Dnes'
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  const yesterday =
    d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate()
  if (yesterday) return 'Včera'
  return d.toLocaleDateString('sk-SK', { weekday: 'long' })
}

const segments = computed<Segment[]>(() => {
  const out: Segment[] = []
  let lastDay = ''
  for (const msg of messages.value) {
    const day = new Date(msg.created_at).toDateString()
    if (day !== lastDay) {
      lastDay = day
      out.push({ type: 'divider', label: dayDividerLabel(msg.created_at) })
    }
    out.push({ type: 'msg', msg })
  }
  return out
})

const visibleMessages = computed(() => {
  const all = messages.value
  if (all.length <= CHAT_RENDER_MESSAGE_MAX) return all
  return all.slice(renderMessageStart.value)
})

const visibleSegments = computed<Segment[]>(() => {
  const out: Segment[] = []
  let lastDay = ''
  for (const msg of visibleMessages.value) {
    const day = new Date(msg.created_at).toDateString()
    if (day !== lastDay) {
      lastDay = day
      out.push({ type: 'divider', label: dayDividerLabel(msg.created_at) })
    }
    out.push({ type: 'msg', msg })
  }
  return out
})

watch(
  () => messages.value.length,
  (len, prevLen) => {
    if (len <= CHAT_RENDER_MESSAGE_MAX) {
      renderMessageStart.value = 0
      return
    }
    if (len > prevLen) {
      renderMessageStart.value = len - CHAT_RENDER_MESSAGE_MAX
    }
  },
)

const CHAT_SCROLL_LOAD_THRESHOLD_PX = 120
let loadOlderFromScroll = false

async function onLoadOlderMessages(): Promise<void> {
  const el = scrollEl.value
  const prevHeight = el?.scrollHeight ?? 0
  const prevStart = renderMessageStart.value
  await loadOlderMessages()
  renderMessageStart.value = Math.max(0, prevStart - 50)
  await nextTick()
  if (el) {
    el.scrollTop += el.scrollHeight - prevHeight
  }
}

/** Load older messages when the user scrolls near the top of the thread. */
function onMessagesScroll(): void {
  const el = scrollEl.value
  if (!el || loadingOlderMessages.value || !hasMoreOlderMessages.value || loadOlderFromScroll) {
    return
  }
  if (el.scrollTop > CHAT_SCROLL_LOAD_THRESHOLD_PX) {
    return
  }
  loadOlderFromScroll = true
  void onLoadOlderMessages().finally(() => {
    loadOlderFromScroll = false
  })
}

const effectivePeerRead = computed(() => peerReadAt.value || roomMeta.value?.peer_last_read_at || null)

const lastOwnMessage = computed(() => {
  const uid = user.value?.id
  if (!uid) return null
  for (let i = messages.value.length - 1; i >= 0; i -= 1) {
    const m = messages.value[i]!
    if (m.sender_id === uid) return m
  }
  return null
})

function showReadReceiptFor(msg: ChatDisplayMessage): boolean {
  const pr = effectivePeerRead.value
  const last = lastOwnMessage.value
  if (!pr || !last || msg.id !== last.id) return false
  return new Date(pr).getTime() >= new Date(msg.created_at).getTime()
}

const emptyThreadIsApplicant = computed(() => {
  const m = roomMeta.value
  const u = user.value
  if (!m || !u) return false
  return m.individual_id === u.id
})

const showEmptyThreadIntro = computed(() => {
  if (loading.value || !roomMeta.value || !user.value) return false
  return messages.value.length === 0
})

const otherPartyDisplayName = computed(() => (roomMeta.value?.other_user_name ?? '').trim())

const emptyThreadHeadline = computed(() => {
  const m = roomMeta.value
  if (!m) return ''
  if (!emptyThreadIsApplicant.value) {
    return S.chatEmptyThreadEmployerHeadline
  }
  const name = otherPartyDisplayName.value
  if (name.length > 0) {
    return S.chatEmptyThreadApplicantHeadlineWithName.replace('{name}', name)
  }
  return S.chatEmptyThreadApplicantHeadlineNoName
})

const emptyThreadSubline = computed(() =>
  emptyThreadIsApplicant.value ? S.chatEmptyThreadQuickReplySubline : S.chatEmptyThreadEmployerSubline,
)

const emptyThreadChips = computed((): { text: string }[] => {
  if (emptyThreadIsApplicant.value) {
    return [
      { text: S.chatEmptyThreadChipGreeting },
      { text: S.chatEmptyThreadChipInterest },
      { text: S.chatEmptyThreadChipAskDetails },
    ]
  }
  return [
    { text: S.chatEmptyThreadEmployerChipThanks },
    { text: S.chatEmptyThreadEmployerChipStart },
  ]
})

async function sendEmptyThreadChip(text: string): Promise<void> {
  const t = (text ?? '').trim()
  if (!t || sending.value) return
  sending.value = true
  try {
    await sendSocket(t)
    void refreshRooms({ quiet: true })
    scrollToBottom()
  } finally {
    sending.value = false
  }
}

const showTypingIndicator = computed(() => typingPeers.value.size > 0)

const canSendMessage = computed(
  () => (composerText.value ?? '').trim().length > 0 || pendingAttachment.value !== null,
)

function isMe(msg: { sender_id: string }) {
  return user.value?.id === msg.sender_id
}

function peerSenderLabel(msg: ChatDisplayMessage): string {
  if (isMe(msg)) return 'Ja'
  const n = (roomMeta.value?.other_user_name ?? '').trim()
  return n.length > 0 ? n : S.chatOpenProfile
}

function startReplyTo(msg: ChatDisplayMessage): void {
  if (msg.id.startsWith('optimistic:')) return
  const plain = msg.plain
  const kind =
    plain.kind === 'image' ? 'image'
    : plain.kind === 'file' ? 'file'
    : 'text'
  replyDraft.value = {
    targetId: msg.id,
    senderLabel: peerSenderLabel(msg),
    snippet: snippetFromChatPlain(msg.plain),
    kind,
    imagePreviewUrl: plain.kind === 'image' ? (msg.imageUrl ?? null) : null,
  }
}

function clearReplyDraft(): void {
  replyDraft.value = null
}

function onReplyQuoteClick(msg: ChatDisplayMessage): void {
  const pid = msg.reply_to_message_id
  const q = msg.reply_quote
  if (!pid || (q && typeof q === 'object' && 'deleted' in q && q.deleted)) return
  void scrollToMessage(pid)
}

function openImageLightbox(url: string): void {
  lightboxImageUrl.value = url
}

function closeImageLightbox(): void {
  lightboxImageUrl.value = null
}

watchEffect((onCleanup) => {
  if (!lightboxImageUrl.value) return
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return
    closeImageLightbox()
  }
  window.addEventListener('keydown', onKey)
  const prevOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  onCleanup(() => {
    window.removeEventListener('keydown', onKey)
    document.body.style.overflow = prevOverflow
  })
})

function timeStr(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
}

async function sendMessage() {
  if (sending.value) return
  const text = (composerText.value ?? '').trim()
  const pending = pendingAttachment.value
  if (!text && !pending) return
  const draftSnapshot = replyDraft.value
  const replyId = draftSnapshot?.targetId ?? null
  sending.value = true
  attachError.value = ''
  try {
    if (text) {
      const optimisticPreview =
        draftSnapshot && replyId
          ? {
              senderLabel: draftSnapshot.senderLabel,
              snippet: draftSnapshot.snippet,
              kind: draftSnapshot.kind,
              imagePreviewUrl: draftSnapshot.imagePreviewUrl,
            }
          : undefined
      const textOk = await sendSocket(text, replyId, optimisticPreview)
      if (!textOk) {
        return
      }
      composerText.value = ''
    }
    if (pending) {
      const result = pending.treatAsImage
        ? await sendImage(pending.file, replyId)
        : await sendFile(pending.file, replyId)
      if (!result.ok) {
        showAttachError(result.errorMessage)
        return
      }
      pendingAttachment.value = null
    }
    replyDraft.value = null
    void refreshRooms({ quiet: true })
    scrollToBottom()
  } finally {
    sending.value = false
  }
}

function onComposerKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Enter') return
  e.preventDefault()
  void sendMessage()
}

function openAttachMenu(): void {
  attachError.value = ''
  fileInputRef.value?.click()
}

function clearPendingAttachment(): void {
  pendingAttachment.value = null
}

function showAttachError(message: string): void {
  attachError.value = message
  if (attachErrorClearTimer !== null) {
    clearTimeout(attachErrorClearTimer)
  }
  attachErrorClearTimer = setTimeout(() => {
    attachError.value = ''
    attachErrorClearTimer = null
  }, 8000)
}

function onPickFile(e: Event): void {
  const inputEl = e.target as HTMLInputElement
  const file = inputEl.files?.[0]
  inputEl.value = ''
  if (!file || sending.value) return
  attachError.value = ''
  const isImage = file.type.startsWith('image/')
  const metaErr = validateStorageUploadMetadata(file, 'chat_media')
  if (metaErr) {
    attachError.value = metaErr
    return
  }
  if (isImage) {
    const err = validateImageUpload(file, { maxBytes: CHAT_MEDIA_MAX_BYTES })
    if (err) {
      attachError.value = err
      return
    }
  } else {
    const docErr = validateChatDocumentUpload(file)
    if (docErr) {
      attachError.value = docErr
      return
    }
  }
  pendingAttachment.value = {
    file,
    treatAsImage: isImage,
  }
}

async function loadRoomMeta(): Promise<void> {
  if (!session.value?.access_token || !roomId.value) {
    roomMeta.value = null
    return
  }
  const res = await api<ChatRoomListItem>(`/api/chat/rooms/${roomId.value}`)
  if (res.ok && res.data?.other_user_id) {
    roomMeta.value = res.data
  } else {
    roomMeta.value = null
  }
}

async function runRoomHydrate(): Promise<void> {
  loading.value = true
  lightboxImageUrl.value = null
  threadSearchQ.value = ''
  searchHits.value = []
  threadSearchRan.value = false
  showSearch.value = false
  attachError.value = ''
  if (attachErrorClearTimer !== null) {
    clearTimeout(attachErrorClearTimer)
    attachErrorClearTimer = null
  }
  pendingAttachment.value = null
  if (threadSearchDebounceTimer !== null) {
    clearTimeout(threadSearchDebounceTimer)
    threadSearchDebounceTimer = null
  }
  try {
    if (!session.value?.access_token || !roomId.value) {
      return
    }
    await loadRoomMeta()
    await syncRoomContentAfterJoin()
  } finally {
    loading.value = false
  }
}

async function runThreadSearch(): Promise<void> {
  const q = threadSearchQ.value.trim()
  if (q.length < 2 || !roomId.value) {
    searchHits.value = []
    threadSearchRan.value = true
    return
  }
  threadSearchSearching.value = true
  try {
    const res = await api<{ id: string; snippet: string; room_id: string }[]>('/api/chat/messages/search', {
      query: { q, room_id: roomId.value, limit: '20' },
    })
    if (res.ok && Array.isArray(res.data)) {
      searchHits.value = res.data
    } else {
      searchHits.value = []
    }
    threadSearchRan.value = true
  } finally {
    threadSearchSearching.value = false
  }
}

function runThreadSearchImmediate(): void {
  if (threadSearchDebounceTimer !== null) {
    clearTimeout(threadSearchDebounceTimer)
    threadSearchDebounceTimer = null
  }
  void runThreadSearch()
}

async function scrollToMessage(id: string): Promise<void> {
  const existing = document.getElementById(`m-${id}`)
  if (existing) {
    existing.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  suppressScrollToBottom.value = true
  const ok = await loadMessagesAround(id)
  await nextTick()
  suppressScrollToBottom.value = false
  if (ok) {
    await nextTick()
    document.getElementById(`m-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function scrollToBottom(): void {
  nextTick(() => {
    const el = scrollEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

watch(
  () => messages.value.length,
  () => {
    if (suppressScrollToBottom.value) return
    scrollToBottom()
  },
)

watch(threadSearchQ, () => {
  if (threadSearchDebounceTimer !== null) {
    clearTimeout(threadSearchDebounceTimer)
  }
  const t = threadSearchQ.value.trim()
  if (t.length < 2) {
    searchHits.value = []
    threadSearchRan.value = false
    return
  }
  threadSearchDebounceTimer = setTimeout(() => {
    threadSearchDebounceTimer = null
    void runThreadSearch()
  }, 320)
})

watch(roomId, () => {
  replyDraft.value = null
  void runRoomHydrate()
})

onMounted(async () => {
  if (import.meta.client) {
    const mq = window.matchMedia('(max-width: 700px)')
    const upd = (): void => {
      swipeReplyEnabled.value = mq.matches
    }
    upd()
    mq.addEventListener('change', upd)
    swipeMediaCleanup = () => mq.removeEventListener('change', upd)
  }
  await Promise.all([runRoomHydrate(), refreshRooms({ quiet: true })])
  scrollToBottom()
})

onUnmounted(() => {
  swipeMediaCleanup?.()
  swipeMediaCleanup = null
  if (attachErrorClearTimer !== null) {
    clearTimeout(attachErrorClearTimer)
    attachErrorClearTimer = null
  }
  pendingAttachment.value = null
  replyDraft.value = null
})
</script>

<style scoped>
.typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.35);
  display: inline-block;
  animation: typingBounce 1.2s infinite ease-in-out both;
}
.typing-dot:nth-child(1) {
  animation-delay: -0.32s;
}
.typing-dot:nth-child(2) {
  animation-delay: -0.16s;
}
@keyframes typingBounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  40% {
    transform: translateY(-4px);
    opacity: 1;
  }
}
</style>
