<template>
  <div class="space-y-8">
    <section aria-labelledby="credits-balance-heading">
      <h2 id="credits-balance-heading" class="sr-only">
        {{ S.settingsCreditsBalanceLabel }}
      </h2>
      <div
        v-if="loading && !entries.length"
        class="animate-pulse rounded-2xl border border-marketing-green/15 bg-marketing-mint/40 p-6"
      >
        <div class="h-4 w-32 rounded bg-black/10" />
        <div class="mt-3 h-10 w-24 rounded bg-black/10" />
      </div>
      <div
        v-else
        class="rounded-2xl border border-marketing-green/20 bg-gradient-to-br from-marketing-mint/80 to-marketing-mint/30 p-5 sm:p-6"
      >
        <p class="m-0 font-dmSans text-sm font-medium text-black/50">
          {{ S.settingsCreditsBalanceLabel }}
        </p>
        <p class="m-0 mt-1 font-dmSans text-[40px] font-extrabold leading-none text-marketing-green sm:text-[48px]">
          {{ creditsBalance }}
        </p>
        <p class="m-0 mt-1 font-dmSans text-sm text-black/45">
          {{ creditWordLabel(creditsBalance) }}
        </p>
      </div>
    </section>

    <section class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <AppButton
        :to="buyCreditsTo"
        variant="primary"
        size="md"
        class="w-full sm:w-auto sm:min-w-[200px]"
      >
        {{ S.settingsBuyCredits }}
      </AppButton>
      <AppButton
        to="/nastavenia/fakturacia"
        variant="outline"
        size="md"
        class="w-full sm:w-auto"
      >
        {{ S.settingsCreditsBillingLink }}
      </AppButton>
      <p
        v-if="user && !isEmployer"
        class="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        {{ S.pricingEmployerOnlyHint }}
      </p>
    </section>

    <section aria-labelledby="credits-history-heading">
      <h2 id="credits-history-heading" class="form-label mb-3">
        {{ S.settingsCreditsHistoryTitle }}
      </h2>
      <div class="mb-4 overflow-x-auto pb-1">
        <JaSegmentedToggle
          v-model="activeFilter"
          :options="filterOptions"
        />
      </div>

      <AppAsyncListState
        :loading="loading"
        :error="loadError"
        :empty="!loading && !loadError && entries.length === 0"
        :empty-message="S.settingsCreditsEmpty"
        :show-retry="true"
        @retry="() => loadLedger()"
      >
        <template #loading>
          <ul class="m-0 list-none space-y-2 p-0" aria-hidden="true">
            <li
              v-for="n in 4"
              :key="`sk-${n}`"
              class="animate-pulse rounded-xl border border-[#e5e7eb] px-4 py-3"
            >
              <div class="flex gap-3">
                <div class="h-10 w-10 shrink-0 rounded-full bg-black/10" />
                <div class="min-w-0 flex-1 space-y-2">
                  <div class="h-4 w-3/5 rounded bg-black/10" />
                  <div class="h-3 w-2/5 rounded bg-black/10" />
                </div>
                <div class="h-5 w-10 rounded bg-black/10" />
              </div>
            </li>
          </ul>
        </template>

        <ul class="m-0 list-none space-y-2 p-0">
          <li
            v-for="entry in entries"
            :key="entry.id"
            class="rounded-xl border border-[#e5e7eb] px-4 py-3 transition-colors hover:border-marketing-green/30 hover:bg-marketing-mint/20"
          >
            <div class="flex items-start gap-3">
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                :class="
                  entry.delta >= 0
                    ? 'bg-marketing-mint text-marketing-green'
                    : 'bg-red-50 text-red-700'
                "
                aria-hidden="true"
              >
                <AppIcon
                  :name="creditLedgerIcon(entry.delta, entry.transaction_type)"
                  :size="18"
                />
              </span>
              <div class="min-w-0 flex-1">
                <p class="m-0 font-dmSans text-[15px] font-semibold text-black">
                  {{ formatCreditLedgerLabel(entry.reason, entry.transaction_type) }}
                </p>
                <p class="m-0 mt-0.5 font-dmSans text-xs text-black/45">
                  {{ formatDate(entry.created_at) }}
                  ·
                  {{ S.settingsCreditsBalanceAfter }}
                  {{ entry.balance_after }}
                </p>
              </div>
              <span
                class="shrink-0 font-dmSans text-lg font-extrabold tabular-nums"
                :class="entry.delta >= 0 ? 'text-marketing-green' : 'text-red-700'"
              >
                {{ entry.delta >= 0 ? '+' : '' }}{{ entry.delta }}
              </span>
            </div>
          </li>
        </ul>

        <AppButton
          v-if="nextCursor"
          type="button"
          variant="outline"
          size="md"
          block
          class="mt-4"
          :disabled="loadingMore"
          @click="loadLedger(true)"
        >
          {{ loadingMore ? S.loading : S.settingsCreditsLoadMore }}
        </AppButton>
      </AppAsyncListState>
    </section>
  </div>
