<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import ToggleButton from 'primevue/togglebutton'
import Dialog from 'primevue/dialog'
import { adminApi, adminApiDownload } from '../composables/adminApi'
import AdminPageHeader from '../components/layout/AdminPageHeader.vue'
import { PROMO_CAMPAIGN_PRESETS, getPresetById } from '../utils/promo-campaign-presets'
import {
  buildCampaignSummary,
  buildCampaignWarnings,
  formatSimulateReasons,
  getBlockingWarnings,
} from '../utils/promo-campaign-summary'
import { campaignChips } from '../utils/promo-campaign-list-labels'
import type { Campaign, CampaignForm, CampaignRedemption, CatalogPack, CatalogPlan, PromoPoolCode } from '../utils/promo-campaign-types'

type SimulateContext = 'signup' | 'first_publish' | 'credit_checkout' | 'subscription_checkout'

const loading = ref(true)
const saving = ref(false)
const simulating = ref(false)
const error = ref<string | null>(null)
const message = ref<string | null>(null)
const campaigns = ref<Campaign[]>([])
const creditPacks = ref<CatalogPack[]>([])
const subscriptionPlans = ref<CatalogPlan[]>([])
const editingId = ref<string | null>(null)
const showCreate = ref(false)
const showPresetPicker = ref(false)
const selectedPresetId = ref('blank')

const simulateContext = ref<SimulateContext>('signup')
const simulateCode = ref('')
const simulateAccountAgeHours = ref(24)
const simulateHasPublished = ref(false)
const simulatePackSlug = ref<string | null>(null)
const simulatePlanSlug = ref<string | null>(null)
const simulateAlreadyRedeemed = ref(false)
const simulateResult = ref<{ valid: boolean; reasons: string[] } | null>(null)
const showArchived = ref(false)
const redemptionsOpen = ref(false)
const redemptionsLoading = ref(false)
const redemptionsCampaign = ref<Campaign | null>(null)
const redemptions = ref<CampaignRedemption[]>([])
const redemptionsCursor = ref<string | null>(null)

const simulateProfileRole = ref<'company' | 'individual'>('individual')
const simulateHasPriorSubscription = ref(false)
const simulatePoolCodeAvailable = ref(true)

const poolCodes = ref<PromoPoolCode[]>([])
const poolCodesLoading = ref(false)
const poolCounts = ref({ available: 0, redeemed: 0, disabled: 0 })
const poolCodesCursor = ref<string | null>(null)
const poolGenerateOpen = ref(false)
const poolGenerateCount = ref(10)
const poolGeneratePrefix = ref('')
const poolGenerating = ref(false)
const poolPatchingId = ref<string | null>(null)

const showNewAccountEligibility = computed(() => {
  if (form.reward_type !== 'free_credits') return true
  return form.grant_timing === 'first_publish'
})

const isCheckoutDiscountCampaign = computed(
  () =>
    form.reward_type === 'credit_pack_discount' ||
    form.reward_type === 'subscription_discount',
)

const codeModeOptions = [
  { label: 'Zdieľaný kód', value: 'shared' as const },
  { label: 'Pool unikátnych kódov', value: 'unique_pool' as const },
]

const rewardTypeOptions = [
  { label: 'Bezplatné kredity', value: 'free_credits' as const },
  { label: 'Zľava na balíky kreditov', value: 'credit_pack_discount' as const },
  { label: 'Zľava na predplatné', value: 'subscription_discount' as const },
]

const durationOptions = [
  { label: 'Len prvá platba', value: 'once' as const },
  { label: 'Všetky opakované platby', value: 'forever' as const },
  { label: 'Opakovaná (N mesiacov)', value: 'repeating' as const },
]

const grantTimingOptions = [
  { label: 'Pri registrácii', value: 'signup' as const },
  { label: 'Po prvom zverejnení inzerátu', value: 'first_publish' as const },
]

const simulateContextOptions = [
  { label: 'Registrácia', value: 'signup' as const },
  { label: 'Prvé zverejnenie', value: 'first_publish' as const },
  { label: 'Nákup kreditov', value: 'credit_checkout' as const },
  { label: 'Predplatné', value: 'subscription_checkout' as const },
]

const discountKindOptions = [
  { label: 'Percentá', value: 'percent' as const },
  { label: 'Pevná suma (centy)', value: 'amount_off' as const },
]

const eligibleRoleOptions = [
  { label: 'Všetci', value: 'both' as const },
  { label: 'Firmy', value: 'company' as const },
  { label: 'Fyzické osoby', value: 'individual' as const },
]

const simulateProfileRoleOptions = [
  { label: 'Firma', value: 'company' as const },
  { label: 'Fyzická osoba', value: 'individual' as const },
]

function defaultForm(): CampaignForm {
  const now = new Date()
  const monthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  return {
    code: '',
    name: '',
    enabled: false,
    code_mode: 'shared',
    unlimitedRedemptions: true,
    max_redemptions: 50,
    unlimitedTime: true,
    starts_at: toLocalInput(now),
    ends_at: toLocalInput(monthLater),
    reward_type: 'free_credits',
    reward_credits: 20,
    discount_kind: 'percent',
    reward_percent: 10,
    reward_amount_cents: 500,
    reward_all_credit_packs: true,
    reward_credit_pack_slugs: [],
    reward_all_subscription_plans: true,
    reward_subscription_plan_slugs: [],
    subscription_discount_duration: 'once',
    subscription_discount_duration_months: 3,
    grant_timing: 'signup',
    require_new_account: true,
    new_account_max_hours: 48,
    require_first_publish: false,
    require_promo_code: true,
    eligible_profile_role: 'both',
    require_no_prior_subscription: false,
    require_no_published_offer: false,
  }
}

const form = reactive<CampaignForm>(defaultForm())

