<template>
  <div class="mx-auto box-border w-full max-w-[1400px] pb-6 pt-3 font-dmSans text-black">
    <div class="px-5">
      <AppBackLink :to="ROUTES.myAds" :label="S.firmyHubBackToHub" />
      <p
        v-if="loadError"
        class="mt-4 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        role="alert"
      >
        {{ loadError }}
      </p>
      <p
        v-if="formError"
        class="mt-4 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        role="alert"
      >
        {{ formError }}
      </p>
      <div v-if="hydrating" class="py-12 text-center text-black/40">
        {{ S.loading }}
      </div>
    </div>
    <form v-if="!hydrating" class="flex flex-col" @submit.prevent="handlePublish">
      <JobPostShell v-model="currentStep" :steps="wizardSteps" :page-title="S.firmyEditPageTitle">
        <!-- Step 0: Základné -->
        <div v-show="currentStep === 0" class="flex flex-col gap-7">
          <JobPostSectionCard :title="S.firmySectionBasic">
            <div
              class="relative flex aspect-[4/3] w-full is-clickable flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[20px] border-2 border-dashed border-marketing-green bg-marketing-soft transition-colors hover:bg-marketing-mint"
              role="button"
              tabindex="0"
              @keydown.enter.prevent="() => thumbInputRef?.click()"
              @keydown.space.prevent="() => thumbInputRef?.click()"
              @dragover.prevent
              @drop.prevent="onThumbnailDrop"
            >
              <input
                ref="thumbInputRef"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                class="absolute inset-0 is-clickable opacity-0"
                :disabled="saving || uploadingCover"
                @change="onCoverChange"
              >
              <template v-if="!coverPhoto">
                <AppIcon name="image" :size="32" class="text-marketing-green" />
                <span class="text-lg font-medium text-black/40">{{ S.firmyThumbnailDropHint }}</span>
              </template>
              <img v-else :src="coverPhoto" alt="" class="absolute inset-0 size-full object-cover">
            </div>
            <p v-if="uploadingCover" class="m-0 text-sm text-black/50">{{ S.loading }}</p>
            <p class="m-0 text-sm font-semibold text-black/60">{{ S.firmyCardLogo }}</p>
            <div class="flex flex-col gap-2">
              <label class="field-label">{{ S.firmyAdTitle }}</label>
              <input
                v-model="form.title"
                type="text"
                maxlength="120"
                class="addjob-input"
                :placeholder="S.firmyCompanyNamePh"
              >
            </div>
            <div class="flex flex-col gap-2">
              <label class="field-label">{{ S.category }}</label>
              <div ref="categoryDropdownRef" class="relative">
                <button
                  type="button"
                  class="addjob-input cv-field flex w-full is-clickable select-none items-center justify-between text-left"
                  @click.stop="categoryOpen = !categoryOpen"
                >
                  <span :class="form.category ? 'text-black' : 'text-black/30'">{{ categoryTriggerLabel }}</span>
                  <AppIcon name="chevron-down" :size="13" class="shrink-0 text-black/30 transition-transform" :class="{ 'rotate-180': categoryOpen }" />
                </button>
                <div
                  v-show="categoryOpen"
                  class="absolute left-0 top-[calc(100%+8px)] z-[200] max-h-[260px] min-w-full overflow-y-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
                >
                  <button
                    v-for="slug in CATEGORIES"
                    :key="slug"
                    type="button"
                    class="flex w-full is-clickable items-center gap-3 rounded-[10px] border-none bg-transparent px-4 py-3 text-left font-dmSans text-lg text-black/80 transition-colors hover:bg-marketing-mint"
                    :class="{ 'bg-marketing-panel font-semibold text-black': form.category === slug }"
                    @click="form.category = slug; categoryOpen = false"
                  >
                    <CategoryIcon :category="slug" :size="18" icon-class="shrink-0 text-marketing-green" />
                    <span>{{ getCategoryLabel(slug) }}</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <label class="field-label">{{ S.firmyAdBody }}</label>
              <AppRichTextEditorLazy
                ref="richEditorRef"
                v-model="descriptionHtml"
                :disabled="saving"
                :placeholder="S.firmyDescriptionPlaceholder"
              />
            </div>
          </JobPostSectionCard>
        </div>

        <!-- Step 1: Lokalita -->
        <div v-show="currentStep === 1" class="flex flex-col gap-7">
          <JobPostSectionCard :title="S.firmySectionLocation">
            <div class="flex flex-col gap-2">
              <label class="field-label">{{ S.firmyRegion }}</label>
              <AppFormDropdown
                :model-value="form.region ?? ''"
                :options="krajOptions"
                :placeholder="S.selectCategory"
                @update:model-value="form.region = $event || null"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="field-label" for="firmy-ad-city">{{ S.firmyCity }}</label>
              <AppSkMunicipalityCombobox
                id="firmy-ad-city"
                :model-value="selectedMunicipality?.name ?? form.city ?? ''"
                :placeholder="S.firmyCityPh"
                :disabled="saving"
                @update:model-value="onMunicipalityUpdate"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="field-label">{{ S.firmyServiceAreas }}</label>
              <div class="flex flex-col gap-2">
                <label
                  v-for="opt in COMPANY_AD_SERVICE_AREAS"
                  :key="opt.value"
                  class="flex is-clickable items-center gap-2 text-sm font-medium text-black/80"
                >
                  <AppCheckbox
                    :model-value="form.service_areas.includes(opt.value)"
                    @update:model-value="toggleServiceArea(opt.value)"
                  />
                  {{ opt.label }}
                </label>
              </div>
            </div>
            <div v-if="form.service_areas.includes('custom')" class="flex flex-col gap-2">
              <label class="field-label">{{ S.firmyCustomAreas }}</label>
              <JaTagInput v-model="form.custom_service_areas" :placeholder="S.firmyCustomAreasPh" />
            </div>
          </JobPostSectionCard>
        </div>

        <!-- Step 2: Cenník a kontakt -->
        <div v-show="currentStep === 2" class="flex flex-col gap-7">
          <JobPostSectionCard :title="S.firmySectionPricing">
            <div class="flex flex-col gap-2">
              <label class="field-label">{{ S.firmyPriceType }}</label>
              <AppFormDropdown
                :model-value="form.price_type ?? 'negotiable'"
                :options="priceTypeOptions"
                @update:model-value="form.price_type = $event"
              />
            </div>
            <div v-if="showPriceAmounts" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label class="field-label">{{ S.firmyPriceFrom }}</label>
                <div class="relative">
                  <input
                    v-model="priceMinInput"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    :placeholder="S.firmyPriceAmountPlaceholder"
                    class="addjob-input pr-12"
                  >
                  <span class="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-black/40">€</span>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <label class="field-label">{{ S.firmyPriceTo }}</label>
                <div class="relative">
                  <input
                    v-model="priceMaxInput"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    :placeholder="S.firmyPriceAmountPlaceholder"
                    class="addjob-input pr-12"
                  >
                  <span class="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-black/40">€</span>
                </div>
              </div>
            </div>
            <label class="flex is-clickable items-center gap-2 text-sm font-medium text-black/80">
              <AppCheckbox
                :model-value="form.price_negotiable"
                @update:model-value="(checked) => { form.price_negotiable = checked; onPriceNegotiableChange(); }"
              />
              {{ S.firmyPriceNegotiable }}
            </label>
            <div class="flex flex-col gap-2">
              <label class="field-label">{{ S.firmyPriceNote }}</label>
              <textarea v-model="form.price_note" rows="3" class="addjob-textarea" :placeholder="S.firmyPriceNotePh" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="field-label">{{ S.firmyAvailability }}</label>
              <AppFormDropdown
                :model-value="form.availability ?? ''"
                :options="availabilityOptions"
                :placeholder="S.selectCategory"
                @update:model-value="form.availability = $event || null"
              />
            </div>
            <div class="flex flex-wrap gap-4">
              <label class="flex is-clickable items-center gap-2 text-sm font-medium text-black/80">
                <AppCheckbox v-model="form.works_weekends" />
                {{ S.firmyWorksWeekends }}
              </label>
              <label class="flex is-clickable items-center gap-2 text-sm font-medium text-black/80">
                <AppCheckbox v-model="form.evening_hours" />
                {{ S.firmyEveningHours }}
              </label>
              <label class="flex is-clickable items-center gap-2 text-sm font-medium text-black/80">
                <AppCheckbox v-model="form.emergency_service" />
                {{ S.firmyEmergency }}
              </label>
            </div>
          </JobPostSectionCard>

          <JobPostSectionCard :title="S.firmySectionContact">
            <div class="flex flex-col gap-2">
              <label class="field-label">{{ S.firmyContactPerson }}</label>
              <input v-model="form.contact_person" type="text" class="addjob-input" :placeholder="S.firmyContactPersonPh">
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label class="field-label">{{ S.firmyContactEmail }}</label>
                <input
                  v-model="form.contact_email"
                  type="email"
                  class="addjob-input"
                  @blur="onContactEmailBlur"
                >
                <label
                  v-if="form.contact_email?.trim()"
                  class="flex is-clickable items-center gap-2 text-sm font-medium text-black/80"
                >
                  <AppCheckbox v-model="form.show_email_publicly" />
                  {{ S.firmyShowEmailPublic }}
                </label>
              </div>
              <div class="flex flex-col gap-2">
                <label class="field-label">{{ S.firmyContactPhone }}</label>
                <input
                  v-model="form.contact_phone"
                  type="tel"
                  class="addjob-input"
                  @blur="onContactPhoneBlur"
                >
                <label
                  v-if="form.contact_phone?.trim()"
                  class="flex is-clickable items-center gap-2 text-sm font-medium text-black/80"
                >
                  <AppCheckbox v-model="form.show_phone_publicly" />
                  {{ S.firmyShowPhonePublic }}
                </label>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <label class="field-label">{{ S.website }}</label>
              <input v-model="form.website" type="url" class="addjob-input" placeholder="https://...">
            </div>
          </JobPostSectionCard>

          <JobPostSectionCard :title="S.firmySectionGallery">
            <div class="flex flex-wrap gap-3">
              <div
                v-for="(item, gi) in form.gallery_items"
                :key="item.url + String(gi)"
                class="flex w-[140px] shrink-0 flex-col gap-1.5"
              >
                <div class="relative aspect-[4/3] overflow-hidden rounded-[14px]">
                  <img :src="item.url" alt="" class="size-full object-cover">
                  <button
                    type="button"
                    class="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border-none bg-black text-white"
                    :aria-label="S.remove"
                    @click="removeGalleryAt(gi)"
                  >
                    <AppIcon name="x" :size="11" />
                  </button>
                </div>
                <input
                  :value="item.caption ?? ''"
                  type="text"
                  class="h-9 w-full rounded-lg border border-black/10 px-2 text-xs outline-none"
                  :placeholder="S.firmyGalleryCaption"
                  @input="updateGalleryCaption(gi, ($event.target as HTMLInputElement).value)"
                >
              </div>
              <div class="relative flex aspect-[4/3] w-[120px] shrink-0 is-clickable items-center justify-center rounded-[14px] border-2 border-dashed border-marketing-green bg-marketing-soft">
                <input
                  ref="galleryInputRef"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  class="absolute inset-0 is-clickable opacity-0"
                  :disabled="saving || uploadingGallery"
                  @change="onGalleryChange"
                >
                <AppIcon name="plus" :size="22" class="text-marketing-green" />
              </div>
            </div>
            <p v-if="uploadingGallery" class="m-0 text-sm text-black/50">{{ S.loading }}</p>
          </JobPostSectionCard>
        </div>

        <!-- Step 3: Publikovanie -->
        <div v-show="currentStep === 3" class="flex flex-col gap-7">
          <JobPostSectionCard :title="S.firmySectionPublish">
            <p class="m-0 text-[22px] font-bold text-black">{{ S.firmyDurationAd }}</p>
            <div class="flex flex-col gap-4">
              <div class="flex items-baseline gap-2">
                <span class="font-dmSans text-5xl font-extrabold leading-none text-marketing-green">{{ durationMonths }}</span>
                <span class="font-dmSans text-[22px] font-semibold text-black/40">{{ sliderUnitLabel }}</span>
              </div>
              <input
                v-model.number="durationMonths"
                type="range"
                min="1"
                max="12"
                step="1"
                class="duration-slider h-2 w-full is-clickable rounded-full outline-none"
                :style="durationSliderTrackStyle"
              >
              <div class="flex justify-between text-[15px] font-medium text-black/30">
                <span>{{ S.firmySliderMin }}</span>
                <span>{{ S.firmySliderMax }}</span>
              </div>
            </div>
            <label class="mt-2 flex is-clickable items-start gap-3">
              <AppCheckbox v-model="isTopListing" class="mt-1" />
              <span class="font-dmSans text-base font-semibold text-black">
                {{ S.firmyTopListingLabel }}
                <span class="mt-0.5 block text-sm font-medium text-black/55">
                  {{ firmyTopListingHint }}
                </span>
              </span>
            </label>
            <p class="m-0 text-sm text-black/70">{{ S.firmyCreditsHint }}</p>
            <p class="m-0 font-dmSans text-sm font-semibold text-black">
              {{ S.firmyYourCredits }}:
              <span class="text-marketing-green">{{ creditsDisplay }}</span>
              · {{ S.firmyCreditsForPublish }}:
              <span class="text-marketing-green">{{ requiredCredits }}</span>
            </p>
            <NuxtLink to="/cennik" class="text-sm font-semibold text-marketing-green underline">
              {{ S.jobBuyCreditsLink }}
            </NuxtLink>
          </JobPostSectionCard>
        </div>

        <template #footer>
          <p
            v-if="formError"
            class="mb-3 w-full basis-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {{ formError }}
          </p>
          <button
            v-if="currentStep > 0"
            type="button"
            class="h-12 is-clickable rounded-full border-2 border-marketing-green bg-transparent px-6 font-dmSans text-base font-bold text-marketing-green disabled:opacity-50"
            :disabled="saving"
            @click="goBack"
          >
            {{ S.firmyHubWizardBack }}
          </button>
          <div class="flex flex-1 flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              v-if="currentStep < lastStep"
              type="button"
              class="h-12 is-clickable rounded-full border-none bg-marketing-green px-8 font-dmSans text-base font-bold text-white disabled:opacity-50"
              @click="goNext"
            >
              {{ S.firmyHubWizardNext }}
            </button>
            <template v-else>
              <button
                type="button"
                class="h-12 is-clickable rounded-full border-2 border-marketing-green bg-transparent px-6 font-dmSans text-base font-bold text-marketing-green disabled:opacity-50"
                :disabled="saving"
                @click="handleDraft"
              >
                {{ saving ? S.loading : S.firmySaveDraft }}
              </button>
              <button
                type="submit"
                class="h-12 is-clickable rounded-full border-none bg-marketing-green px-8 font-dmSans text-base font-bold text-white disabled:opacity-50"
                :disabled="saving"
              >
                {{ saving ? S.loading : S.firmyPublish }}
              </button>
            </template>
          </div>
        </template>
      </JobPostShell>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { showNotFound } from '~/utils/not-found'
