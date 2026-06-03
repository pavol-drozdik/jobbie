<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue'
import type { ChatDisplayMessage } from '~/types/chat'
import ChatFileAttachmentCard from '~/components/chat/ChatFileAttachmentCard.vue'
import AppIcon from '~/components/AppIcon.vue'
import { useSwipeToReply } from '~/composables/useSwipeToReply'
import { S } from '~/utils/strings'

type TextPart = { text: string; hit: boolean }

const props = defineProps<{
  msg: ChatDisplayMessage
  isMe: boolean
  avatarInitials: string
  avatarBg: string
  highlightNeedle: string
  showReadReceipt: boolean
  timeFormatted: string
  deletedQuoteLabel: string
  imageLightboxAria: string
  replyIconAriaLabel: string
  swipeReplyEnabled: boolean
  readReceiptLabel: string
}>()

const emit = defineEmits<{
  reply: []
  quoteClick: []
  imageClick: [url: string]
}>()

const isOptimisticRow = computed(() => props.msg.id.startsWith('optimistic:'))

const swipeReplyAllowed = computed(
  () => props.swipeReplyEnabled && !isOptimisticRow.value,
)

const { swipeTranslatePx, onSwipeTouchStart, onSwipeTouchMove, onSwipeTouchEnd, onSwipeTouchCancel } =
  useSwipeToReply(
    () => {
      emit('reply')
    },
    {
      enabled: swipeReplyAllowed,
    },
  )

const swipeStyle = computed(() => {
  const x = swipeTranslatePx.value
  if (x === 0) return {}
  return {
    transform: `translateX(${x}px)`,
    transition: 'none',
  }
})

function textHighlightParts(text: string, needle: string): TextPart[] {
  const n = needle.trim().toLowerCase()
  if (n.length < 2 || !text) return [{ text, hit: false }]
  const lower = text.toLowerCase()
  const out: TextPart[] = []
  let i = 0
  while (i < text.length) {
    const j = lower.indexOf(n, i)
    if (j === -1) {
      out.push({ text: text.slice(i), hit: false })
      break
    }
    if (j > i) out.push({ text: text.slice(i, j), hit: false })
    out.push({ text: text.slice(j, j + n.length), hit: true })
    i = j + n.length
  }
  return out.length ? out : [{ text, hit: false }]
}

function isReplyQuoteDeletedFn(msg: ChatDisplayMessage): boolean {
  const q = msg.reply_quote
  return q !== null && typeof q === 'object' && 'deleted' in q && q.deleted === true
}

function replyQuoteAuthor(msg: ChatDisplayMessage): string {
  const q = msg.reply_quote
  if (!q || 'deleted' in q) return ''
  return q.sender_name?.trim() || '…'
}

function replyQuoteSnippet(msg: ChatDisplayMessage): string {
  const q = msg.reply_quote
  if (!q || 'deleted' in q) return ''
  return q.snippet
}

function replyQuoteKind(msg: ChatDisplayMessage): 'text' | 'image' | 'file' {
  const q = msg.reply_quote
  if (!q || 'deleted' in q) return 'text'
  return q.kind
}

function replyQuoteImageUrl(msg: ChatDisplayMessage): string | null {
  const q = msg.reply_quote
  if (!q || 'deleted' in q) return null
  if (q.kind !== 'image') return null
  return q.imageUrl ?? null
}

/**
 * Image quotes use the thumbnail as the entire visual content; the
 * server-provided "[Fotka]" placeholder text would only repeat that.
 * Hide the snippet line for images so the preview matches Instagram DM
 * replies (thumbnail + sender, no placeholder text).
 */
function showQuoteSnippetText(msg: ChatDisplayMessage): boolean {
  const q = msg.reply_quote
  if (!q || 'deleted' in q) return false
  if (q.kind === 'image') return false
  return q.snippet.trim().length > 0
}

function isChatImageRow(msg: ChatDisplayMessage): boolean {
  return msg.plain.kind === 'image' && msg.plain.mime.startsWith('image/')
}

const rootEl = ref<HTMLElement | null>(null)
const hydrateMedia = inject<(messageId: string) => Promise<void>>(
  'chatHydrateMedia',
  async () => {},
)

const needsDeferredMedia = computed(() => {
  const plain = props.msg.plain
  if (plain.kind === 'image' && !props.msg.imageUrl && !plain.file_iv_b64) return true
  if (plain.kind === 'file' && !props.msg.fileUrl) return true
  return false
})

