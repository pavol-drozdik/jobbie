<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-0 font-dmSans antialiased sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-cancel-title"
      @click.self="onDismiss"
    >
      <div
        class="flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-black/10 bg-white shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] sm:rounded-2xl"
        @click.stop
      >
        <div class="overflow-y-auto px-6 py-7 sm:px-8">
          <h2
            id="subscription-cancel-title"
            class="m-0 text-xl font-extrabold leading-snug text-black sm:text-[1.35rem]"
          >
            {{ S.subscriptionCancelDialogTitle }}
          </h2>
          <p class="m-0 mt-2 text-[15px] leading-relaxed text-black/55">
            {{ S.subscriptionCancelDialogIntro }}
          </p>

          <fieldset class="m-0 mt-5 min-w-0 border-0 p-0">
            <legend class="mb-3 block text-sm font-semibold text-black">
              {{ S.subscriptionCancelReasonLegend }}
            </legend>
            <ul class="m-0 flex list-none flex-col gap-2 p-0">
              <li v-for="opt in reasonOptions" :key="opt.value">
                <button
                  type="button"
                  class="flex w-full is-clickable items-center gap-3 rounded-2xl border px-4 py-3 text-left text-[15px] font-semibold transition-colors"
                  :class="
                    reasonCode === opt.value
                      ? 'border-marketing-green bg-marketing-mint/50 text-black'
                      : 'border-black/10 bg-marketing-surface/60 text-black/75 hover:border-marketing-green/40'
                  "
                  @click="reasonCode = opt.value"
                >
                  <span
                    class="flex size-5 shrink-0 items-center justify-center rounded-full border-2"
                    :class="
                      reasonCode === opt.value
                        ? 'border-marketing-green bg-marketing-green'
                        : 'border-black/20 bg-white'
                    "
                    aria-hidden="true"
                  >
                    <span
                      v-if="reasonCode === opt.value"
                      class="size-2 rounded-full bg-white"
                    />
                  </span>
                  {{ opt.label }}
                </button>
              </li>
            </ul>
          </fieldset>

          <div v-if="reasonCode === 'other'" :class="[fieldWrapClass, 'mt-4']">
            <label :class="labelClass" for="subscription-cancel-detail">
              {{ S.subscriptionCancelReasonOtherLabel }}
            </label>
            <textarea
              id="subscription-cancel-detail"
              v-model="reasonDetail"
              rows="3"
              maxlength="500"
              :class="textareaClass"
              :placeholder="S.subscriptionCancelReasonOtherPlaceholder"
            />
          </div>

          <p v-if="validationError" class="m-0 mt-3 text-sm text-red-600">
            {{ validationError }}
          </p>
          <p
            v-if="props.error"
            class="m-0 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {{ props.error }}
          </p>
        </div>

        <div
          class="flex shrink-0 flex-col-reverse gap-3 border-t border-black/[0.07] px-6 py-4 sm:flex-row sm:justify-end sm:px-8"
        >
          <AppButton
            type="button"
            variant="outline"
            size="md"
            class="w-full sm:w-auto"
            :disabled="busy"
            @click="onDismiss"
          >
            {{ S.cancel }}
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            size="md"
            class="w-full border-red-600 bg-red-600 hover:border-red-700 hover:bg-red-700 sm:w-auto"
            :disabled="busy || !canSubmit"
            @click="onSubmit"
          >
            {{ busy ? S.loading : S.settingsCancelSubscription }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import {
  subscriptionCancelReasonOptions,
  type SubscriptionCancelFeedback,
  type SubscriptionCancelReasonCode,
} from '~/utils/subscription-cancel-reasons'

export type { SubscriptionCancelFeedback }

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  busy?: boolean
  error?: string
}>()

const emit = defineEmits<{
  confirm: [payload: SubscriptionCancelFeedback]
}>()

const { labelClass, textareaClass, fieldWrapClass } = useSettingsFormStyles()

const reasonOptions = subscriptionCancelReasonOptions()
const reasonCode = ref<SubscriptionCancelReasonCode | ''>('')
const reasonDetail = ref('')
const validationError = ref('')

const canSubmit = computed(() => {
  if (!reasonCode.value) return false
  if (reasonCode.value === 'other') {
    return reasonDetail.value.trim().length >= 3
  }
  return true
})

watch(open, (isOpen) => {
  if (isOpen) {
    validationError.value = ''
  } else {
    reasonCode.value = ''
    reasonDetail.value = ''
    validationError.value = ''
  }
})

function onDismiss(): void {
  if (props.busy) return
  open.value = false
}

function onSubmit(): void {
  validationError.value = ''
  if (!reasonCode.value) {
    validationError.value = S.subscriptionCancelReasonRequired
    return
  }
  if (reasonCode.value === 'other' && reasonDetail.value.trim().length < 3) {
    validationError.value = S.subscriptionCancelReasonOtherRequired
    return
  }
  emit('confirm', {
    reason_code: reasonCode.value,
    reason_detail:
      reasonCode.value === 'other' ? reasonDetail.value.trim().slice(0, 500) : null,
  })
}
</script>
