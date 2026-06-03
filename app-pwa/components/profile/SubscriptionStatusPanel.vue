<template>
  <div :class="rootClass">
    <p
      v-if="loading"
      :class="embedded ? 'py-8 text-center text-base text-black/50' : 'px-8 py-12 text-center text-base text-black/50'"
    >
      {{ S.loading }}
    </p>
    <p
      v-else-if="loadError"
      :class="embedded ? 'py-8 text-center text-sm text-red-600' : 'px-8 py-12 text-center text-sm text-red-600'"
    >
      {{ loadError }}
    </p>
    <template v-else-if="account">
      <div
        class="relative overflow-hidden bg-[linear-gradient(155deg,#15803d_0%,#22c55e_100%)] py-7 text-white max-[480px]:px-6"
        :class="heroClass"
      >
        <div
          class="pointer-events-none absolute -right-12 -top-16 size-[200px] rounded-full bg-white/[0.08]"
          aria-hidden="true"
        />
        <p class="relative m-0 text-[12px] font-bold uppercase tracking-[0.1em] text-white/75">
          {{ S.myPlan }}
        </p>
        <div class="relative mt-2 flex flex-wrap items-center gap-3">
          <h3 class="m-0 text-[28px] font-extrabold leading-tight tracking-tight">
            {{ heroPlanName }}
          </h3>
          <span
            v-if="statusLabel"
            class="inline-flex items-center rounded-full px-3 py-1 text-[13px] font-bold"
            :class="
              hasPaidPlanAccess
                ? 'bg-white/20 text-white ring-1 ring-white/30'
                : 'bg-white text-marketing-green'
            "
          >
            {{ statusLabel }}
          </span>
        </div>
      </div>

      <div :class="bodyClass">
        <template v-if="isPendingCancellation">
          <p class="m-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
            {{ pendingEndMessage }}
          </p>
          <p v-if="pendingEndHint" class="m-0 text-sm leading-relaxed text-black/55">
            {{ pendingEndHint }}
          </p>

          <div class="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2">
            <article
              v-if="daysLeft !== null"
              class="rounded-2xl bg-marketing-surface px-6 py-[22px]"
            >
              <p class="m-0 font-dmSans text-[36px] font-extrabold leading-none text-marketing-green">
                {{ daysLeft }}
              </p>
              <p class="mt-1 font-dmSans text-[15px] font-semibold text-black/70">
                {{ S.profileSubscriptionDaysLeftLabel }}
              </p>
              <p class="mt-1 font-dmSans text-[14px] leading-snug text-black/45">
                {{ daysLeftSubtitle }}
              </p>
            </article>
            <article
              v-if="account.currentPeriodEnd"
              class="rounded-2xl bg-marketing-surface px-6 py-[22px]"
            >
              <p class="m-0 font-dmSans text-[22px] font-extrabold leading-tight text-black">
                {{ formatDate(account.currentPeriodEnd) }}
              </p>
              <p class="mt-1 font-dmSans text-[15px] font-semibold text-black/70">
                {{ S.profileSubscriptionValidUntil }}
              </p>
              <p class="mt-1 font-dmSans text-[14px] leading-snug text-black/45">
                {{ S.profileSubscriptionValidUntilHint }}
              </p>
            </article>
          </div>

          <div class="flex flex-col gap-3 border-t border-black/[0.07] pt-6 sm:flex-row sm:flex-wrap sm:items-center">
            <AppButton
              type="button"
              variant="primary"
              size="md"
              class="w-full sm:w-auto"
              :disabled="resumeBusy"
              @click="onResumeClick"
            >
              {{ resumeBusy ? S.loading : S.settingsSubscriptionResumeCta }}
            </AppButton>
          </div>
        </template>

        <template v-else-if="hasPaidPlanAccess">
          <p
            v-if="account.subscriptionStatus === 'past_due'"
            class="m-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950"
          >
            {{ S.settingsBillingPaymentMethodPastDueHint }}
            <NuxtLink
              to="/nastavenia/fakturacia#billing-payment-method"
              class="mt-2 block font-semibold text-marketing-green underline"
            >
              {{ S.settingsBillingPaymentMethodChange }}
            </NuxtLink>
          </p>
          <div class="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2">
            <article
              v-if="daysLeft !== null"
              class="rounded-2xl bg-marketing-surface px-6 py-[22px]"
            >
              <p class="m-0 font-dmSans text-[36px] font-extrabold leading-none text-marketing-green">
                {{ daysLeft }}
              </p>
              <p class="mt-1 font-dmSans text-[15px] font-semibold text-black/70">
                {{ S.profileSubscriptionDaysLeftLabel }}
              </p>
              <p class="mt-1 font-dmSans text-[14px] leading-snug text-black/45">
                {{ daysLeftSubtitle }}
              </p>
            </article>
            <article
              v-if="account.currentPeriodEnd"
              class="rounded-2xl bg-marketing-surface px-6 py-[22px]"
            >
              <p class="m-0 font-dmSans text-[22px] font-extrabold leading-tight text-black">
                {{ formatDate(account.currentPeriodEnd) }}
              </p>
              <p class="mt-1 font-dmSans text-[15px] font-semibold text-black/70">
                {{ S.profileSubscriptionRenewsOn }}
              </p>
              <p class="mt-1 font-dmSans text-[14px] leading-snug text-black/45">
                {{ S.profileSubscriptionRenewsOnHint }}
              </p>
            </article>
          </div>

          <div
            class="flex flex-col gap-3 border-t border-black/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="m-0 text-[14px] text-black/45">
              {{ S.profileSubscriptionCancelHint }}
            </p>
            <AppButton
              type="button"
              variant="outline"
              size="md"
              class="w-full shrink-0 border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800 sm:w-auto"
              :disabled="cancelBusy"
              @click="openCancelDialog"
            >
              {{ cancelBusy ? S.loading : S.settingsCancelSubscription }}
            </AppButton>
          </div>
        </template>

        <div
          v-else-if="isInconsistentExpiredPlan"
          class="rounded-2xl bg-marketing-surface px-6 py-6"
        >
          <p class="m-0 text-[16px] leading-relaxed text-black/55">
            {{ S.profileSubscriptionExpiredHint }}
          </p>
          <AppButton
            variant="primary"
            size="md"
            to="/cennik"
            class="mt-4 w-full sm:w-auto"
          >
            {{ S.profileSubscriptionUpgradeCta }}
          </AppButton>
        </div>

        <div
          v-else
          class="rounded-2xl bg-marketing-surface px-6 py-6"
        >
          <div class="flex flex-col gap-4 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
            <div class="flex min-w-0 items-start gap-4">
              <div
                class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-marketing-panel"
              >
                <AppIcon name="star" :size="22" class="text-marketing-green" />
              </div>
              <p class="m-0 text-[16px] leading-relaxed text-black/55">
                {{ S.profileSubscriptionFreeHint }}
              </p>
            </div>
            <AppButton
              variant="primary"
              size="md"
              to="/cennik"
              class="w-full shrink-0 min-[520px]:w-auto"
            >
              {{ S.profileSubscriptionUpgradeCta }}
            </AppButton>
          </div>
        </div>

        <p v-if="cancelError" class="m-0 text-sm text-red-600">{{ cancelError }}</p>
        <p v-if="resumeError" class="m-0 text-sm text-red-600">{{ resumeError }}</p>
        <p
          v-if="cancelOk"
          class="m-0 rounded-xl border border-marketing-green/25 bg-marketing-mint px-4 py-3 text-sm font-medium text-marketing-green"
        >
          {{ cancelOk }}
        </p>
        <p
          v-if="resumeOk"
          class="m-0 rounded-xl border border-marketing-green/25 bg-marketing-mint px-4 py-3 text-sm font-medium text-marketing-green"
        >
          {{ resumeOk }}
        </p>
      </div>
    </template>
    <p
      v-else
      :class="embedded ? 'py-8 text-center text-base text-black/50' : 'px-8 py-12 text-center text-base text-black/50'"
    >
      {{ S.noSubscription }}
    </p>

    <SettingsSubscriptionCancelDialog
      v-model:open="cancelDialogOpen"
      :busy="cancelBusy"
      :error="cancelError"
      @confirm="onCancelConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import type { SubscriptionCancelFeedback } from '~/utils/subscription-cancel-reasons'
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    embedded?: boolean
  }>(),
  {
    embedded: false,
  },
)

