<template>
  <div v-if="invoice" class="flex flex-col gap-5 font-dmSans">
    <section :class="settingsCardClass">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="m-0 text-xs font-semibold uppercase tracking-wide text-black/45">
            {{ S.settingsInvoiceDetailTitle }}
          </p>
          <h2 class="m-0 mt-1 font-dmSans text-2xl font-extrabold text-black">
            {{ invoice.number || invoice.id }}
          </h2>
        </div>
        <span
          v-if="statusLabel"
          class="inline-flex rounded-full px-3 py-1 text-xs font-bold"
          :class="statusBadgeClass"
        >
          {{ statusLabel }}
        </span>
      </div>
    </section>

    <section :class="settingsCardClass">
      <div class="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 class="form-label mb-2">{{ S.settingsInvoiceSupplier }}</h3>
          <p class="m-0 text-sm font-semibold text-black">{{ invoice.supplier.name }}</p>
          <p
            v-if="invoice.supplier.address"
            class="m-0 mt-1 whitespace-pre-line text-sm text-black/55"
          >
            {{ invoice.supplier.address }}
          </p>
          <ul class="m-0 mt-2 list-none space-y-0.5 p-0 text-sm text-black/55">
            <li v-if="invoice.supplier.ico">IČO: {{ invoice.supplier.ico }}</li>
            <li v-if="invoice.supplier.dic">DIČ: {{ invoice.supplier.dic }}</li>
            <li v-if="invoice.supplier.vat">IČ DPH: {{ invoice.supplier.vat }}</li>
            <li v-if="invoice.supplier.or" class="text-xs">{{ invoice.supplier.or }}</li>
          </ul>
          <p
            v-if="!invoice.supplier.configured"
            class="m-0 mt-2 text-xs text-black/45"
          >
            {{ S.settingsInvoiceSupplierPdfHint }}
          </p>
        </div>
        <div>
          <h3 class="form-label mb-2">{{ S.settingsInvoiceCustomer }}</h3>
          <p v-if="invoice.customer.name" class="m-0 text-sm font-semibold text-black">
            {{ invoice.customer.name }}
          </p>
          <p v-if="invoice.customer.email" class="m-0 mt-1 text-sm text-black/55">
            {{ invoice.customer.email }}
          </p>
          <p v-if="invoice.customer.address" class="m-0 mt-1 text-sm text-black/55">
            {{ invoice.customer.address }}
          </p>
          <ul
            v-if="buyerCustomFields.length"
            class="m-0 mt-2 list-none space-y-0.5 p-0 text-sm text-black/55"
          >
            <li
              v-for="field in buyerCustomFields"
              :key="field.name"
            >
              {{ field.name }}: {{ field.value }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section :class="settingsCardClass">
      <h3 class="form-label mb-3">{{ S.settingsInvoiceSymbolsAndDates }}</h3>
      <dl class="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-black/45">{{ S.settingsInvoiceVariableSymbol }}</dt>
          <dd class="m-0 mt-0.5 font-semibold text-black">
            {{ invoice.variable_symbol || invoice.number || '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-black/45">{{ S.settingsInvoiceIssued }}</dt>
          <dd class="m-0 mt-0.5 font-semibold text-black">
            {{ formatUnix(invoice.issued_at) }}
          </dd>
        </div>
        <div v-if="invoice.due_date">
          <dt class="text-black/45">{{ S.settingsInvoiceDue }}</dt>
          <dd class="m-0 mt-0.5 font-semibold text-black">
            {{ formatUnix(invoice.due_date) }}
          </dd>
        </div>
        <div>
          <dt class="text-black/45">{{ S.settingsInvoiceDelivery }}</dt>
          <dd class="m-0 mt-0.5 font-semibold text-black">
            {{ formatUnix(invoice.delivery_at) }}
          </dd>
        </div>
        <div v-if="invoice.subscription_period">
          <dt class="text-black/45">{{ S.settingsInvoiceSubscriptionPeriod }}</dt>
          <dd class="m-0 mt-0.5 font-semibold text-black">
            {{ formatPeriod(invoice.subscription_period) }}
          </dd>
        </div>
        <div>
          <dt class="text-black/45">{{ S.settingsInvoicePaymentMethod }}</dt>
          <dd class="m-0 mt-0.5 font-semibold text-black">
            {{ invoice.payment_method_label }}
          </dd>
        </div>
      </dl>
    </section>

    <section :class="settingsCardClass">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-black/10 text-left text-xs font-semibold uppercase tracking-wide text-black/45">
              <th class="pb-2 pr-3">{{ S.settingsInvoiceLineDescription }}</th>
              <th class="pb-2 pr-3 text-right">{{ S.settingsInvoiceLineQuantity }}</th>
              <th class="pb-2 pr-3 text-right">{{ S.settingsInvoiceLineUnit }}</th>
              <th class="pb-2 text-right">{{ S.settingsInvoiceLineAmount }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(line, idx) in invoice.lines"
              :key="idx"
              class="border-b border-black/[0.06]"
            >
              <td class="py-3 pr-3 text-black">{{ line.description }}</td>
              <td class="py-3 pr-3 text-right text-black/70">
                {{ line.quantity ?? '—' }}
              </td>
              <td class="py-3 pr-3 text-right text-black/70">
                {{ line.unit ?? '—' }}
              </td>
              <td class="py-3 text-right font-semibold text-black">
                {{ formatMoney(line.amount, line.currency) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <dl class="mt-4 space-y-2 border-t border-black/10 pt-4 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="text-black/55">{{ S.settingsInvoiceSubtotal }}</dt>
          <dd class="m-0 font-semibold text-black">
            {{ formatMoney(invoice.subtotal, invoice.currency) }}
          </dd>
        </div>
        <div v-if="invoice.tax > 0" class="flex justify-between gap-4">
          <dt class="text-black/55">{{ S.settingsInvoiceTax }}</dt>
          <dd class="m-0 font-semibold text-black">
            {{ formatMoney(invoice.tax, invoice.currency) }}
          </dd>
        </div>
        <div class="flex justify-between gap-4 text-base">
          <dt class="font-semibold text-black">{{ S.settingsInvoiceTotal }}</dt>
          <dd class="m-0 font-extrabold text-marketing-green">
            {{ formatMoney(invoice.total, invoice.currency) }}
          </dd>
        </div>
        <div
          v-if="invoice.status === 'open' && invoice.amount_due > 0"
          class="flex justify-between gap-4"
        >
          <dt class="text-black/55">{{ S.settingsInvoiceAmountDue }}</dt>
          <dd class="m-0 font-semibold text-black">
            {{ formatMoney(invoice.amount_due, invoice.currency) }}
          </dd>
        </div>
        <div
          v-if="invoice.amount_paid > 0"
          class="flex justify-between gap-4"
        >
          <dt class="text-black/55">{{ S.settingsInvoiceAmountPaid }}</dt>
          <dd class="m-0 font-semibold text-black">
            {{ formatMoney(invoice.amount_paid, invoice.currency) }}
          </dd>
        </div>
      </dl>
    </section>

    <p v-if="invoice.note" class="m-0 text-sm leading-relaxed text-black/55">
      <span class="font-semibold text-black/70">{{ S.settingsInvoiceNote }}:</span>
      {{ invoice.note }}
    </p>

    <p
      v-if="displayFooter"
      class="m-0 text-xs leading-relaxed text-black/45"
    >
      {{ displayFooter }}
    </p>

    <section v-if="invoice.can_pay && paySecret" :class="settingsCardClass">
      <SettingsInvoicePayForm
        :client-secret="paySecret"
        :return-url="returnUrl"
        @success="$emit('paid')"
      />
      <p class="mt-3 text-sm text-black/55">
        {{ S.settingsBillingPaymentMethodPastDueHint }}
        <NuxtLink
          to="/nastavenia/fakturacia#billing-payment-method"
          class="font-semibold text-marketing-green underline"
        >
          {{ S.settingsBillingPaymentMethodChange }}
        </NuxtLink>
      </p>
    </section>

    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <a
        v-if="invoice.invoice_pdf"
        :href="invoice.invoice_pdf"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-marketing-green px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 sm:w-auto"
      >
        {{ S.settingsInvoiceDownload }}
        <AppIcon name="arrow-right" :size="14" class="opacity-90" />
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { InvoiceDetail } from '~/types/invoice-detail'
import { S } from '~/utils/strings'

const props = defineProps<{
  invoice: InvoiceDetail
  returnUrl: string
}>()

defineEmits<{ paid: [] }>()

const { settingsCardClass } = useSettingsFormStyles()

const paySecret = computed(
  () => props.invoice.payment_intent_client_secret?.trim() || '',
)

const displayFooter = computed(() => props.invoice.footer?.trim() || '')

const buyerCustomFields = computed(() => props.invoice.customer.custom_fields)

const INVOICE_STATUS_LABELS: Record<string, string> = {
  paid: S.settingsInvoiceStatusPaid,
  open: S.settingsInvoiceStatusOpen,
  void: S.settingsInvoiceStatusVoid,
  draft: S.settingsInvoiceStatusDraft,
  uncollectible: S.settingsInvoiceStatusUncollectible,
}

const statusLabel = computed(() => {
  const s = props.invoice.status
  if (!s) return ''
  return INVOICE_STATUS_LABELS[s] ?? s
})

const statusBadgeClass = computed(() => {
  const s = props.invoice.status
  if (s === 'paid') {
    return 'bg-marketing-mint text-marketing-green ring-1 ring-marketing-green/25'
  }
  if (s === 'open') {
    return 'bg-amber-50 text-amber-950 ring-1 ring-amber-200'
  }
  return 'bg-marketing-surface text-black/70 ring-1 ring-black/10'
})

function formatPeriod(period: { start: number; end: number }): string {
  return `${formatUnix(period.start)} – ${formatUnix(period.end)}`
}

function formatUnix(ts: number): string {
  try {
    return new Intl.DateTimeFormat('sk-SK', { dateStyle: 'long' }).format(
      new Date(ts * 1000),
    )
  } catch {
    return String(ts)
  }
}

function formatMoney(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2)
  return `${amount} ${(currency || 'eur').toUpperCase()}`
}
</script>
