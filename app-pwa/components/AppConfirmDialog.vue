<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-0 font-dmSans antialiased sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="describedBy"
      @click.self="onBackdrop"
    >
      <div
        class="w-full max-w-md rounded-t-2xl border border-black/10 bg-white px-6 py-8 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] sm:rounded-2xl sm:px-10 sm:py-9"
        @click.stop
      >
        <div class="mx-auto max-w-[22rem] text-center">
          <h2
            :id="titleId"
            class="m-0 text-xl font-extrabold leading-snug text-black sm:text-[1.35rem]"
          >
            {{ title }}
          </h2>
          <p
            v-if="message"
            :id="messageId"
            class="m-0 mt-4 text-[17px] leading-snug"
            :class="variant === 'alert' ? 'font-medium text-black/75' : 'font-semibold text-black/90'"
          >
            {{ message }}
          </p>
          <p
            v-if="detail"
            :id="detailId"
            class="m-0 mt-4 border-t border-black/10 pt-4 text-[15px] leading-relaxed text-black/55"
          >
            {{ detail }}
          </p>
        </div>

        <div
          class="mt-8 flex flex-col-reverse items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center"
        >
          <template v-if="variant === 'confirm'">
            <button
              type="button"
              class="inline-flex h-11 min-h-11 flex-1 is-clickable items-center justify-center rounded-full border border-black/15 bg-white px-5 text-[15px] font-semibold text-black/75 hover:bg-neutral-50 sm:flex-initial sm:min-w-[7.5rem]"
              @click="onCancel"
            >
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              class="inline-flex h-11 min-h-11 flex-1 is-clickable items-center justify-center rounded-full px-5 text-[15px] font-semibold text-white hover:opacity-90 sm:flex-initial sm:min-w-[7.5rem]"
              :class="confirmBtnClass"
              @click="onConfirm"
            >
              {{ confirmLabel }}
            </button>
          </template>
          <button
            v-else
            type="button"
            class="mx-auto inline-flex h-11 min-h-11 w-full max-w-xs is-clickable items-center justify-center rounded-full bg-marketing-green px-8 text-[15px] font-semibold text-white hover:opacity-90 sm:w-auto"
            @click="onConfirm"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    variant?: 'alert' | 'confirm'
    title: string
    message?: string
    /** Doplnkové vysvetlenie (napr. nezvratnosť akcie). */
    detail?: string
    confirmText?: string
    cancelText?: string
    /** Destructive primary action (e.g. delete). */
    confirmDanger?: boolean
  }>(),
  {
    variant: 'alert',
    message: '',
    detail: '',
    confirmText: '',
    cancelText: '',
    confirmDanger: false,
  },
)

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const titleId = useId()
const messageId = useId()
const detailId = useId()

const describedBy = computed(() => {
  const ids: string[] = []
  if (props.message) ids.push(messageId)
  if (props.detail) ids.push(detailId)
  return ids.length ? ids.join(' ') : undefined
})

const confirmBtnClass = computed(() =>
  props.confirmDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-marketing-green',
)

const confirmLabel = computed(() => {
  if (props.confirmText) return props.confirmText
  return props.variant === 'alert' ? S.dialogOk : S.dialogConfirm
})

const cancelLabel = computed(() => (props.cancelText ? props.cancelText : S.cancel))

function close(): void {
  open.value = false
}

function onConfirm(): void {
  emit('confirm')
  close()
}

function onCancel(): void {
  emit('cancel')
  close()
}

function onBackdrop(): void {
  if (props.variant === 'confirm') {
    onCancel()
  } else {
    close()
  }
}
</script>
