<template>

  <div

    v-if="user"

    class="mb-8 rounded-[20px] bg-white p-5 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] sm:p-6"

  >

    <h2 class="m-0 font-dmSans text-lg font-extrabold text-black">{{ S.pricingAccountTitle }}</h2>

    <p v-if="loading" class="mt-3 text-sm text-black/50">{{ S.loading }}</p>

    <dl v-else-if="account" class="mt-4 grid gap-3 font-dmSans text-[15px] sm:grid-cols-2">

      <div>

        <dt class="text-black/45">{{ S.credits }}</dt>

        <dd class="m-0 font-bold text-marketing-green">{{ account.credits }}</dd>

      </div>

      <div>

        <dt class="text-black/45">{{ S.myPlan }}</dt>

        <dd class="m-0 font-semibold text-black">{{ account.planNameSk }}</dd>

      </div>

      <div>

        <dt class="text-black/45">{{ S.pricingMonthlyCredits }}</dt>

        <dd class="m-0 text-black">{{ account.monthlyCredits }} {{ S.credits }} / mesiac</dd>

      </div>

      <div>

        <dt class="text-black/45">{{ S.pricingMaxActiveOffers }}</dt>

        <dd class="m-0 text-black">

          {{ account.activeOffersCount }} / {{ account.maxActiveOffers }}

        </dd>

      </div>

      <template v-if="account.subscriptionStatus">

        <div>

          <dt class="text-black/45">{{ S.pricingSubscriptionStatus }}</dt>

          <dd class="m-0 text-black">{{ account.subscriptionStatus }}</dd>

        </div>

      </template>

      <template v-if="account.currentPeriodEnd">

        <div>

          <dt class="text-black/45">{{ S.subscriptionActiveUntil }}</dt>

          <dd class="m-0 text-black">{{ formatDate(account.currentPeriodEnd) }}</dd>

        </div>

      </template>

      <template v-if="cvUsageRows.length">

        <div class="sm:col-span-2">

          <dt class="mb-1 text-black/45">{{ S.pricingCvDatabaseTitle }} (tento mesiac)</dt>

          <dd class="m-0 grid gap-1 text-black sm:grid-cols-3">

            <span v-for="row in cvUsageRows" :key="row.label">{{ row.label }}: {{ row.value }}</span>

          </dd>

        </div>

      </template>

    </dl>

  </div>

</template>



<script setup lang="ts">

import { S } from '~/utils/strings'



const { user, session } = useAuth()

const { api } = useApi()



type CvLimits = {

  maxCvUnlocksMonthly: number | null

  maxCvContactsMonthly: number | null

  maxCvPdfDownloadsMonthly: number | null

}



type CvUsage = {

  unlocksCount: number

  contactsCount: number

  pdfDownloadsCount: number

}



type BillingAccount = {

  credits: number

  planNameSk: string

  monthlyCredits: number

  maxActiveOffers: number

  activeOffersCount: number

  subscriptionStatus: string | null

  currentPeriodEnd: string | null

  cvLimits?: CvLimits

  cvUsage?: CvUsage

}



const loading = ref(true)

const account = ref<BillingAccount | null>(null)



const cvUsageRows = computed(() => {

  const acc = account.value

  if (!acc?.cvUsage || !acc.cvLimits) return []

  const rows: { label: string; value: string }[] = []

  const push = (label: string, used: number, max: number | null | undefined) => {

    const cap = max === null || max === undefined ? '∞' : String(max)

    rows.push({ label, value: `${used} / ${cap}` })

  }

  push(S.pricingCvUnlock, acc.cvUsage.unlocksCount, acc.cvLimits.maxCvUnlocksMonthly)

  push(S.pricingCvContact, acc.cvUsage.contactsCount, acc.cvLimits.maxCvContactsMonthly)

  push(S.pricingCvPdf, acc.cvUsage.pdfDownloadsCount, acc.cvLimits.maxCvPdfDownloadsMonthly)

  return rows

})



function formatDate(iso: string): string {

  try {

    return new Intl.DateTimeFormat('sk-SK', { dateStyle: 'medium' }).format(new Date(iso))

  } catch {

    return iso

  }

}



async function load(): Promise<void> {

  if (!session.value?.access_token) {

    account.value = null

    loading.value = false

    return

  }

  loading.value = true

  const res = await api<BillingAccount>('/api/billing/account')

  account.value = res.ok && res.data ? res.data : null

  loading.value = false

}



watch(

  () => session.value?.access_token,

  () => {

    void load()

  },

  { immediate: true },

)

</script>