const summaryLines = computed(() => buildCampaignSummary(form))
const formWarnings = computed(() => buildCampaignWarnings(form, !!editingId.value))
const blockingWarnings = computed(() => getBlockingWarnings(form, !!editingId.value))

const defaultSimulateContext = computed((): SimulateContext => {
  if (form.reward_type === 'credit_pack_discount') return 'credit_checkout'
  if (form.reward_type === 'subscription_discount') return 'subscription_checkout'
  return form.grant_timing === 'first_publish' ? 'first_publish' : 'signup'
})

watch(
  () => form.reward_type,
  (type) => {
    form.require_promo_code = true
    if (type !== 'free_credits') {
      form.require_first_publish = false
      form.grant_timing = 'signup'
      if (!form.discount_kind) form.discount_kind = 'percent'
    }
    simulateContext.value = defaultSimulateContext.value
  },
)

watch(
  () => form.grant_timing,
  () => {
    if (form.reward_type === 'free_credits') {
      simulateContext.value = defaultSimulateContext.value
    }
  },
)

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInput(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const d = new Date(trimmed)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function toLocalFromIso(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : toLocalInput(d)
}

function campaignToForm(c: Campaign): CampaignForm {
  return {
    code: c.code,
    name: c.name,
    enabled: c.enabled,
    code_mode: c.code_mode ?? 'shared',
    unlimitedRedemptions: c.max_redemptions == null,
    max_redemptions: c.max_redemptions ?? 50,
    unlimitedTime: !c.starts_at && !c.ends_at,
    starts_at: toLocalFromIso(c.starts_at) || toLocalInput(new Date()),
    ends_at: toLocalFromIso(c.ends_at) || toLocalInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    reward_type: c.reward_type,
    reward_credits: c.reward_credits ?? 20,
    discount_kind: c.discount_kind ?? 'percent',
    reward_percent: c.reward_percent ?? 10,
    reward_amount_cents: c.reward_amount_cents ?? 500,
    reward_all_credit_packs: c.reward_all_credit_packs,
    reward_credit_pack_slugs: [...(c.reward_credit_pack_slugs ?? [])],
    reward_all_subscription_plans: c.reward_all_subscription_plans,
    reward_subscription_plan_slugs: [...(c.reward_subscription_plan_slugs ?? [])],
    subscription_discount_duration: c.subscription_discount_duration ?? 'once',
    subscription_discount_duration_months: c.subscription_discount_duration_months ?? 3,
    grant_timing: c.require_first_publish ? 'first_publish' : 'signup',
    require_new_account: c.require_new_account,
    new_account_max_hours: c.new_account_max_hours,
    require_first_publish: c.require_first_publish,
    require_promo_code: c.require_promo_code,
    eligible_profile_role: c.eligible_profile_role ?? 'both',
    require_no_prior_subscription: c.require_no_prior_subscription ?? false,
    require_no_published_offer: c.require_no_published_offer ?? false,
  }
}

function buildPayload(): Record<string, unknown> {
  const requireFirstPublish =
    form.reward_type === 'free_credits' && form.grant_timing === 'first_publish'
  const payload: Record<string, unknown> = {
    code: form.code.trim(),
    name: form.name.trim(),
    enabled: form.enabled,
    max_redemptions: form.unlimitedRedemptions ? null : form.max_redemptions,
    starts_at: form.unlimitedTime ? null : fromLocalInput(form.starts_at),
    ends_at: form.unlimitedTime ? null : fromLocalInput(form.ends_at),
    reward_type: form.reward_type,
    reward_credits: form.reward_type === 'free_credits' ? form.reward_credits : undefined,
    reward_all_credit_packs: form.reward_all_credit_packs,
    reward_credit_pack_slugs: form.reward_all_credit_packs ? [] : form.reward_credit_pack_slugs,
    reward_all_subscription_plans: form.reward_all_subscription_plans,
    reward_subscription_plan_slugs: form.reward_all_subscription_plans
      ? []
      : form.reward_subscription_plan_slugs,
    subscription_discount_duration:
      form.reward_type === 'subscription_discount' ? form.subscription_discount_duration : undefined,
    subscription_discount_duration_months:
      form.reward_type === 'subscription_discount' &&
      form.subscription_discount_duration === 'repeating'
        ? form.subscription_discount_duration_months
        : undefined,
    code_mode: form.code_mode,
    require_new_account: form.require_new_account,
    new_account_max_hours: form.require_new_account ? form.new_account_max_hours : 48,
    require_first_publish: requireFirstPublish,
    require_promo_code: true,
    eligible_profile_role: form.eligible_profile_role,
    require_no_prior_subscription:
      form.reward_type === 'subscription_discount'
        ? form.require_no_prior_subscription
        : false,
    require_no_published_offer:
      form.reward_type !== 'free_credits' ? form.require_no_published_offer : false,
  }
  if (form.reward_type !== 'free_credits') {
    payload.discount_kind = form.discount_kind
    if (form.discount_kind === 'amount_off') {
      payload.reward_amount_cents = form.reward_amount_cents
      payload.reward_percent = null
    } else {
      payload.reward_percent = form.reward_percent
      payload.reward_amount_cents = null
    }
  }
  return payload
}

const formTitle = computed(() =>
  editingId.value ? 'Upraviť kampaň' : 'Nová promo kampaň',
)

function openCreateFlow() {
  showPresetPicker.value = true
  showCreate.value = false
  editingId.value = null
  selectedPresetId.value = 'blank'
}

function applyPresetAndOpenForm() {
  const preset = getPresetById(selectedPresetId.value)
  Object.assign(form, defaultForm(), preset?.defaults ?? {})
  if (preset?.id === 'new_user_subscription') {
    const start = new Date()
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
    form.unlimitedTime = false
    form.starts_at = toLocalInput(start)
    form.ends_at = toLocalInput(end)
  }
  simulateCode.value = form.code.trim()
  simulateContext.value = defaultSimulateContext.value
  showPresetPicker.value = false
  showCreate.value = true
}

function resetCreateForm() {
  openCreateFlow()
}

function startEdit(campaign: Campaign) {
  Object.assign(form, campaignToForm(campaign))
  editingId.value = campaign.id
  showPresetPicker.value = false
  showCreate.value = true
  simulateCode.value = campaign.code
  simulateContext.value = defaultSimulateContext.value
  simulateResult.value = null
  poolCodes.value = []
  poolCodesCursor.value = null
  if (form.code_mode === 'unique_pool') {
    void loadPoolCodes()
  }
}

function cloneCampaign(campaign: Campaign) {
  const cloned = campaignToForm(campaign)
  const suffix = '_COPY'
  const base = campaign.code.slice(0, Math.max(1, 64 - suffix.length))
  cloned.code = `${base}${suffix}`
  cloned.enabled = false
  cloned.name = `${campaign.name} (kópia)`
  Object.assign(form, cloned)
  editingId.value = null
  showPresetPicker.value = false
  showCreate.value = true
  simulateCode.value = cloned.code
  simulateResult.value = null
}

function cancelForm() {
  showCreate.value = false
  showPresetPicker.value = false
  editingId.value = null
  Object.assign(form, defaultForm())
  simulateResult.value = null
}

function applyOneMonthPreset() {
  const start = new Date()
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000)
  form.unlimitedTime = false
  form.starts_at = toLocalInput(start)
  form.ends_at = toLocalInput(end)
}

