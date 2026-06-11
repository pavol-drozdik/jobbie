<template>

  <div class="flex flex-col gap-5 font-dmSans">

    <div :class="[settingsCardClass, 'overflow-hidden !p-0']">

      <ProfileSubscriptionStatusPanel embedded @refreshed="onSubscriptionRefreshed" />

    </div>



    <section :class="settingsCardClass">

      <h2 class="form-label mb-1">{{ S.settingsBillingSectionUsage }}</h2>

      <p class="mb-4 text-xs text-black/45">{{ S.settingsBillingSectionUsageHint }}</p>

      <p v-if="usageLoading" class="text-sm text-black/50">{{ S.loading }}</p>

      <template v-else-if="account">

        <div class="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">

          <article class="rounded-2xl bg-marketing-surface px-6 py-5">

            <p class="m-0 text-xs font-semibold uppercase tracking-wide text-black/45">

              {{ S.pricingMaxActiveOffers }}

            </p>

            <p class="m-0 mt-2 font-dmSans text-[28px] font-extrabold leading-none text-black">

              {{ account.activeOffersCount }}

              <span class="text-[18px] font-bold text-black/40">/ {{ account.maxActiveOffers }}</span>

            </p>

          </article>

          <article class="rounded-2xl bg-marketing-surface px-6 py-5">

            <p class="m-0 text-xs font-semibold uppercase tracking-wide text-black/45">

              {{ S.credits }}

            </p>

            <p class="m-0 mt-2 font-dmSans text-[28px] font-extrabold leading-none text-marketing-green">

              {{ account.credits }}

            </p>

            <NuxtLink

              to="/nastavenia/kredity"

              class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-marketing-green hover:underline"

            >

              {{ S.settingsBillingCreditsLink }}

              <AppIcon name="chevron-right" :size="14" class="opacity-80" />

            </NuxtLink>

          </article>

        </div>

        <div

          v-if="cvUsageRows.length"

          class="mt-4 rounded-2xl bg-marketing-surface px-6 py-4"

        >

          <p class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-black/45">

            {{ S.pricingCvDatabaseTitle }} ({{ S.pricingCvUsageThisMonth }})

          </p>

          <ul class="m-0 grid list-none gap-2 p-0 text-sm text-black sm:grid-cols-3">

            <li v-for="row in cvUsageRows" :key="row.label">
              <span class="mr-1 text-black/55">{{ row.label }}:</span>
              <span class="font-semibold">{{ row.value }}</span>
            </li>

          </ul>

        </div>

      </template>

    </section>



    <section :class="settingsCardClass">

      <h2 class="form-label mb-1">{{ S.settingsBillingSectionPayments }}</h2>

      <p class="mb-4 text-xs text-black/45">{{ S.settingsBillingSectionPaymentsHint }}</p>

      <AppButton

        variant="primary"

        size="md"

        to="/cennik"

        class="w-full sm:w-auto"

      >

        {{ S.settingsChangePlan }}

      </AppButton>

    </section>



    <section

      id="billing-payment-method"

      :class="settingsCardClass"

    >

      <h2 class="form-label mb-1">{{ S.settingsBillingPaymentMethodTitle }}</h2>

      <p class="mb-4 text-xs text-black/45">{{ S.settingsBillingPaymentMethodHint }}</p>

      <p

        v-if="account?.subscriptionStatus === 'past_due'"

        class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950"

      >

        {{ S.settingsBillingPaymentMethodPastDueHint }}

      </p>

      <p v-if="pmLoading" class="text-sm text-black/50">{{ S.loading }}</p>

      <template v-else>

        <p

          v-if="paymentMethod"

          class="m-0 rounded-2xl bg-marketing-surface px-6 py-4 text-sm font-semibold text-black"

        >

          {{ formatPaymentMethodLabel(paymentMethod) }}

        </p>

        <p

          v-else-if="!stripeCustomerLinked"

          class="m-0 rounded-2xl bg-marketing-surface px-6 py-4 text-sm text-black/50"

        >

          {{ S.settingsBillingPaymentMethodNoCustomer }}

        </p>

        <p

          v-else

          class="m-0 rounded-2xl bg-marketing-surface px-6 py-4 text-sm text-black/50"

        >

          {{ S.settingsBillingPaymentMethodEmpty }}

        </p>

      </template>

      <AppButton

        v-if="!changeCardOpen"

        type="button"

        variant="outline"

        size="md"

        class="mt-4 w-full sm:w-auto"

        :disabled="!stripeCustomerLinked || changeCardBusy"

        @click="startChangeCard"

      >

        {{ changeCardBusy ? S.loading : S.settingsBillingPaymentMethodChange }}

      </AppButton>

      <SettingsBillingPaymentMethodForm

        v-if="changeCardOpen && setupClientSecret"

        :client-secret="setupClientSecret"

        @success="onPaymentMethodSaved"

        @cancel="closeChangeCard"

      />

      <p v-if="paymentsOk" class="mt-3 text-sm font-medium text-marketing-green">{{ paymentsOk }}</p>

      <p v-if="paymentsErr" class="mt-3 text-sm text-red-600">{{ paymentsErr }}</p>

    </section>



    <section :class="settingsCardClass">

      <h2 class="form-label mb-1">{{ S.settingsBillingSectionDetails }}</h2>

      <p class="mb-4 text-xs text-black/45">{{ S.settingsBillingSectionDetailsHint }}</p>

      <form class="space-y-4" @submit.prevent="saveBillingDetails">

        <div :class="fieldWrapClass">

          <label :class="labelClass">{{ S.companyName }}</label>

          <input v-model="companyName" type="text" :class="inputClass">

        </div>

        <div class="grid gap-3 sm:grid-cols-2">

          <div :class="fieldWrapClass">

            <label :class="labelClass">IČO</label>

            <input v-model="registrationNumber" type="text" :class="inputClass" autocomplete="off">

          </div>

          <div :class="fieldWrapClass">

            <label :class="labelClass">DIČ</label>

            <input v-model="taxId" type="text" :class="inputClass" autocomplete="off">

          </div>

          <div :class="[fieldWrapClass, 'sm:col-span-2']">

            <label :class="labelClass">IČ DPH</label>

            <input v-model="vatId" type="text" :class="inputClass" autocomplete="off">

          </div>

        </div>

        <div :class="fieldWrapClass">

          <label :class="labelClass">{{ S.settingsBillingAddressLabel }}</label>

          <input v-model="billingAddress" type="text" :class="inputClass" autocomplete="street-address">

        </div>

        <p v-if="billingFormErr" class="text-sm text-red-600">{{ billingFormErr }}</p>

        <AppButton

          type="submit"

          variant="primary"

          size="md"

          class="w-full sm:w-auto sm:min-w-[200px]"

          :disabled="savingBilling"

        >

          {{ savingBilling ? S.loading : S.save }}

        </AppButton>

      </form>

    </section>



    <section :class="settingsCardClass">

      <h2 class="form-label mb-4">{{ S.settingsBillingSectionInvoices }}</h2>

      <p v-if="invoicesLoading" class="text-sm text-black/50">{{ S.loading }}</p>

      <p v-else-if="!invoices.length" class="rounded-2xl bg-marketing-surface px-6 py-8 text-center text-sm text-black/50">

        {{ stripeCustomerLinked ? S.settingsInvoicesEmpty : S.settingsInvoicesNoCustomer }}

      </p>

      <ul v-else class="m-0 list-none space-y-2 p-0">

        <li

          v-for="inv in invoices"

          :key="inv.id"

          class="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.08] bg-marketing-surface/50 px-4 py-3"

        >

          <div class="min-w-0">

            <p class="m-0 truncate text-sm font-semibold text-black">

              {{ inv.number || formatInvoiceAmount(inv) }}

              <span class="font-normal text-black/45">· {{ formatDateFromUnix(inv.created) }}</span>

            </p>

            <p v-if="invoiceStatusLabel(inv.status)" class="m-0 mt-0.5 text-xs text-black/45">

              {{ invoiceStatusLabel(inv.status) }}

            </p>

          </div>

          <NuxtLink

            :to="{ path: `/nastavenia/fakturacia/${inv.id}` }"

            class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-marketing-green transition-colors hover:border-marketing-green/40 hover:bg-marketing-mint/50"

          >

            {{ S.settingsInvoiceView }}

            <AppIcon name="arrow-right" :size="14" class="opacity-80" />

          </NuxtLink>

        </li>

      </ul>

    </section>

  </div>