const emit = defineEmits<{ refreshed: [] }>()

type BillingAccount = {
  planNameSk: string
  planSlug: string
  subscriptionStatus: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  active: S.profileSubscriptionStatusActive,
  trialing: S.profileSubscriptionStatusTrialing,
  past_due: S.profileSubscriptionStatusPastDue,
  canceled: S.profileSubscriptionStatusCanceled,
}

const { user } = useAuth()
const { api } = useApi()
const { cancelBusy, cancelError, cancelOk, cancelDialogOpen, openCancelDialog, submitCancelWithReason } =
    useSubscriptionCancel()
const { resumeBusy, resumeError, resumeOk, confirmAndResume } = useSubscriptionResume()

const loading = ref(true)
const loadError = ref<string | null>(null)
const account = ref<BillingAccount | null>(null)

const rootClass = computed(() =>
  props.embedded
    ? 'overflow-hidden font-dmSans'
    : 'overflow-hidden rounded-[20px] bg-white font-dmSans shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)]',
)

const heroClass = computed(() =>
  props.embedded
    ? 'rounded-t-[20px] px-8 max-[480px]:px-6'
    : 'px-8 max-[480px]:px-6',
)

const bodyClass = computed(() =>
  props.embedded
    ? 'flex flex-col gap-6 px-8 py-7 max-[480px]:px-6'
    : 'flex flex-col gap-6 px-8 py-7 max-[480px]:px-6',
)

