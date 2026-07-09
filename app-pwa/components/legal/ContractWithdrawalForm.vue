<template>
  <div>
    <p
      v-if="phase === 'success'"
      class="m-0 rounded-xl border border-marketing-green/20 bg-marketing-mint/40 px-5 py-8 text-center font-dmSans text-base font-medium text-marketing-green"
      role="status"
    >
      {{ S.contractWithdrawalSuccess }}
    </p>

    <form
      v-else
      class="flex flex-col"
      novalidate
      @submit.prevent="onSubmit"
    >
      <p v-if="formError" class="mb-5 m-0 text-sm text-red-600" role="alert">
        {{ formError }}
      </p>

      <div class="mb-5 flex flex-col gap-1.5">
        <label :class="fieldLabelClass" for="contract-withdrawal-name">
          {{ S.contractWithdrawalName }}
        </label>
        <input
          id="contract-withdrawal-name"
          v-model="form.name"
          type="text"
          autocomplete="name"
          :class="formTextInputClass"
          :disabled="phase === 'loading'"
        >
      </div>

      <div class="mb-5 flex flex-col gap-1.5">
        <label :class="fieldLabelClass" for="contract-withdrawal-email">
          {{ S.contractWithdrawalEmail }}
        </label>
        <input
          id="contract-withdrawal-email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          :class="formTextInputClass"
          :disabled="phase === 'loading'"
        >
      </div>

      <div class="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label :class="fieldLabelClass" for="contract-withdrawal-product">
            {{ S.contractWithdrawalProduct }}
          </label>
          <AppFormDropdown
            id="contract-withdrawal-product"
            :model-value="form.product"
            :options="productOptions"
            :placeholder="S.contractWithdrawalProductPlaceholder"
            empty-value=""
            bordered
            :disabled="phase === 'loading'"
            @update:model-value="form.product = $event"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label :class="fieldLabelClass" for="contract-withdrawal-invoice">
            {{ S.contractWithdrawalInvoiceNumber }}
          </label>
          <input
            id="contract-withdrawal-invoice"
            v-model="form.invoice_number"
            type="text"
            :class="formTextInputClass"
            :disabled="phase === 'loading'"
          >
        </div>
      </div>

      <div class="mb-5 flex flex-col gap-1.5">
        <label :class="fieldLabelClass" for="contract-withdrawal-purchase-date">
          {{ S.contractWithdrawalPurchaseDate }}
        </label>
        <input
          id="contract-withdrawal-purchase-date"
          v-model="form.purchase_date"
          type="date"
          :class="formTextInputClass"
          :disabled="phase === 'loading'"
        >
      </div>

      <div class="mb-5 flex flex-col gap-1.5">
        <label :class="fieldLabelClass" for="contract-withdrawal-reason">
          {{ S.contractWithdrawalReason }}
        </label>
        <AppFormDropdown
          id="contract-withdrawal-reason"
          :model-value="form.reason"
          :options="reasonOptions"
          :placeholder="S.contractWithdrawalReasonPlaceholder"
          empty-value=""
          bordered
          :disabled="phase === 'loading'"
          @update:model-value="onReasonChange"
        />
      </div>

      <div
        v-if="form.reason === 'other'"
        class="mb-5 flex flex-col gap-1.5"
      >
        <label :class="fieldLabelClass" for="contract-withdrawal-reason-other">
          {{ S.contractWithdrawalReasonOtherDetail }}
        </label>
        <input
          id="contract-withdrawal-reason-other"
          v-model="form.reason_other"
          type="text"
          :class="formTextInputClass"
          :placeholder="S.contractWithdrawalReasonOtherPlaceholder"
          :disabled="phase === 'loading'"
        >
      </div>

      <label class="mb-6 flex cursor-pointer items-start gap-2 text-sm font-medium text-black/80">
        <AppCheckbox
          :model-value="form.withdrawal_ack"
          :disabled="phase === 'loading'"
          @update:model-value="form.withdrawal_ack = $event"
        />
        <span>{{ S.contractWithdrawalAck }}</span>
      </label>

      <button
        type="submit"
        class="h-14 w-full is-clickable rounded-full bg-marketing-green text-lg font-bold text-white transition-opacity duration-200 hover:opacity-[0.88] disabled:opacity-50"
        :disabled="phase === 'loading'"
      >
        {{ phase === 'loading' ? S.loading : S.contractWithdrawalSubmit }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import {
  formFieldLabelClass,
  formTextInputClass,
} from '~/utils/form-field-ui'
import { validateEmail, requiredString } from '~/utils/validation'
import type {
  ContractWithdrawalProduct,
  ContractWithdrawalReason,
} from '~/composables/useContractWithdrawal'

const fieldLabelClass = formFieldLabelClass

const { user, profile } = useAuth()
const { phase, submit, resetPhase } = useContractWithdrawal()

const formError = ref<string | null>(null)

const productOptions = [
  {
    value: 'subscription',
    label: S.contractWithdrawalProductSubscription,
  },
  {
    value: 'credits',
    label: S.contractWithdrawalProductCredits,
  },
] as const

const reasonOptions = [
  {
    value: 'changed_mind',
    label: S.contractWithdrawalReasonChangedMind,
  },
  {
    value: 'no_longer_needed',
    label: S.contractWithdrawalReasonNoLongerNeeded,
  },
  {
    value: 'other',
    label: S.contractWithdrawalReasonOther,
  },
] as const

const form = reactive({
  name: '',
  email: '',
  product: '' as string,
  invoice_number: '',
  purchase_date: '',
  reason: '' as string,
  reason_other: '',
  withdrawal_ack: false,
})

function onReasonChange(value: string): void {
  form.reason = value
  if (value !== 'other') {
    form.reason_other = ''
  }
}

function applyProfilePrefill(): void {
  if (user.value?.email && !form.email.trim()) {
    form.email = user.value.email
  }
  if (!form.name.trim()) {
    const first = profile.value?.first_name?.trim() ?? ''
    const last = profile.value?.last_name?.trim() ?? ''
    const combined = `${first} ${last}`.trim()
    if (combined) form.name = combined
    else if (profile.value?.display_name?.trim()) {
      form.name = profile.value.display_name.trim()
    }
  }
}

watch(
  () => [user.value?.id, profile.value?.id],
  () => {
    applyProfilePrefill()
  },
  { immediate: true },
)

function validateForm(): string | null {
  return (
    requiredString(form.name, S.contractWithdrawalErrorName) ||
    validateEmail(form.email, S.contractWithdrawalErrorEmail) ||
    requiredString(form.product, S.contractWithdrawalErrorProduct) ||
    requiredString(form.invoice_number, S.contractWithdrawalErrorInvoice) ||
    requiredString(form.purchase_date, S.contractWithdrawalErrorPurchaseDate) ||
    (form.reason === 'other'
      ? requiredString(form.reason_other, S.contractWithdrawalErrorReasonOther)
      : null) ||
    (!form.withdrawal_ack ? S.contractWithdrawalErrorAck : null)
  )
}

async function onSubmit(): Promise<void> {
  formError.value = null
  const validationError = validateForm()
  if (validationError) {
    formError.value = validationError
    return
  }

  resetPhase()

  const result = await submit({
    name: form.name,
    email: form.email,
    product: form.product as ContractWithdrawalProduct,
    invoice_number: form.invoice_number,
    purchase_date: form.purchase_date,
    reason: form.reason
      ? (form.reason as ContractWithdrawalReason)
      : undefined,
    reason_other:
      form.reason === 'other' ? form.reason_other.trim() : undefined,
    withdrawal_ack: form.withdrawal_ack,
  })

  if (!result.ok) {
    formError.value = result.message
  }
}
</script>