import { CATEGORIES, getCategoryLabel } from '~/utils/job'
import type { CompanyAd } from '~/utils/company-ad'
import {
  COMPANY_AD_AVAILABILITY,
  COMPANY_AD_PRICE_TYPES,
  COMPANY_AD_SERVICE_AREAS,
  SK_KRAJE,
} from '~/utils/company-ad-options'
import { validateCompanyAdWizardStep } from '~/utils/company-ad-validation'
import { useFirmyWizardBootstrap } from '~/utils/company-ad-hub'
import { waitForAuthReady } from '~/utils/wait-for-auth'
import { useCompanyAdForm } from '~/composables/useCompanyAdForm'
import type { WizardShellStep } from '~/components/job-post/JobPostShell.vue'
import JobPostShell from '~/components/job-post/JobPostShell.vue'
import JobPostSectionCard from '~/components/job-post/JobPostSectionCard.vue'

const props = defineProps<{
  adId: string
}>()

const emit = defineEmits<{
  saved: [ad: CompanyAd, published: boolean]
}>()

const SK_MONTH_UNITS = [
  'mesiac', 'mesiace', 'mesiace', 'mesiace',
  'mesiacov', 'mesiacov', 'mesiacov', 'mesiacov',
  'mesiacov', 'mesiacov', 'mesiacov', 'mesiacov',
] as const