</template>

<script setup lang="ts">
import JaSegmentedToggle from '~/components/ui/JaSegmentedToggle.vue'
import {
  creditLedgerIcon,
  formatCreditLedgerLabel,
} from '~/utils/credit-ledger-labels'
import { creditWordLabel } from '~/utils/sk-plural'
import { S } from '~/utils/strings'

const { session, user } = useAuth()
const { isEmployer } = usePricingCheckout('/cennik')
const { api } = useApi()

const buyCreditsTo = {
  path: '/cennik',
  query: { tab: 'credits' },
}

type LedgerEntry = {
  id: string
  created_at: string
  delta: number
  balance_after: number
  reason: string
  ref_type: string | null
  ref_id: string | null
  transaction_type: string | null
}

type LedgerFilter = 'all' | 'purchases' | 'spending' | 'grants' | 'adjustments'

const filterOptions: { value: LedgerFilter; label: string }[] = [
  { value: 'all', label: S.settingsCreditsFilterAll },
  { value: 'purchases', label: S.settingsCreditsFilterPurchases },
  { value: 'spending', label: S.settingsCreditsFilterSpending },
  { value: 'grants', label: S.settingsCreditsFilterGrants },
  { value: 'adjustments', label: S.settingsCreditsFilterAdjustments },
]

const activeFilter = ref<LedgerFilter>('all')
const loading = ref(true)
const loadError = ref<string | null>(null)
const creditsBalance = ref(0)
const entries = ref<LedgerEntry[]>([])
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('sk-SK', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

async function loadLedger(append = false): Promise<void> {
  if (!session.value?.access_token) {
    loading.value = false
    return
  }
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
    loadError.value = null
    nextCursor.value = null
  }
  try {
    const params = new URLSearchParams({
      filter: activeFilter.value,
      limit: '50',
    })
    if (append && nextCursor.value) {
      params.set('cursor', nextCursor.value)
    }
    const res = await api<{
      credits: number
      entries: LedgerEntry[]
      next_cursor?: string | null
    }>(`/api/billing/credit-ledger?${params.toString()}`)
    if (res.ok && res.data) {
      creditsBalance.value = res.data.credits
      const batch = res.data.entries ?? []
      entries.value = append ? [...entries.value, ...batch] : batch
      nextCursor.value = res.data.next_cursor ?? null
    } else if (!append) {
      creditsBalance.value = 0
      entries.value = []
      nextCursor.value = null
      loadError.value = S.settingsCreditsLoadFailed
    }
  } catch {
    if (!append) {
      loadError.value = S.settingsCreditsLoadFailed
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

watch(activeFilter, () => {
  void loadLedger()
})

watch(
  () => session.value?.access_token,
  () => {
    void loadLedger()
  },
  { immediate: true },
)
</script>