</template>



<script setup lang="ts">

import { S } from '~/utils/strings'
import { buildCvDatabaseUsageRows } from '~/utils/cv-database-usage-display'



const emit = defineEmits<{ saved: [] }>()



const { user } = useAuth()

const { api } = useApi()

const { ensureRecentLoginForBilling, billingStepUpUserMessage, isStepUpRequiredResponse, tryRecoverFromStepUpRequired } =

  useBillingStepUp()

const { profile, load: loadProfile } = useSettingsProfile()

const { settingsCardClass, labelClass, inputClass, fieldWrapClass } = useSettingsFormStyles()



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

  planSlug: string

  monthlyCredits: number

  maxActiveOffers: number

  activeOffersCount: number

  subscriptionStatus: string | null

  currentPeriodEnd: string | null

  cancelAtPeriodEnd?: boolean

  cvLimits?: CvLimits

  cvUsage?: CvUsage

}



type PaymentMethodRow = {

  brand: string

  last4: string

  exp_month: number

  exp_year: number

}



type InvoiceRow = {

  id: string

  number: string | null

  created: number

  amount_paid: number

  total: number

  currency: string

  status: string | null

  invoice_pdf: string | null

  hosted_invoice_url: string | null

}



const INVOICE_STATUS_LABELS: Record<string, string> = {

  paid: S.settingsInvoiceStatusPaid,

  open: S.settingsInvoiceStatusOpen,

  void: S.settingsInvoiceStatusVoid,

  draft: S.settingsInvoiceStatusDraft,

  uncollectible: S.settingsInvoiceStatusUncollectible,

}