function togglePackSlug(slug: string, checked: boolean) {
  const set = new Set(form.reward_credit_pack_slugs)
  if (checked) set.add(slug)
  else set.delete(slug)
  form.reward_credit_pack_slugs = [...set]
}

function togglePlanSlug(slug: string, checked: boolean) {
  const set = new Set(form.reward_subscription_plan_slugs)
  if (checked) set.add(slug)
  else set.delete(slug)
  form.reward_subscription_plan_slugs = [...set]
}

async function loadData() {
  loading.value = true
  error.value = null
  const listPath = showArchived.value
    ? '/admin/promo-campaigns?include_archived=1'
    : '/admin/promo-campaigns'
  const [listRes, catalogRes] = await Promise.all([
    adminApi<{ items?: Campaign[] }>(listPath),
    adminApi<{ credit_packs?: CatalogPack[]; subscription_plans?: CatalogPlan[] }>(
      '/admin/promo-campaigns/catalog',
    ),
  ])
  loading.value = false
  if (!listRes.ok) {
    error.value = listRes.body.slice(0, 200) || `HTTP ${listRes.status}`
    campaigns.value = []
    return
  }
  campaigns.value = listRes.data?.items ?? []
  if (catalogRes.ok && catalogRes.data) {
    creditPacks.value = catalogRes.data.credit_packs ?? []
    subscriptionPlans.value = catalogRes.data.subscription_plans ?? []
  }
}

async function setCampaignArchived(campaign: Campaign, archived: boolean) {
  error.value = null
  const res = await adminApi<Campaign>(`/admin/promo-campaigns/${campaign.id}`, {
    method: 'PATCH',
    body: { archived },
  })
  if (!res.ok) {
    error.value = res.body.slice(0, 300) || `HTTP ${res.status}`
    return
  }
  message.value = archived ? 'Kampaň archivovaná.' : 'Kampaň obnovená.'
  await loadData()
}

async function openRedemptions(campaign: Campaign) {
  redemptionsCampaign.value = campaign
  redemptionsOpen.value = true
  redemptions.value = []
  redemptionsCursor.value = null
  await loadRedemptionsPage()
}

async function loadRedemptionsPage(append = false) {
  if (!redemptionsCampaign.value) return
  redemptionsLoading.value = true
  const params = new URLSearchParams({ limit: '50' })
  if (append && redemptionsCursor.value) {
    params.set('cursor', redemptionsCursor.value)
  }
  const res = await adminApi<{
    items?: CampaignRedemption[]
    next_cursor?: string | null
  }>(`/admin/promo-campaigns/${redemptionsCampaign.value.id}/redemptions?${params}`)
  redemptionsLoading.value = false
  if (!res.ok) {
    error.value = res.body.slice(0, 300) || `HTTP ${res.status}`
    return
  }
  const items = res.data?.items ?? []
  redemptions.value = append ? [...redemptions.value, ...items] : items
  redemptionsCursor.value = res.data?.next_cursor ?? null
}

function formatRedemptionReward(row: CampaignRedemption): string {
  if (row.credits_granted != null) return `${row.credits_granted} kr`
  if (row.amount_applied_cents != null) {
    return `${(row.amount_applied_cents / 100).toFixed(2)} €`
  }
  if (row.percent_applied != null) return `${row.percent_applied}%`
  return '—'
}

async function loadPoolCodes(append = false) {
  if (!editingId.value) return
  poolCodesLoading.value = true
  const params = new URLSearchParams({ limit: '50' })
  if (append && poolCodesCursor.value) {
    params.set('cursor', poolCodesCursor.value)
  }
  const res = await adminApi<{
    items?: PromoPoolCode[]
    next_cursor?: string | null
    counts?: { available: number; redeemed: number; disabled: number }
  }>(`/admin/promo-campaigns/${editingId.value}/codes?${params}`)
  poolCodesLoading.value = false
  if (!res.ok) {
    error.value = res.body.slice(0, 300) || `HTTP ${res.status}`
    return
  }
  const items = res.data?.items ?? []
  poolCodes.value = append ? [...poolCodes.value, ...items] : items
  poolCodesCursor.value = res.data?.next_cursor ?? null
  if (res.data?.counts) {
    poolCounts.value = res.data.counts
  }
}