/** Paid plan slug with active Stripe status. */
const hasActivePaidStatus = computed(() => {
  const a = account.value
  if (!a || a.planSlug === 'zadarmo') return false
  const status = a.subscriptionStatus ?? ''
  return Boolean(status) && status !== 'canceled'
})

/** Still entitled to paid plan benefits (including end-of-period after cancel). */
const hasPaidPlanAccess = computed(() => {
  const a = account.value
  if (!a || a.planSlug === 'zadarmo') return false
  if (hasActivePaidStatus.value) return true
  if (a.cancelAtPeriodEnd) return true
  if (a.currentPeriodEnd && new Date(a.currentPeriodEnd).getTime() > Date.now()) {
    return true
  }
  return false
})

const isPendingCancellation = computed(() => {
  const a = account.value
  if (!a || a.planSlug === 'zadarmo') return false
  if (a.cancelAtPeriodEnd && hasPaidPlanAccess.value) return true
  const status = a.subscriptionStatus ?? ''
  return (
    hasPaidPlanAccess.value &&
    status === 'canceled' &&
    Boolean(a.currentPeriodEnd)
  )
})

const isInconsistentExpiredPlan = computed(() => {
  const a = account.value
  return Boolean(a && a.planSlug !== 'zadarmo' && !hasPaidPlanAccess.value)
})

const heroPlanName = computed(() => {
  const a = account.value
  if (!a) return ''
  if (hasPaidPlanAccess.value || isPendingCancellation.value) {
    return a.planNameSk
  }
  return a.planSlug === 'zadarmo' ? a.planNameSk : S.planPriceFree
})

const statusLabel = computed((): string => {
  const a = account.value
  if (!a) return ''
  if (isPendingCancellation.value) {
    return S.profileSubscriptionStatusCanceling
  }
  if (!hasPaidPlanAccess.value) {
    return a.planSlug === 'zadarmo' ? S.planPriceFree : (STATUS_LABELS[a.subscriptionStatus ?? ''] ?? a.subscriptionStatus ?? '')
  }
  const raw = a.subscriptionStatus ?? ''
  return STATUS_LABELS[raw] ?? raw
})

const pendingEndMessage = computed((): string => {
  const a = account.value
  if (!a?.currentPeriodEnd) {
    return S.profileSubscriptionCancelScheduled
  }
  return S.profileSubscriptionEndsOnDate.replace('{date}', formatDate(a.currentPeriodEnd))
})

const pendingEndHint = computed((): string => {
  const a = account.value
  if (!a?.currentPeriodEnd || a.planSlug === 'zadarmo') {
    return ''
  }
  return S.profileSubscriptionEndsOnDateHint.replace('{plan}', a.planNameSk)
})

const daysLeft = computed((): number | null => {
  const end = account.value?.currentPeriodEnd
  if (!end || !hasPaidPlanAccess.value) return null
  const ms = new Date(end).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
})

const daysLeftSubtitle = computed((): string => {
  const n = daysLeft.value
  if (n === null) return ''
  if (n === 1) return S.profileSubscriptionDaysLeftOne
  if (n >= 2 && n <= 4) return S.profileSubscriptionDaysLeftFew.replace('{n}', String(n))
  return S.profileSubscriptionDaysLeft.replace('{n}', String(n))
})

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('sk-SK', { dateStyle: 'long' }).format(new Date(iso))
  } catch {
    return iso
  }
}

async function load(): Promise<void> {
  if (!user.value) {
    account.value = null
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = null
  try {
    const res = await api<BillingAccount>('/api/billing/account')
    if (res.ok && res.data) {
      account.value = res.data
    } else {
      account.value = null
      loadError.value = S.saveFailed
    }
  } finally {
    loading.value = false
  }
}

async function onCancelConfirm(feedback: SubscriptionCancelFeedback): Promise<void> {
  const ok = await submitCancelWithReason(feedback)
  if (ok) {
    cancelDialogOpen.value = false
    await load()
    emit('refreshed')
  }
}

async function onResumeClick(): Promise<void> {
  resumeError.value = ''
  resumeOk.value = ''
  const ok = await confirmAndResume()
  if (ok) {
    await load()
    emit('refreshed')
  }
}

onMounted(() => {
  void load()
})
</script>
