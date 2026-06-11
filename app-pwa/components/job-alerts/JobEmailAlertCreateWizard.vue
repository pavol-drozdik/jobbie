<template>
  <div class="mx-auto box-border w-full max-w-[1400px] pb-6 pt-3 font-dmSans text-black">
    <div class="px-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <AppBackLink to="/ponuky-na-email" :label="S.jobEmailAlertsBackToHub" />
      </div>

      <div v-if="loadError" class="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
        {{ loadError }}
      </div>
      <div v-if="stepError" class="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
        {{ stepError }}
      </div>
    </div>

    <JobEmailAlertWizardShell
      v-if="!loadError"
      :parent-step="step"
      :finish-disabled="saving"
      @go-step="onGoStep"
      @next="onNext"
      @finish="onFinish"
    >
        <template #step0="{ stepBadge }">
          <JobEmailAlertWizardStepHeader
            :badge="stepBadge"
            :title="S.jobEmailAlertsWizardStep1Title"
            :subtitle="S.jobEmailAlertsWizardStep1Subtitle"
          />
          <div class="grid gap-5">
            <div :class="wizardSectionCardClass">
              <div :class="wizardSectionHeaderBlockClass">
                <h3 class="m-0 text-[28px] font-black text-black">
                  {{ S.jobEmailAlertsFieldName }}
                </h3>
                <p class="m-0 mt-2 max-w-[760px] text-[17px] text-black/[0.55]">
                  {{ S.jobEmailAlertsNamePlaceholder }}
                </p>
              </div>
              <input
                id="ja-name"
                v-model="form.name"
                type="text"
                maxlength="120"
                :class="wizardTextInputClass"
                :placeholder="S.jobEmailAlertsNamePlaceholder"
              >
            </div>
            <div :class="wizardSectionCardClass">
              <div :class="wizardSectionHeaderBlockClass">
                <h3 class="m-0 text-[28px] font-black text-black">
                  {{ S.jobEmailAlertsFieldFrequency }}
                </h3>
              </div>
              <div class="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  :class="[wizardPillBase, wizardPillClass(form.frequency === 'daily')]"
                  @click="form.frequency = 'daily'"
                >
                  {{ S.jobAlertsFreqDaily }}
                </button>
                <button
                  type="button"
                  :class="[wizardPillBase, wizardPillClass(form.frequency === 'weekly')]"
                  @click="form.frequency = 'weekly'"
                >
                  {{ S.jobAlertsFreqWeekly }}
                </button>
                <button
                  type="button"
                  :class="[wizardPillBase, wizardPillClass(form.frequency === 'monthly')]"
                  @click="form.frequency = 'monthly'"
                >
                  {{ S.jobAlertsFreqMonthly }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <template #step1="{ stepBadge }">
          <JobEmailAlertWizardStepHeader
            :badge="stepBadge"
            :title="S.jobEmailAlertsWizardStep2Title"
            :subtitle="S.jobEmailAlertsWizardStep2Subtitle"
          />
          <div class="grid gap-5">
            <div id="ja-search" :class="wizardSectionCardClass">
              <div :class="wizardSectionHeaderBlockClass">
                <h3 class="m-0 text-[28px] font-black text-black">
                  {{ S.jobEmailAlertsFieldKeyword }}
                </h3>
              </div>
              <input
                v-model="form.keywords"
                type="text"
                :class="wizardTextInputClass"
                :placeholder="S.jobEmailAlertsKeywordPlaceholder"
              >
            </div>
            <div id="ja-location" :class="wizardSectionCardClass">
              <div :class="wizardSectionHeaderBlockClass">
                <h3 class="m-0 text-[28px] font-black text-black">
                  {{ S.jobEmailAlertsFieldLocation }}
                </h3>
              </div>
              <div class="grid grid-cols-1 gap-y-4">
                <div :class="wizardFieldRowClass">
                  <label :class="wizardFieldLabelClass" for="ja-location-combobox">
                    {{ S.jobEmailAlertsFieldLocation }}
                  </label>
                  <AppSkMunicipalityCombobox
                    id="ja-location-combobox"
                    v-model="form.location"
                    placeholder="Napr. Bratislava"
                    :disabled="saving"
                  />
                </div>
                <div :class="wizardFieldRowClass">
                  <label :class="wizardFieldLabelClass" for="ja-radius">
                    {{ S.jobEmailAlertsFieldRadius }}
                  </label>
                  <AppFormDropdown
                    id="ja-radius"
                    v-model="form.radiusSel"
                    bordered
                    :options="radiusDropdownOptions"
                    :placeholder="S.jobEmailAlertsRadiusWholeSk"
                    :disabled="saving"
                  />
                </div>
              </div>
            </div>
            <div id="ja-employment" :class="wizardSectionCardClass">
              <div :class="wizardSectionHeaderBlockClass">
                <h3 class="m-0 text-[28px] font-black text-black">
                  {{ S.jobEmailAlertsFieldEmployment }}
                </h3>
              </div>
              <div class="flex flex-wrap gap-2.5">
                <button
                  v-for="em in employmentOptions"
                  :key="em.v"
                  type="button"
                  :class="[wizardPillBase, wizardPillClass(form.employment_types.includes(em.v))]"
                  @click="toggleEmployment(em.v)"
                >
                  {{ em.label }}
                </button>
              </div>
              <div class="mt-8">
                <div :class="wizardSectionHeaderBlockClass">
                  <h3 class="m-0 text-[28px] font-black text-black">
                    {{ S.jobEmailAlertsFieldWorkMode }}
                  </h3>
                </div>
                <div class="flex flex-wrap gap-2.5">
                  <button
                    v-for="wm in workModeOptions"
                    :key="wm.v"
                    type="button"
                    :class="[wizardPillBase, wizardPillClass(form.work_modes.includes(wm.v))]"
                    @click="toggleWorkMode(wm.v)"
                  >
                    {{ wm.label }}
                  </button>
                </div>
              </div>
            </div>
            <div id="ja-category" :class="wizardSectionCardClass">
              <div class="grid grid-cols-1 gap-y-4">
                <div :class="wizardFieldRowClass">
                  <label :class="wizardFieldLabelClass" for="ja-category">
                    {{ S.jobEmailAlertsFieldCategory }}
                  </label>
                  <AppFormDropdown
                    id="ja-category"
                    v-model="form.category"
                    bordered
                    :options="categoryDropdownOptions"
                    :placeholder="S.jobAlertsFormCategoryAll"
                    :disabled="saving"
                  />
                </div>
                <div :class="wizardFieldRowClass">
                  <label :class="wizardFieldLabelClass" for="ja-salary-min">
                    {{ S.jobEmailAlertsFieldSalaryFrom }}
                  </label>
                  <div class="flex max-w-md items-center gap-2">
                    <input
                      id="ja-salary-min"
                      v-model.number="form.salary_min"
                      type="number"
                      min="0"
                      :class="[wizardTextInputClass, 'min-w-0 flex-1']"
                      placeholder="Napr. 1800"
                      :disabled="saving"
                    >
                    <span class="shrink-0 text-lg font-semibold text-black/55">€</span>
                  </div>
                </div>
              </div>
            </div>
            <div id="ja-benefits" :class="wizardSectionCardClass">
              <div :class="wizardSectionHeaderBlockClass">
                <h3 class="m-0 text-[28px] font-black text-black">
                  {{ S.benefitsSectionTitle }}
                </h3>
                <p class="m-0 mt-2 max-w-[760px] text-[17px] text-black/[0.55]">
                  {{ S.jobEmailAlertsBenefitsHint }}
                </p>
              </div>
              <AppIdLabelMultiCombobox
                v-model="form.benefits"
                :options="BENEFITS"
                :disabled="saving"
                drop-up
              />
            </div>
          </div>
        </template>

        <template #step2="{ stepBadge }">
          <JobEmailAlertWizardStepHeader
            :badge="stepBadge"
            :title="S.jobEmailAlertsWizardStep3Title"
            :subtitle="S.jobEmailAlertsWizardStep3Subtitle"
          />
          <div :class="wizardSectionCardClass">
            <div :class="wizardSectionHeaderBlockClass">
              <h3 class="m-0 text-[28px] font-black text-black">
                {{ S.jobEmailAlertsWizardSummaryTitle }}
              </h3>
            </div>
            <p class="m-0 text-[17px] leading-relaxed text-black/[0.55]">
              <strong>{{ form.name.trim() || '—' }}</strong>
              · {{ summaryLine() }}
            </p>
            <p class="m-0 mt-4 text-[15px] font-semibold text-marketing-green">
              <template v-if="previewLoading">{{ S.jobEmailAlertsWizardPreviewLoading }}</template>
              <template v-else-if="previewCount !== null">
                {{ S.jobEmailAlertsWizardPreviewCount.replace('{count}', String(previewCount)) }}
              </template>
              <template v-else>{{ S.jobEmailAlertsWizardPreviewUnavailable }}</template>
            </p>
          </div>
        </template>

        <template #step-actions="{ parentStep }">
          <NuxtLink
            v-if="parentStep === 2"
            :to="{ path: ROUTES.find, query: previewFindQuery }"
            class="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-marketing-green bg-white px-5 text-[17px] font-extrabold text-marketing-green no-underline"
          >
            {{ S.jobEmailAlertsWizardPreviewFind }}
          </NuxtLink>
        </template>
    </JobEmailAlertWizardShell>
  </div>
</template>

<script setup lang="ts">
// Email job alert wizard; criteria validation in useJobEmailAlertFormModel (geo needs radius).
import { computed, onMounted, ref, watch } from 'vue'
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { showNotFound } from '~/utils/not-found'
import { CATEGORIES, getCategoryLabel } from '~/utils/job'
import { BENEFITS } from '~/utils/job-alert-options'
import {
  wizardFieldLabelClass,
  wizardFieldRowClass,
  wizardPillBase,
  wizardPillClass,
  wizardSectionCardClass,
  wizardSectionHeaderBlockClass,
  wizardTextInputClass,
} from '~/utils/wizard-ui'
import AppFormDropdown from '~/components/AppFormDropdown.vue'
import AppSkMunicipalityCombobox from '~/components/AppSkMunicipalityCombobox.vue'
import JobEmailAlertWizardShell from '~/components/job-alerts/JobEmailAlertWizardShell.vue'
import JobEmailAlertWizardStepHeader from '~/components/job-alerts/JobEmailAlertWizardStepHeader.vue'
import {
  JOB_ALERT_EMPLOYMENT_OPTIONS,
  JOB_ALERT_WORK_MODE_OPTIONS,
  applyJobAlertPrefillFromQuery,
  dtoToJobEmailAlertForm,
  useJobEmailAlertFormModel,
} from '~/composables/useJobEmailAlertFormModel'
import { buildFindQueryFromJobAlert, useJobEmailAlerts } from '~/composables/useJobEmailAlerts'
import type { JobEmailAlertDto } from '~/composables/useJobEmailAlerts'

const props = withDefaults(
  defineProps<{
    mode?: 'create' | 'edit'
    alertId?: string | null
    initialAlert?: JobEmailAlertDto | null
  }>(),
  { mode: 'create', alertId: null, initialAlert: null },
)

const route = useRoute()
const { user, profile } = useAuth()
const { createAlert, updateAlert, previewCount: fetchPreviewCount } = useJobEmailAlerts()

const {
  form,
  toggleEmployment,
  toggleWorkMode,
  buildBody,
  validateStep0,
  validateStep1,
  summaryLine,
} = useJobEmailAlertFormModel()

const employmentOptions = JOB_ALERT_EMPLOYMENT_OPTIONS
const workModeOptions = JOB_ALERT_WORK_MODE_OPTIONS

const radiusDropdownOptions = [
  { value: '', label: S.jobEmailAlertsRadiusWholeSk },
  { value: '0', label: S.jobEmailAlertsRadius0 },
  { value: '10', label: '+10 km' },
  { value: '25', label: '+25 km' },
  { value: '50', label: '+50 km' },
  { value: '100', label: '+100 km' },
] as const

const categoryDropdownOptions = computed(() => [
  { value: 'all', label: S.jobAlertsFormCategoryAll },
  ...CATEGORIES.map((c) => ({
    value: c,
    label: getCategoryLabel(c),
    categorySlug: c,
  })),
])

const step = ref(0)
const stepError = ref<string | null>(null)
const loadError = ref<string | null>(null)
const saving = ref(false)
const previewCount = ref<number | null>(null)
const previewLoading = ref(false)

const employerBlocked = computed(() => {
  return Boolean(profile.value?.customer_role) && !profile.value?.worker_role
})

const previewFindQuery = computed(() => {
  const body = buildBody()
  const fake: JobEmailAlertDto = {
    id: '',
    user_id: '',
    name: body.name,
    keywords: body.keywords ?? '',
    location: body.location ?? '',
    radius_km: body.radius_km ?? null,
    category: body.category ?? null,
    categories: body.categories ?? [],
    employment_types: body.employment_types ?? [],
    salary_type: body.salary_type ?? null,
    salary_min: body.salary_min ?? null,
    salary_max: null,
    work_mode: body.work_mode ?? null,
    work_modes: body.work_modes ?? [],
    work_from_home: false,
    education_levels: [],
    benefits: [...form.benefits],
    suitable_for: [],
    driver_licenses: [],
    work_shift_modes: [],
    language_filters: [],
    pc_skill_filters: [],
    start_types: [],
    start_date_from: null,
    newsletter: false,
    frequency: body.frequency,
    is_active: true,
    criteria_hash: '',
    last_dispatch_at: null,
    created_at: '',
    updated_at: '',
  }
  return buildFindQueryFromJobAlert(fake)
})

function onGoStep(target: number): void {
  stepError.value = null
  const s = Math.max(0, Math.min(2, target))
  if (s > step.value) {
    if (s >= 1) {
      const e0 = validateStep0()
      if (e0) {
        stepError.value = e0
        return
      }
    }
    if (s >= 2) {
      const e1 = validateStep1()
      if (e1) {
        stepError.value = e1
        return
      }
    }
  }
  step.value = s
  if (s === 2) {
    void loadPreview()
  }
}

function onNext(): void {
  onGoStep(step.value + 1)
}

async function loadPreview(): Promise<void> {
  previewLoading.value = true
  previewCount.value = null
  const n = await fetchPreviewCount(buildBody() as Record<string, unknown>)
  previewCount.value = n
  previewLoading.value = false
}

async function onFinish(): Promise<void> {
  const err0 = validateStep0()
  const err1 = validateStep1()
  if (err0 || err1) {
    stepError.value = err0 ?? err1
    return
  }
  saving.value = true
  stepError.value = null
  const body = buildBody()
  const r =
    props.mode === 'edit' && props.alertId
      ? await updateAlert(props.alertId, body)
      : await createAlert(body)
  saving.value = false
  if (r.ok) {
    await navigateTo({
      path: '/ponuky-na-email',
      query: { saved: '1' },
    })
    return
  }
  stepError.value = r.message ?? S.jobEmailAlertsWizardErrSave
}

onMounted(() => {
  if (employerBlocked.value) {
    loadError.value = S.jobEmailAlertsWizardEmployerOnly
    return
  }
  if (props.mode === 'edit') {
    if (props.initialAlert) {
      dtoToJobEmailAlertForm(props.initialAlert, form)
      return
    }
    if (!props.alertId) {
      showNotFound(S.jobEmailAlertsWizardNotFound)
    }
    return
  }
  applyJobAlertPrefillFromQuery(route.query, form)
  if (Object.keys(route.query).length > 0) {
    step.value = 1
  }
})

watch(
  () => props.initialAlert,
  (a) => {
    if (a && props.mode === 'edit') {
      dtoToJobEmailAlertForm(a, form)
    }
  },
)
</script>