const wizardSteps: WizardShellStep[] = [
  { title: S.firmyHubWizardStepBasic, sub: S.firmyHubWizardStepBasicSub },
  { title: S.firmyHubWizardStepLocation, sub: S.firmyHubWizardStepLocationSub },
  { title: S.firmyHubWizardStepPricing, sub: S.firmyHubWizardStepPricingSub },
  { title: S.firmyHubWizardStepPublish, sub: S.firmyHubWizardStepPublishSub },
]

const lastStep = wizardSteps.length - 1
const currentStep = ref(0)
const hydrating = ref(true)
const loadError = ref<string | null>(null)

const {
  form,
  priceMinInput,
  priceMaxInput,
  descriptionHtml,
  coverPhoto,
  durationMonths,
  isTopListing,
  topListingCredits,
  loadBillingCatalog,
  loadBillingAccount,
  saving,
  formError,
  uploadingCover,
  uploadingGallery,
  selectedMunicipality,
  richEditorRef,
  creditsDisplay,
  requiredCredits,
  loadFromAd,
  uploadImage,
  markThumbnailTouched,
  submit,
  addGalleryFiles,
  removeGalleryAt,
  updateGalleryCaption,
  toggleServiceArea,
  onPriceNegotiableChange,
  showPriceAmounts,
} = useCompanyAdForm({ mode: 'edit', adId: toRef(props, 'adId') })