async function generatePoolCodes() {
  if (!editingId.value) {
    error.value = 'Najprv uložte kampaň, potom generujte kódy.'
    return
  }
  poolGenerating.value = true
  error.value = null
  const res = await adminApi<{ created?: number; total_available?: number }>(
    `/admin/promo-campaigns/${editingId.value}/codes/generate`,
    {
      method: 'POST',
      body: {
        count: poolGenerateCount.value,
        prefix: poolGeneratePrefix.value.trim() || undefined,
      },
    },
  )
  poolGenerating.value = false
  if (!res.ok) {
    error.value = res.body.slice(0, 300) || `HTTP ${res.status}`
    return
  }
  message.value = `Vygenerovaných ${res.data?.created ?? 0} kódov.`
  poolGenerateOpen.value = false
  await loadPoolCodes()
  await loadData()
}

async function exportPoolCsv() {
  if (!editingId.value) return
  const result = await adminApiDownload(
    `/admin/promo-campaigns/${editingId.value}/codes/export`,
    { filename: `promo-pool-${editingId.value}.csv` },
  )
  if (!result.ok) {
    error.value = result.body.slice(0, 300) || 'Export zlyhal'
  }
}

async function patchPoolCodeStatus(row: PromoPoolCode, status: 'disabled' | 'available') {
  if (!editingId.value) return
  poolPatchingId.value = row.id
  error.value = null
  const res = await adminApi<{ ok?: boolean }>(
    `/admin/promo-campaigns/${editingId.value}/codes/${row.id}`,
    { method: 'PATCH', body: { status } },
  )
  poolPatchingId.value = null
  if (!res.ok) {
    error.value = res.body.slice(0, 300) || `HTTP ${res.status}`
    return
  }
  await loadPoolCodes()
}

async function saveForm() {
  if (!form.code.trim() || !form.name.trim()) {
    error.value = 'Vyplňte kód a názov kampane.'
    return
  }
  const blocking = blockingWarnings.value
  if (blocking.length > 0) {
    error.value = blocking[0].message
    return
  }
  saving.value = true
  message.value = null
  error.value = null
  const payload = buildPayload()
  const res = editingId.value
    ? await adminApi<Campaign>(`/admin/promo-campaigns/${editingId.value}`, {
        method: 'PATCH',
        body: payload,
      })
    : await adminApi<Campaign>('/admin/promo-campaigns', {
        method: 'POST',
        body: payload,
      })
  saving.value = false
  if (!res.ok) {
    error.value = res.body.slice(0, 300) || `HTTP ${res.status}`
    return
  }
  message.value = editingId.value ? 'Kampaň uložená.' : 'Kampaň vytvorená.'
  const savedId = res.data?.id ?? editingId.value
  if (savedId && form.code_mode === 'unique_pool') {
    editingId.value = savedId
    await loadPoolCodes()
  } else {
    cancelForm()
  }
  await loadData()
}

async function runSimulate() {
  simulating.value = true
  simulateResult.value = null
  const scenario: Record<string, unknown> = {
    context: simulateContext.value,
    code: simulateCode.value.trim() || form.code.trim() || undefined,
    account_age_hours: simulateAccountAgeHours.value,
    has_published: simulateHasPublished.value,
    already_redeemed: simulateAlreadyRedeemed.value,
    profile_role: simulateProfileRole.value,
    has_prior_subscription: simulateHasPriorSubscription.value,
  }
  if (form.code_mode === 'unique_pool') {
    scenario.pool_code_available = simulatePoolCodeAvailable.value
  }
  if (simulateContext.value === 'credit_checkout' && simulatePackSlug.value) {
    scenario.pack_slug = simulatePackSlug.value
  }
  if (simulateContext.value === 'subscription_checkout' && simulatePlanSlug.value) {
    scenario.plan_slug = simulatePlanSlug.value
  }
  const body: Record<string, unknown> = {
    campaign: buildPayload(),
    scenario,
  }
  if (editingId.value) {
    body.campaign_id = editingId.value
  }
  const res = await adminApi<{ valid?: boolean; reasons?: string[] }>(
    '/admin/promo-campaigns/simulate',
    { method: 'POST', body },
  )
  simulating.value = false
  if (!res.ok) {
    error.value = res.body.slice(0, 300) || `HTTP ${res.status}`
    return
  }
  simulateResult.value = {
    valid: res.data?.valid === true,
    reasons: res.data?.reasons ?? [],
  }
}

watch(showArchived, () => {
  void loadData()
})

onMounted(() => {
  void loadData()
})
</script>