const usageLoading = ref(true)

const account = ref<BillingAccount | null>(null)

const invoices = ref<InvoiceRow[]>([])

const invoicesLoading = ref(false)

const stripeCustomerLinked = ref(true)

const paymentMethod = ref<PaymentMethodRow | null>(null)

const pmLoading = ref(false)

const changeCardOpen = ref(false)

const changeCardBusy = ref(false)

const setupClientSecret = ref('')

const savingBilling = ref(false)

const paymentsErr = ref('')

const paymentsOk = ref('')

const billingFormErr = ref('')



const companyName = ref('')

const registrationNumber = ref('')

const taxId = ref('')

const vatId = ref('')

const billingAddress = ref('')



const cvUsageRows = computed(() => {
  const acc = account.value
  if (!acc?.cvUsage || !acc.cvLimits) return []
  return buildCvDatabaseUsageRows({
    cvUsage: acc.cvUsage,
    cvLimits: acc.cvLimits,
    planSlug: acc.planSlug,
  })
})



function invoiceStatusLabel(status: string | null): string {

  if (!status) return ''

  return INVOICE_STATUS_LABELS[status] ?? status

}



function formatDate(iso: string): string {

  try {

    return new Intl.DateTimeFormat('sk-SK', { dateStyle: 'medium' }).format(new Date(iso))

  } catch {

    return iso

  }

}



function formatDateFromUnix(ts: number): string {

  return formatDate(new Date(ts * 1000).toISOString())

}



function formatInvoiceAmount(inv: InvoiceRow): string {

  const cents = inv.amount_paid > 0 ? inv.amount_paid : inv.total

  const amount = (cents / 100).toFixed(2)

  return `${amount} ${inv.currency.toUpperCase()}`

}



function formatPaymentMethodLabel(pm: PaymentMethodRow): string {

  const brand = pm.brand

    ? pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)

    : 'Karta'

  const expMonth = String(pm.exp_month).padStart(2, '0')

  const expYear = String(pm.exp_year).slice(-2)

  return `${brand} •••• ${pm.last4} · ${expMonth}/${expYear}`

}



async function loadPaymentMethod(): Promise<void> {

  if (!user.value) {

    paymentMethod.value = null

    return

  }

  pmLoading.value = true

  try {

    const res = await api<{

      payment_method: PaymentMethodRow | null

      stripe_customer_linked?: boolean

    }>('/api/payments/payment-method')

    paymentMethod.value = res.data?.payment_method ?? null

    if (res.data?.stripe_customer_linked === false) {

      stripeCustomerLinked.value = false

    }

  } finally {

    pmLoading.value = false

  }

}