const { api, getApiBaseUrl } = useApi()
const wizardBootstrap = useFirmyWizardBootstrap()
const categoryOpen = ref(false)
const categoryDropdownRef = ref<HTMLElement | null>(null)
const thumbInputRef = ref<HTMLInputElement | null>(null)
const galleryInputRef = ref<HTMLInputElement | null>(null)
const { ensureMunicipality, dispose: disposeMunicipalitySearch } = useSkMunicipalitySearch()

const categoryTriggerLabel = computed(() =>
  form.category ? getCategoryLabel(form.category) : S.selectCategory,
)
const sliderUnitLabel = computed(() => SK_MONTH_UNITS[durationMonths.value - 1] ?? 'mesiacov')

const firmyTopListingHint = computed(() => {
  const n = topListingCredits.value
  if (n < 1) return S.firmyTopListingHint
  return `${S.firmyTopListingHint} (+${n} ${S.credits}).`
})
const durationSliderTrackStyle = computed(() => {
  const pct = ((durationMonths.value - 1) / 11) * 100
  return {
    background: `linear-gradient(to right, rgb(34,197,94) ${pct}%, rgb(229,231,235) ${pct}%)`,
  }
})

const priceTypeOptions = COMPANY_AD_PRICE_TYPES.map((o) => ({ value: o.value, label: o.label }))
const availabilityOptions = COMPANY_AD_AVAILABILITY.map((o) => ({ value: o.value, label: o.label }))
const krajOptions = SK_KRAJE.map((k) => ({ value: k, label: k }))