<template>
  <div class="admin-page max-w-5xl">
    <AdminPageHeader
      title="Promo kódy"
      subtitle="Šablóny, súhrn kampane, simulátor oprávnenosti a správa promo akcií."
    />

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <Button label="Nová kampaň" icon="pi pi-plus" @click="openCreateFlow" />
      <ToggleButton
        v-model="showArchived"
        on-label="Skryť archivované"
        off-label="Zobraziť archivované"
      />
    </div>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    <Message v-if="message" severity="success" :closable="false">{{ message }}</Message>

    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <section v-else-if="campaigns.length === 0" class="admin-section-card">
      <p class="m-0 text-sm text-slate-500">Zatiaľ žiadne kampane. Vytvorte prvú.</p>
    </section>

    <section
      v-for="campaign in campaigns"
      v-else
      :key="campaign.id"
      class="admin-section-card"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="admin-section-title m-0">{{ campaign.code }}</h2>
          <p class="m-0 mt-1 text-sm text-slate-600">{{ campaign.name }}</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="chip in campaignChips(campaign)"
              :key="chip"
              class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
            >
              {{ chip }}
            </span>
          </div>
          <p class="m-0 mt-2 text-sm text-slate-500">
            Uplatnené:
            {{ campaign.redemption_count }}
            <template v-if="campaign.max_redemptions != null">
              / {{ campaign.max_redemptions }}
            </template>
            <template v-else> (neobmedzene)</template>
            <template
              v-if="campaign.code_mode === 'unique_pool' && campaign.pool_available != null"
            >
              · Pool: {{ campaign.pool_available }} voľných
              <template v-if="campaign.pool_redeemed != null">
                / {{ campaign.pool_redeemed }} uplatnených
              </template>
            </template>
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="rounded-full px-2 py-0.5 text-xs font-semibold"
            :class="
              campaign.archived_at
                ? 'bg-amber-100 text-amber-800'
                : campaign.enabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-slate-100 text-slate-600'
            "
          >
            {{
              campaign.archived_at
                ? 'Archivovaná'
                : campaign.enabled
                  ? 'Aktívna'
                  : 'Neaktívna'
            }}
          </span>
          <Button
            label="Uplatnenia"
            size="small"
            severity="secondary"
            outlined
            @click="openRedemptions(campaign)"
          />
          <Button
            v-if="!campaign.archived_at"
            label="Archivovať"
            size="small"
            severity="secondary"
            outlined
            @click="setCampaignArchived(campaign, true)"
          />
          <Button
            v-else
            label="Obnoviť"
            size="small"
            outlined
            @click="setCampaignArchived(campaign, false)"
          />
          <Button label="Duplikovať" size="small" severity="secondary" outlined @click="cloneCampaign(campaign)" />
          <Button label="Upraviť" size="small" outlined @click="startEdit(campaign)" />
        </div>
      </div>
    </section>

    <section v-if="showPresetPicker" class="admin-section-card mt-6">
      <h2 class="admin-section-title">Vyberte šablónu</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="preset in PROMO_CAMPAIGN_PRESETS"
          :key="preset.id"
          type="button"
          class="rounded-lg border p-4 text-left transition-colors"
          :class="
            selectedPresetId === preset.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 hover:border-slate-300'
          "
          @click="selectedPresetId = preset.id"
        >
          <p class="m-0 font-semibold text-slate-800">{{ preset.label }}</p>
          <p class="m-0 mt-1 text-sm text-slate-500">{{ preset.description }}</p>
        </button>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <Button label="Pokračovať" @click="applyPresetAndOpenForm" />
        <Button label="Zrušiť" severity="secondary" outlined @click="showPresetPicker = false" />
      </div>
    </section>

    <section v-if="showCreate" class="admin-section-card mt-6">
      <h2 class="admin-section-title">{{ formTitle }}</h2>

      <div class="grid gap-6 lg:grid-cols-3">
        <div class="grid gap-4 lg:col-span-2">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-slate-700">Kód</label>
              <InputText v-model="form.code" class="uppercase" placeholder="FIRSTTIME" />
              <p v-if="form.code_mode === 'unique_pool'" class="m-0 text-xs text-slate-500">
                Interný názov kampane — používatelia zadávajú vygenerované kódy z poolu.
              </p>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-slate-700">Interný názov</label>
              <InputText v-model="form.name" placeholder="50 % na predplatné pre nových" />
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-slate-700">Režim kódu</label>
            <Select
              v-model="form.code_mode"
              :options="codeModeOptions"
              option-label="label"
              option-value="value"
              class="max-w-md"
            />
          </div>

          <div class="flex items-center gap-2">
            <ToggleButton
              v-model="form.enabled"
              on-label="Aktívna"
              off-label="Neaktívna"
              on-icon="pi pi-check"
              off-icon="pi pi-times"
            />
          </div>

          <div class="border-t border-slate-200 pt-4">
            <h3 class="m-0 mb-3 text-sm font-semibold text-slate-800">Limity</h3>
            <div class="flex flex-wrap items-center gap-3">
              <ToggleButton
                v-model="form.unlimitedRedemptions"
                on-label="Neobmedzené uplatnenia"
                off-label="Limit uplatnení"
              />
              <InputText
                v-if="!form.unlimitedRedemptions"
                :model-value="String(form.max_redemptions)"
                type="number"
                class="max-w-[8rem]"
                min="1"
                @update:model-value="form.max_redemptions = Number($event) || 1"
              />
            </div>
          </div>

          <div class="border-t border-slate-200 pt-4">
            <h3 class="m-0 mb-3 text-sm font-semibold text-slate-800">Čas</h3>
            <div class="flex flex-wrap items-center gap-3">
              <ToggleButton
                v-model="form.unlimitedTime"
                on-label="Bez časového limitu"
                off-label="Časové okno"
              />
              <Button
                v-if="!form.unlimitedTime"
                label="Predvolenie 1 mesiac"
                size="small"
                outlined
                @click="applyOneMonthPreset"
              />
            </div>
            <div v-if="!form.unlimitedTime" class="mt-3 grid gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">Začiatok</label>
                <InputText v-model="form.starts_at" type="datetime-local" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">Koniec</label>
                <InputText v-model="form.ends_at" type="datetime-local" />
              </div>
            </div>
          </div>

          <div class="border-t border-slate-200 pt-4">
            <h3 class="m-0 mb-3 text-sm font-semibold text-slate-800">Odmena</h3>
            <Select
              v-model="form.reward_type"
              :options="rewardTypeOptions"
              option-label="label"
              option-value="value"
              class="max-w-md"
            />

            <div v-if="form.reward_type === 'free_credits'" class="mt-3 flex flex-col gap-1">
              <label class="text-sm font-medium text-slate-700">Počet kreditov</label>
              <InputText
                :model-value="String(form.reward_credits)"
                type="number"
                class="max-w-xs"
                min="1"
                max="500"
                @update:model-value="form.reward_credits = Number($event) || 1"
              />
            </div>

            <template v-else-if="form.reward_type === 'credit_pack_discount'">
              <div class="mt-3 flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">Typ zľavy</label>
                <Select
                  v-model="form.discount_kind"
                  :options="discountKindOptions"
                  option-label="label"
                  option-value="value"
                  class="max-w-md"
                />
              </div>
              <div v-if="form.discount_kind === 'percent'" class="mt-3 flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">Zľava (%)</label>
                <InputText
                  :model-value="String(form.reward_percent)"
                  type="number"
                  class="max-w-xs"
                  min="1"
                  max="100"
                  @update:model-value="form.reward_percent = Number($event) || 1"
                />
              </div>
              <div v-else class="mt-3 flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">Zľava (centy, napr. 500 = 5 €)</label>
                <InputText
                  :model-value="String(form.reward_amount_cents)"
                  type="number"
                  class="max-w-xs"
                  min="1"
                  max="50000"
                  @update:model-value="form.reward_amount_cents = Number($event) || 1"
                />
              </div>
              <div class="mt-3 flex items-center gap-2">
                <ToggleButton
                  v-model="form.reward_all_credit_packs"
                  on-label="Všetky balíky"
                  off-label="Vybrané balíky"
                />
              </div>
              <div v-if="!form.reward_all_credit_packs" class="mt-2 flex flex-col gap-1">
                <label
                  v-for="pack in creditPacks"
                  :key="pack.slug"
                  class="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    :checked="form.reward_credit_pack_slugs.includes(pack.slug)"
                    @change="togglePackSlug(pack.slug, ($event.target as HTMLInputElement).checked)"
                  />
                  {{ pack.name_sk }} ({{ pack.credits }} kr.)
                </label>
              </div>
            </template>

            <template v-else>
              <div class="mt-3 flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">Typ zľavy</label>
                <Select
                  v-model="form.discount_kind"
                  :options="discountKindOptions"
                  option-label="label"
                  option-value="value"
                  class="max-w-md"
                />
              </div>
              <div v-if="form.discount_kind === 'percent'" class="mt-3 flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">Zľava (%)</label>
                <InputText
                  :model-value="String(form.reward_percent)"
                  type="number"
                  class="max-w-xs"
                  min="1"
                  max="100"
                  @update:model-value="form.reward_percent = Number($event) || 1"
                />
              </div>
              <div v-else class="mt-3 flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">Zľava (centy, napr. 500 = 5 €)</label>
                <InputText
                  :model-value="String(form.reward_amount_cents)"
                  type="number"
                  class="max-w-xs"
                  min="1"
                  max="50000"
                  @update:model-value="form.reward_amount_cents = Number($event) || 1"
                />
              </div>
              <div class="mt-3 flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">Trvanie zľavy</label>
                <Select
                  v-model="form.subscription_discount_duration"
                  :options="durationOptions"
                  option-label="label"
                  option-value="value"
                  class="max-w-md"
                />
              </div>
              <div
                v-if="form.subscription_discount_duration === 'repeating'"
                class="mt-3 flex flex-col gap-1"
              >
                <label class="text-sm font-medium text-slate-700">Počet mesiacov (1–36)</label>
                <InputText
                  :model-value="String(form.subscription_discount_duration_months)"
                  type="number"
                  class="max-w-xs"
                  min="1"
                  max="36"
                  @update:model-value="
                    form.subscription_discount_duration_months = Number($event) || 1
                  "
                />
              </div>
              <div class="mt-3 flex items-center gap-2">
                <ToggleButton
                  v-model="form.reward_all_subscription_plans"
                  on-label="Všetky plány"
                  off-label="Vybrané plány"
                />
              </div>
              <div v-if="!form.reward_all_subscription_plans" class="mt-2 flex flex-col gap-1">
                <label
                  v-for="plan in subscriptionPlans"
                  :key="plan.slug"
                  class="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    :checked="form.reward_subscription_plan_slugs.includes(plan.slug)"
                    @change="togglePlanSlug(plan.slug, ($event.target as HTMLInputElement).checked)"
                  />
                  {{ plan.name_sk }}
                </label>
              </div>
            </template>
          </div>

          <div
            v-if="form.code_mode === 'unique_pool' && editingId"
            class="border-t border-slate-200 pt-4"
          >
            <h3 class="m-0 mb-3 text-sm font-semibold text-slate-800">Kódy v poole</h3>
            <p class="m-0 mb-3 text-sm text-slate-500">
              Dostupné: {{ poolCounts.available }} · Uplatnené: {{ poolCounts.redeemed }}
              <template v-if="poolCounts.disabled > 0">
                · Zakázané: {{ poolCounts.disabled }}
              </template>
            </p>
            <div class="mb-3 flex flex-wrap gap-2">
              <Button label="Vygenerovať" size="small" @click="poolGenerateOpen = true" />
              <Button
                label="Export CSV"
                size="small"
                severity="secondary"
                outlined
                :disabled="poolCodes.length === 0"
                @click="exportPoolCsv"
              />
            </div>
            <div v-if="poolCodesLoading && poolCodes.length === 0" class="py-4 text-center">
              <ProgressSpinner style="width: 2rem; height: 2rem" />
            </div>
            <div v-else-if="poolCodes.length === 0" class="text-sm text-slate-500">
              Zatiaľ žiadne kódy. Vygenerujte prvú dávku.
            </div>
            <table v-else class="w-full text-left text-sm">
              <thead>
                <tr class="border-b text-slate-600">
                  <th class="py-2 pr-2">Kód</th>
                  <th class="py-2 pr-2">Stav</th>
                  <th class="py-2 pr-2">Uplatnené</th>
                  <th class="py-2">Akcia</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in poolCodes" :key="row.id" class="border-b border-slate-100">
                  <td class="py-2 pr-2 font-mono">{{ row.code }}</td>
                  <td class="py-2 pr-2">{{ row.status }}</td>
                  <td class="py-2 pr-2">{{ row.redeemed_at ? new Date(row.redeemed_at).toLocaleString() : '—' }}</td>
                  <td class="py-2">
                    <Button
                      v-if="row.status === 'available'"
                      label="Zakázať"
                      size="small"
                      severity="secondary"
                      outlined
                      :loading="poolPatchingId === row.id"
                      @click="patchPoolCodeStatus(row, 'disabled')"
                    />
                    <Button
                      v-else-if="row.status === 'disabled'"
                      label="Povoliť"
                      size="small"
                      outlined
                      :loading="poolPatchingId === row.id"
                      @click="patchPoolCodeStatus(row, 'available')"
                    />
                    <span v-else class="text-xs text-slate-400">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <Button
              v-if="poolCodesCursor"
              label="Načítať viac"
              size="small"
              class="mt-3"
              outlined
              :loading="poolCodesLoading"
              @click="loadPoolCodes(true)"
            />
          </div>
          <p
            v-else-if="form.code_mode === 'unique_pool' && !editingId"
            class="m-0 border-t border-slate-200 pt-4 text-sm text-slate-500"
          >
            Uložte kampaň, potom tu vygenerujete kódy v poole.
          </p>

          <div class="border-t border-slate-200 pt-4">
            <h3 class="m-0 mb-3 text-sm font-semibold text-slate-800">Oprávnenosť</h3>

            <div class="mb-3 flex flex-col gap-1">
              <label class="text-sm font-medium text-slate-700">Typ účtu</label>
              <Select
                v-model="form.eligible_profile_role"
                :options="eligibleRoleOptions"
                option-label="label"
                option-value="value"
                class="max-w-md"
              />
            </div>

            <template v-if="form.reward_type === 'free_credits'">
              <p class="m-0 mb-3 text-sm text-slate-500">
                Kód zadá používateľ pri registrácii.
              </p>
              <div class="mb-3 flex flex-col gap-1">
                <label class="text-sm font-medium text-slate-700">Kedy pripísať kredity</label>
                <Select
                  v-model="form.grant_timing"
                  :options="grantTimingOptions"
                  option-label="label"
                  option-value="value"
                  class="max-w-md"
                />
              </div>
              <label
                v-if="showNewAccountEligibility"
                class="flex flex-wrap items-center gap-2 text-sm"
              >
                <input v-model="form.require_new_account" type="checkbox" />
                Nový účet (max. hodín od registrácie)
                <InputText
                  v-if="form.require_new_account"
                  :model-value="String(form.new_account_max_hours)"
                  type="number"
                  class="max-w-[6rem]"
                  min="1"
                  max="8760"
                  @update:model-value="form.new_account_max_hours = Number($event) || 48"
                />
              </label>
              <p
                v-else
                class="m-0 text-xs text-slate-500"
              >
                Pri okamžitom pripísaní kreditov po registrácii sa vek účtu kontroluje až pri
                uplatnení (napr. po potvrdení e-mailu). Pre oneskorené uplatnenie zapnite
                „Po prvom zverejnení inzerátu“ alebo podmienku nového účtu.
              </p>
            </template>

            <template v-else>
              <p class="m-0 mb-3 text-sm text-slate-500">
                Kód zadá používateľ pri platbe v pokladni.
              </p>
              <label class="flex flex-wrap items-center gap-2 text-sm">
                <input v-model="form.require_new_account" type="checkbox" />
                Nový účet (max. hodín od registrácie)
                <InputText
                  v-if="form.require_new_account"
                  :model-value="String(form.new_account_max_hours)"
                  type="number"
                  class="max-w-[6rem]"
                  min="1"
                  max="8760"
                  @update:model-value="form.new_account_max_hours = Number($event) || 48"
                />
              </label>
              <label
                v-if="isCheckoutDiscountCampaign"
                class="mt-2 flex items-center gap-2 text-sm"
              >
                <input v-model="form.require_no_published_offer" type="checkbox" />
                Len účty bez zverejneného inzerátu alebo inzercie
              </label>
              <label
                v-if="form.reward_type === 'subscription_discount'"
                class="mt-2 flex items-center gap-2 text-sm"
              >
                <input v-model="form.require_no_prior_subscription" type="checkbox" />
                Len prvé predplatné (bez predchádzajúceho plateného predplatného)
              </label>
            </template>
          </div>

          <div class="flex flex-wrap gap-2 pt-2">
            <Button
              :label="saving ? 'Ukladám…' : editingId ? 'Uložiť zmeny' : 'Vytvoriť kampaň'"
              :loading="saving"
              @click="saveForm"
            />
            <Button label="Zrušiť" severity="secondary" outlined @click="cancelForm" />
          </div>
        </div>

        <aside class="flex flex-col gap-4 lg:col-span-1">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 lg:sticky lg:top-4">
            <h3 class="m-0 mb-2 text-sm font-semibold text-slate-800">Súhrn kampane</h3>
            <ul class="m-0 list-disc pl-4 text-sm text-slate-600">
              <li v-for="(line, idx) in summaryLines" :key="idx">{{ line }}</li>
            </ul>

            <div v-if="formWarnings.length > 0" class="mt-4 flex flex-col gap-2">
              <h4 class="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Upozornenia
              </h4>
              <Message
                v-for="(warn, idx) in formWarnings"
                :key="idx"
                :severity="warn.blocking ? 'error' : 'warn'"
                :closable="false"
                class="text-sm"
              >
                {{ warn.message }}
              </Message>
            </div>
          </div>

          <div class="rounded-lg border border-slate-200 p-4">
            <h3 class="m-0 mb-3 text-sm font-semibold text-slate-800">Simulátor</h3>
            <div class="flex flex-col gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-slate-600">Kontext</label>
                <Select
                  v-model="simulateContext"
                  :options="simulateContextOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-slate-600">Promo kód</label>
                <InputText v-model="simulateCode" class="uppercase" :placeholder="form.code || 'KÓD'" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-slate-600">Vek účtu (hodiny)</label>
                <InputText
                  :model-value="String(simulateAccountAgeHours)"
                  type="number"
                  min="0"
                  @update:model-value="simulateAccountAgeHours = Number($event) || 0"
                />
              </div>
              <label class="flex items-center gap-2 text-sm">
                <input v-model="simulateHasPublished" type="checkbox" />
                Má zverejnený inzerát
              </label>
              <label class="flex items-center gap-2 text-sm">
                <input v-model="simulateAlreadyRedeemed" type="checkbox" />
                Už uplatnil kampaň
              </label>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-slate-600">Typ účtu</label>
                <Select
                  v-model="simulateProfileRole"
                  :options="simulateProfileRoleOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full"
                />
              </div>
              <label class="flex items-center gap-2 text-sm">
                <input v-model="simulateHasPriorSubscription" type="checkbox" />
                Už mal predplatné
              </label>
              <label
                v-if="form.code_mode === 'unique_pool'"
                class="flex items-center gap-2 text-sm"
              >
                <input v-model="simulatePoolCodeAvailable" type="checkbox" />
                Pool kód dostupný
              </label>
              <div v-if="simulateContext === 'credit_checkout'" class="flex flex-col gap-1">
                <label class="text-xs font-medium text-slate-600">Balík</label>
                <Select
                  v-model="simulatePackSlug"
                  :options="creditPacks"
                  option-label="name_sk"
                  option-value="slug"
                  placeholder="Vyberte balík"
                  class="w-full"
                  show-clear
                />
              </div>
              <div v-if="simulateContext === 'subscription_checkout'" class="flex flex-col gap-1">
                <label class="text-xs font-medium text-slate-600">Plán</label>
                <Select
                  v-model="simulatePlanSlug"
                  :options="subscriptionPlans"
                  option-label="name_sk"
                  option-value="slug"
                  placeholder="Vyberte plán"
                  class="w-full"
                  show-clear
                />
              </div>
              <Button
                label="Otestovať"
                icon="pi pi-play"
                size="small"
                :loading="simulating"
                @click="runSimulate"
              />
              <div v-if="simulateResult">
                <Message
                  :severity="simulateResult.valid ? 'success' : 'error'"
                  :closable="false"
                >
                  <template v-if="simulateResult.valid">Používateľ by bol oprávnený.</template>
                  <template v-else>
                    <ul class="m-0 list-disc pl-4">
                      <li
                        v-for="(reason, idx) in formatSimulateReasons(simulateResult.reasons)"
                        :key="idx"
                      >
                        {{ reason }}
                      </li>
                    </ul>
                  </template>
                </Message>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <Dialog
      v-model:visible="redemptionsOpen"
      modal
      :header="redemptionsCampaign ? `Uplatnenia — ${redemptionsCampaign.code}` : 'Uplatnenia'"
      class="max-w-3xl"
      :style="{ width: 'min(48rem, 95vw)' }"
    >
      <div v-if="redemptionsLoading && redemptions.length === 0" class="flex justify-center py-8">
        <ProgressSpinner />
      </div>
      <p v-else-if="redemptions.length === 0" class="m-0 text-sm text-slate-500">
        Zatiaľ žiadne uplatnenia.
      </p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-slate-600">
              <th class="py-2 pr-3">Používateľ</th>
              <th class="py-2 pr-3">Kontext</th>
              <th class="py-2 pr-3">Stav</th>
              <th class="py-2 pr-3">Pool kód</th>
              <th class="py-2 pr-3">Odmena</th>
              <th class="py-2">Dátum</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in redemptions"
              :key="row.id"
              class="border-b border-slate-100"
            >
              <td class="py-2 pr-3">{{ row.user_label }}</td>
              <td class="py-2 pr-3">{{ row.context }}</td>
              <td class="py-2 pr-3">{{ row.status }}</td>
              <td class="py-2 pr-3 font-mono text-xs">{{ row.pool_code ?? '—' }}</td>
              <td class="py-2 pr-3">{{ formatRedemptionReward(row) }}</td>
              <td class="py-2">{{ new Date(row.created_at).toLocaleString('sk-SK') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="redemptionsCursor" class="mt-4 flex justify-center">
        <Button
          label="Načítať viac"
          size="small"
          outlined
          :loading="redemptionsLoading"
          @click="loadRedemptionsPage(true)"
        />
      </div>
    </Dialog>

    <Dialog
      v-model:visible="poolGenerateOpen"
      modal
      header="Vygenerovať kódy v poole"
      class="max-w-md"
      :style="{ width: 'min(28rem, 95vw)' }"
    >
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">Počet kódov (1–5000)</label>
          <InputText
            :model-value="String(poolGenerateCount)"
            type="number"
            min="1"
            max="5000"
            @update:model-value="poolGenerateCount = Number($event) || 1"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">Predpona (voliteľné, max. 12 znakov)</label>
          <InputText v-model="poolGeneratePrefix" class="uppercase" placeholder="INF" />
        </div>
      </div>
      <template #footer>
        <Button label="Zrušiť" severity="secondary" outlined @click="poolGenerateOpen = false" />
        <Button label="Vygenerovať" :loading="poolGenerating" @click="generatePoolCodes" />
      </template>
    </Dialog>
  </div>
</template>