function closeChangeCard(): void {

  changeCardOpen.value = false

  setupClientSecret.value = ''

}



async function startChangeCard(): Promise<void> {

  const gate = await ensureRecentLoginForBilling()

  if (!gate.ok) {

    paymentsErr.value = gate.message

    paymentsOk.value = ''

    return

  }

  paymentsErr.value = ''

  paymentsOk.value = ''

  changeCardBusy.value = true

  try {

    let res = await api<{ client_secret: string }>('/api/payments/payment-method/setup', {

      method: 'POST',

    })

    if (!res.ok && isStepUpRequiredResponse(res) && (await tryRecoverFromStepUpRequired())) {

      res = await api<{ client_secret: string }>('/api/payments/payment-method/setup', {

        method: 'POST',

      })

    }

    const secret =

      res.ok && typeof res.data?.client_secret === 'string'

        ? res.data.client_secret.trim()

        : ''

    if (secret) {

      setupClientSecret.value = secret

      changeCardOpen.value = true

      return

    }

    paymentsErr.value =

      (await billingStepUpUserMessage(res)) || S.settingsBillingPaymentMethodFailed

  } finally {

    changeCardBusy.value = false

  }

}



function onPaymentMethodSaved(): void {

  closeChangeCard()

  paymentsOk.value = S.settingsBillingPaymentMethodUpdated

  void loadPaymentMethod()

}



function applyBillingFromProfile(): void {

  const d = profile.value

  if (!d) {

    return

  }

  companyName.value = d.company_name ?? ''

  registrationNumber.value = d.registration_number ?? ''

  taxId.value = d.tax_id ?? ''

  vatId.value = d.vat_id ?? ''

  const bd = d.billing_details

  billingAddress.value =

    bd && typeof bd.address === 'string' ? bd.address : ''

}



async function loadAccount(): Promise<void> {

  if (!user.value) {

    account.value = null

    usageLoading.value = false

    return

  }

  usageLoading.value = true

  try {

    const res = await api<BillingAccount>('/api/billing/account')

    account.value = res.ok && res.data ? res.data : null

  } finally {

    usageLoading.value = false

  }

}



function onSubscriptionRefreshed(): void {

  void Promise.all([loadAccount(), loadInvoices(), loadPaymentMethod()])

}



async function loadInvoices(): Promise<void> {

  if (!user.value) {

    return

  }

  invoicesLoading.value = true

  try {

    const res = await api<{ invoices: InvoiceRow[]; stripe_customer_linked?: boolean }>(

      '/api/payments/invoices',

    )

    invoices.value = res.data?.invoices ?? []

    stripeCustomerLinked.value = res.data?.stripe_customer_linked !== false

  } finally {

    invoicesLoading.value = false

  }

}



async function saveBillingDetails(): Promise<void> {
  savingBilling.value = true
  billingFormErr.value = ''
  try {
    const gate = await ensureRecentLoginForBilling()
    if (!gate.ok) {
      billingFormErr.value = gate.message
      return
    }
    let res = await api('/api/billing/account', {
      method: 'PATCH',
      body: {
        company_name: companyName.value.trim() || null,
        registration_number: registrationNumber.value.trim() || null,
        tax_id: taxId.value.trim() || null,
        vat_id: vatId.value.trim() || null,
        billing_details: {
          address: billingAddress.value.trim() || null,
        },
      },
    })
    if (!res.ok && isStepUpRequiredResponse(res) && (await tryRecoverFromStepUpRequired())) {
      res = await api('/api/billing/account', {
        method: 'PATCH',
        body: {
          company_name: companyName.value.trim() || null,
          registration_number: registrationNumber.value.trim() || null,
          tax_id: taxId.value.trim() || null,
          vat_id: vatId.value.trim() || null,
          billing_details: {
            address: billingAddress.value.trim() || null,
          },
        },
      })
    }
    if (res.ok) {
      await loadProfile()
      emit('saved')
    } else {
      const stepUpMsg = await billingStepUpUserMessage(res)
      billingFormErr.value = stepUpMsg || S.saveFailed
    }
  } finally {
    savingBilling.value = false
  }
}



watch(profile, applyBillingFromProfile, { immediate: true })



onMounted(async () => {

  await Promise.all([loadAccount(), loadInvoices(), loadPaymentMethod(), loadProfile()])

})

</script>