function bodyPlain(): string {
  const plain = richEditorRef.value?.getPlainText() ?? ''
  return plain.replace(/<[^>]+>/g, '').trim() || plain.trim()
}

function onContactEmailBlur(): void {
  if (form.contact_email?.trim()) {
    form.show_email_publicly = true
  }
}

function onContactPhoneBlur(): void {
  if (form.contact_phone?.trim()) {
    form.show_phone_publicly = true
  }
}

function validateCurrentStep(): string | null {
  return validateCompanyAdWizardStep(currentStep.value, form, bodyPlain())
}

function goNext(): void {
  formError.value = null
  const err = validateCurrentStep()
  if (err) {
    formError.value = err
    return
  }
  if (currentStep.value < lastStep) {
    currentStep.value += 1
  }
}

function goBack(): void {
  formError.value = null
  if (currentStep.value > 0) {
    currentStep.value -= 1
  }
}

async function onMunicipalityUpdate(name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) {
    selectedMunicipality.value = null
    form.city = null
    return
  }
  const row = await ensureMunicipality(trimmed)
  if (row) {
    selectedMunicipality.value = row
    form.city = row.name
    form.region = row.kraj
    return
  }
  selectedMunicipality.value = null
  form.city = trimmed
}

function onDocClick(e: MouseEvent): void {
  const t = e.target as Node
  if (categoryDropdownRef.value?.contains(t)) return
  categoryOpen.value = false
}

