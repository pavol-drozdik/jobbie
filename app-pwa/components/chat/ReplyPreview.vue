<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { S } from '~/utils/strings'
import type { ChatReplyPreviewKind } from '~/types/chat'

const props = withDefaults(
  defineProps<{
    senderLabel: string
    snippet: string
    kind?: ChatReplyPreviewKind
    imagePreviewUrl?: string | null
  }>(),
  {
    kind: 'text',
    imagePreviewUrl: null,
  },
)

const emit = defineEmits<{
  cancel: []
}>()

function showTextSnippet(): boolean {
  if (props.kind === 'text') return true
  if (props.kind === 'file') return true
  if (props.kind === 'image' && !props.imagePreviewUrl) return true
  return false
}
</script>

<template>
  <div
    class="reply-preview-bar isolate flex shrink-0 items-start justify-between gap-2 border-b border-black/[0.06] bg-[#f8faf9] px-4 py-2.5 min-[701px]:px-7"
  >
    <div
      class="flex min-w-0 flex-1 items-start gap-2 border-l-[3px] border-[#0095f6] pl-3"
    >
      <div
        v-if="kind === 'image'"
        class="relative h-12 max-h-[48px] w-12 max-w-[48px] shrink-0 overflow-hidden rounded-md bg-[#e5e8e2] ring-1 ring-black/[0.06]"
      >
        <img
          v-if="imagePreviewUrl"
          :src="imagePreviewUrl"
          alt=""
          class="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        >
        <div
          v-else
          class="reply-preview-thumb-fallback flex h-full w-full items-center justify-center"
          aria-hidden="true"
        >
          <AppIcon name="image" :size="22" />
        </div>
      </div>
      <div
        v-else-if="kind === 'file'"
        class="reply-preview-thumb-fallback flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#e5e8e2] ring-1 ring-black/[0.06]"
        aria-hidden="true"
      >
        <AppIcon name="paperclip" :size="22" />
      </div>
      <div class="min-w-0 flex-1 py-0.5">
        <p
          class="reply-preview-sender m-0 text-xs font-semibold leading-tight"
        >
          {{ senderLabel }}
        </p>
        <p
          v-if="showTextSnippet()"
          class="reply-preview-snippet m-0 mt-0.5 truncate text-xs leading-snug"
        >
          {{ snippet }}
        </p>
      </div>
    </div>
    <button
      type="button"
      class="reply-preview-cancel shrink-0 rounded-lg px-2 py-1 text-xs font-semibold transition-colors hover:bg-black/5"
      :aria-label="S.chatReplyCancel"
      @click="emit('cancel')"
    >
      {{ S.chatReplyCancel }}
    </button>
  </div>
</template>

<style scoped>
/**
 * Force explicit, non-inherited dark text inside the reply preview bar so it
 * never picks up colors from chat bubble utilities (.message, .bubble, etc.)
 * or from any wrapping theme.
 */
.reply-preview-bar {
  color: #0e1c12;
}

.reply-preview-bar .reply-preview-sender {
  color: #0e1c12 !important;
}

.reply-preview-bar .reply-preview-snippet {
  color: #3d5444 !important;
}

.reply-preview-bar .reply-preview-cancel {
  color: #8a9e8f !important;
}

.reply-preview-bar .reply-preview-cancel:hover {
  color: #0e1c12 !important;
}

.reply-preview-bar .reply-preview-thumb-fallback {
  color: #3d5444 !important;
}
</style>