let mediaObserver: IntersectionObserver | null = null

onMounted(() => {
  if (!needsDeferredMedia.value) return
  const el = rootEl.value
  if (!el) {
    void hydrateMedia(props.msg.id)
    return
  }
  if (typeof IntersectionObserver === 'undefined') {
    void hydrateMedia(props.msg.id)
    return
  }
  mediaObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        mediaObserver?.disconnect()
        mediaObserver = null
        void hydrateMedia(props.msg.id)
      }
    },
    { rootMargin: '120px' },
  )
  mediaObserver.observe(el)
})

onUnmounted(() => {
  mediaObserver?.disconnect()
  mediaObserver = null
})
</script>

<template>
  <div
    ref="rootEl"
    :id="`m-${msg.id}`"
    class="flex items-end gap-2"
    :class="isMe ? 'flex-row-reverse' : ''"
  >
    <div
      class="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      :style="{ backgroundColor: avatarBg }"
    >
      {{ avatarInitials }}
    </div>
    <div class="group relative min-w-0 flex-1">
      <div class="relative min-w-0 flex-1 touch-pan-y">
        <div
          class="flex min-w-0 max-w-full w-fit items-center gap-3 max-[700px]:gap-2"
          :class="isMe ? 'ml-auto flex-row-reverse' : 'flex-row'"
        >
          <div
            class="touch-pan-y flex min-w-0 w-full max-w-[min(100%,calc(100vw-5.5rem))] flex-col sm:max-w-[min(100%,30rem)]"
            :style="swipeStyle"
            @touchstart.passive="onSwipeTouchStart"
            @touchmove="onSwipeTouchMove"
            @touchend="onSwipeTouchEnd"
            @touchcancel="onSwipeTouchCancel"
          >
            <div
              class="flex min-w-0 flex-col gap-1"
              :class="isMe ? 'items-end' : 'items-start'"
            >
              <div
                v-if="msg.reply_to_message_id && msg.reply_quote"
                class="embedded-quote-wrap w-full max-w-full"
              >
                <div
                  v-if="isReplyQuoteDeletedFn(msg)"
                  class="embedded-quote-block embedded-quote-block-deleted rounded-lg border-l-[3px] px-3 py-2 text-left"
                >
                  <p class="embedded-quote-deleted m-0 text-xs italic leading-snug">
                    {{ deletedQuoteLabel }}
                  </p>
                </div>
                <button
                  v-else
                  type="button"
                  class="embedded-quote-block flex w-full max-w-full items-center gap-2 rounded-lg border-l-[3px] px-3 py-2 text-left transition-colors"
                  @click="emit('quoteClick')"
                >
                  <div
                    v-if="replyQuoteKind(msg) === 'image'"
                    class="embedded-quote-thumb relative h-12 w-12 shrink-0 overflow-hidden rounded-md"
                  >
                    <img
                      v-if="replyQuoteImageUrl(msg)"
                      :src="replyQuoteImageUrl(msg)!"
                      alt=""
                      class="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    >
                    <div
                      v-else
                      class="embedded-quote-thumb-fallback flex h-full w-full items-center justify-center"
                      aria-hidden="true"
                    >
                      <AppIcon name="image" :size="18" />
                    </div>
                  </div>
                  <div
                    v-else-if="replyQuoteKind(msg) === 'file'"
                    class="embedded-quote-thumb-fallback flex h-12 w-12 shrink-0 items-center justify-center rounded-md"
                    aria-hidden="true"
                  >
                    <AppIcon name="paperclip" :size="18" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <span
                      class="embedded-quote-author block truncate text-xs font-semibold"
                      :class="showQuoteSnippetText(msg) ? 'mb-0.5' : ''"
                    >{{ replyQuoteAuthor(msg) }}</span>
                    <span
                      v-if="showQuoteSnippetText(msg)"
                      class="embedded-quote-snippet block truncate text-xs leading-snug"
                    >{{ replyQuoteSnippet(msg) }}</span>
                  </div>
                </button>
              </div>
              <div
                v-if="msg.plain?.kind === 'text'"
                class="max-w-full break-words px-4 py-3 text-base font-normal leading-normal max-[700px]:px-3 max-[700px]:py-2.5"
                :class="
                  isMe
                    ? 'rounded-[22px] rounded-br-[6px] bg-marketing-green text-white'
                    : 'rounded-[22px] rounded-bl-[6px] bg-white text-black shadow-[0_1px_4px_rgba(0,0,0,0.07)]'
                "
              >
                <p class="whitespace-pre-wrap break-words break-all">
                  <template
                    v-for="(part, pi) in textHighlightParts(msg.plain?.text ?? '', highlightNeedle)"
                    :key="`${msg.id}-${pi}`"
                  >
                    <mark
                      v-if="part.hit"
                      class="rounded-sm bg-amber-200/90 px-0.5 text-inherit"
                    >{{ part.text }}</mark>
                    <span v-else>{{ part.text }}</span>
                  </template>
                </p>
              </div>
              <template v-else-if="isChatImageRow(msg)">
                <button
                  v-if="msg.imageUrl"
                  type="button"
                  class="block max-w-full cursor-zoom-in overflow-hidden rounded-2xl border-0 bg-transparent p-0 shadow-[0_2px_12px_rgba(0,0,0,0.1)] ring-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green focus-visible:ring-offset-2"
                  :aria-label="imageLightboxAria"
                  @click="emit('imageClick', msg.imageUrl!)"
                >
                  <img
                    :src="msg.imageUrl"
                    alt=""
                    class="block max-h-[min(50vh,380px)] w-auto max-w-full bg-transparent object-contain"
                    loading="lazy"
                    decoding="async"
                  >
                </button>
                <p
                  v-else-if="msg.mediaUnavailable"
                  class="text-sm text-black/45"
                  role="status"
                >
                  {{ S.chatMediaUnavailable }}
                </p>
                <p v-else class="text-sm text-black/45">{{ S.loading }}</p>
              </template>
              <template v-else-if="msg.plain?.kind === 'file'">
                <ChatFileAttachmentCard
                  v-if="msg.fileUrl && msg.plain.kind === 'file'"
                  :signed-url="msg.fileUrl"
                  :file-name="msg.plain.original_name"
                  :file-size-bytes="msg.plain.size"
                  :mime="msg.plain.mime"
                />
                <p
                  v-else-if="msg.mediaUnavailable"
                  class="text-sm text-black/45"
                  role="status"
                >
                  {{ S.chatMediaUnavailable }}
                </p>
                <p v-else class="text-sm text-black/45">{{ S.loading }}</p>
              </template>
            </div>
            <div
              class="mt-0.5 w-full px-1 text-xs text-black/30"
              :class="isMe ? 'text-right' : 'text-left'"
            >
              {{ timeFormatted }}
              <span
                v-if="isMe && showReadReceipt"
                class="ml-1 text-[11px] text-black/40"
              >· {{ readReceiptLabel }}</span>
            </div>
          </div>
          <button
            v-if="!isOptimisticRow"
            type="button"
            class="pointer-events-auto flex size-8 shrink-0 items-center justify-center rounded-full text-black/35 opacity-0 transition-opacity duration-150 hover:bg-black/[0.06] hover:text-marketing-green group-hover:opacity-100 max-[700px]:opacity-[0.55]"
            :aria-label="replyIconAriaLabel"
            @click="emit('reply')"
          >
            <AppIcon name="reply" :size="18" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * Embedded reply quote (the "replied-to" preview shown above the actual
 * message content) must NOT inherit sender bubble colors. Always render as
 * a compact light-gray block with dark text — both for incoming and outgoing
 * messages — to match Instagram-style reply previews.
 */
.embedded-quote-wrap {
  margin-bottom: 4px;
}

.embedded-quote-block {
  background-color: #f1f1f1 !important;
  border-color: #0095f6 !important;
}

.embedded-quote-block-deleted {
  background-color: #f1f1f1 !important;
  border-color: rgba(0, 0, 0, 0.12) !important;
}

.embedded-quote-author {
  color: #0e1c12 !important;
}

.embedded-quote-snippet {
  color: #3d5444 !important;
}

.embedded-quote-deleted {
  color: rgba(14, 28, 18, 0.55) !important;
}

.embedded-quote-thumb {
  background-color: #e5e8e2 !important;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}

.embedded-quote-thumb-fallback {
  background-color: #e5e8e2 !important;
  color: #3d5444 !important;
}
</style>