async function onCoverChange(e: Event): Promise<void> {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingCover.value = true
  try {
    coverPhoto.value = await uploadImage(file)
  } finally {
    uploadingCover.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function onThumbnailDrop(e: DragEvent): Promise<void> {
  const file = e.dataTransfer?.files?.[0]
  if (!file?.type.startsWith('image/')) return
  uploadingCover.value = true
  try {
    coverPhoto.value = await uploadImage(file)
    markThumbnailTouched()
  } finally {
    uploadingCover.value = false
  }
}

async function onGalleryChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  if (input.files?.length) await addGalleryFiles(input.files)
  input.value = ''
}

async function handlePublish(): Promise<void> {
  formError.value = null
  for (let s = 0; s < lastStep; s++) {
    const err = validateCompanyAdWizardStep(s, form, bodyPlain())
    if (err) {
      formError.value = err
      currentStep.value = s
      return
    }
  }
  const { ensureBffCsrfForMutation } = await import('~/utils/bff-csrf-state')
  if (!(await ensureBffCsrfForMutation(getApiBaseUrl()))) {
    formError.value = S.sessionExpiredMessage
    return
  }
  const ad = await submit(true)
  if (ad) emit('saved', ad, true)
  else if (!formError.value) formError.value = S.saveFailed
}

async function handleDraft(): Promise<void> {
  formError.value = null
  const { ensureBffCsrfForMutation } = await import('~/utils/bff-csrf-state')
  if (!(await ensureBffCsrfForMutation(getApiBaseUrl()))) {
    formError.value = S.sessionExpiredMessage
    return
  }
  const ad = await submit(false)
  if (ad) emit('saved', ad, false)
  else if (!formError.value) formError.value = S.saveFailed
}

function apiErrorMessage(body: string | undefined, fallback: string): string {
  if (!body) return fallback
  try {
    const parsed = JSON.parse(body) as { message?: string }
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message
    }
  } catch {
    /* plain text */
  }
  return body.slice(0, 240) || fallback
}

async function hydrateFromApi(): Promise<boolean> {
  if (!props.adId) return false
  let res = await api<CompanyAd>(`/api/company-ads/${props.adId}/for-edit`)
  if (!res.ok && (res.status === 401 || res.status === 404)) {
    const { refreshBffSessionFromApi } = await import('~/utils/bff-session-refresh')
    const refreshed = await refreshBffSessionFromApi(getApiBaseUrl())
    if (refreshed.ok) {
      res = await api<CompanyAd>(`/api/company-ads/${props.adId}/for-edit`)
    }
  }
  if (!res.ok || !res.data) {
    if (res.status === 404) {
      showNotFound(S.firmyNotFound)
      return false
    }
    loadError.value = apiErrorMessage(res.body, S.firmyNotFound)
    return false
  }
  loadFromAd(res.data as CompanyAd)
  return true
}

async function hydrateWizard(): Promise<void> {
  if (!props.adId) {
    hydrating.value = false
    showNotFound(S.firmyNotFound)
    return
  }
  loadError.value = null
  formError.value = null
  hydrating.value = true
  await waitForAuthReady()

  const boot = wizardBootstrap.value
  if (boot?.id === props.adId) {
    loadFromAd(boot)
    hydrating.value = false
    wizardBootstrap.value = null
    return
  }

  const ok = await hydrateFromApi()
  if (ok) {
    wizardBootstrap.value = null
  }
  hydrating.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  void loadBillingCatalog()
  void loadBillingAccount()
  void hydrateWizard()
})

watch(
  () => props.adId,
  (id, prev) => {
    if (id && id !== prev) void hydrateWizard()
  },
)

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  disposeMunicipalitySearch()
})
</script>

<style scoped>
.field-label {
  @apply font-dmSans text-lg font-semibold text-black;
}
input[type='range'].duration-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  border-radius: 999px;
  outline: none;
}
input[type='range'].duration-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgb(34, 197, 94);
  cursor: pointer;
}
</style>
