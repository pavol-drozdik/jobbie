<template>
  <div class="mx-auto box-border w-full max-w-[1400px] pb-6 pt-3 font-dmSans text-black">
    <div class="px-5">
      <AppBackLink :to="hubRoute" :label="hubBackLabel" />
      <p
        v-if="loadError"
        class="mt-4 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        role="alert"
      >
        {{ loadError }}
      </p>
      <p
        v-else-if="error"
        class="mt-4 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        role="alert"
      >
        {{ error }}
      </p>
      <div v-if="hydrating" class="py-12 text-center text-black/40">
        {{ S.loading }}
      </div>
    </div>
    <form v-if="!hydrating" class="flex flex-col" @submit.prevent="() => handleSubmit(false)">
      <JobPostShell v-model="currentStep" :page-title="pageTitle">
        <div v-show="currentStep === 0" class="grid gap-5">
        <JobPostSectionCard title="Thumbnail">
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
              :disabled="loading || uploadingCover"
              @change="onCoverChange"
            >
            <template v-if="!coverPhoto">
              <AppIcon name="image" :size="32" class="text-marketing-green" />
              <span class="text-lg font-medium text-black/40">Klikni alebo pretiahni obrázok</span>
            </template>
            <img
              v-else
              :src="coverPhoto"
              alt=""
              class="absolute inset-0 size-full object-cover"
            >
          </div>
          <p v-if="uploadingCover" class="m-0 text-sm text-black/50">
            {{ S.loading }}
          </p>
        </JobPostSectionCard>

        <JobPostSectionCard :title="S.filterJobType">
          <div class="flex flex-wrap gap-2.5">
            <button
              v-for="opt in employmentTypeOptions"
              :key="opt.value"
              type="button"
              :class="[wizardPillBase, wizardPillClass(selectedEmploymentType === opt.value)]"
              @click="selectedEmploymentType = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
          <div :class="wizardFieldRowClass">
            <label :class="wizardFieldLabelClass">Názov inzerátu</label>
            <input
              v-model="title"
              type="text"
              maxlength="120"
              placeholder="Napr. Kosenie trávnika a upratovanie záhrady"
              :class="wizardTextInputClass"
            >
          </div>
        </JobPostSectionCard>
        </div>

        <div v-show="currentStep === 1" class="grid gap-5">
        <JobPostSectionCard title="Dátum">

          <div v-show="usesStandardNastup" class="flex flex-col gap-2">
            <label :class="wizardFieldLabelClass">Dátum nástupu</label>
            <div class="flex flex-wrap items-center gap-3">
              <input
                v-model="nastupDate"
                type="date"
                :class="[wizardTextInputClass, 'min-w-0 flex-1 sm:max-w-[280px]']"
                :disabled="nastupAsap"
              >
              <label class="flex is-clickable items-center gap-3">
                <span class="relative inline-block h-7 w-12 shrink-0">
                  <input v-model="nastupAsap" type="checkbox" class="peer sr-only">
                  <span
                    class="absolute inset-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-marketing-green"
                  />
                  <span
                    class="absolute left-1 top-1 size-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"
                  />
                </span>
                <span class="font-dmSans text-lg font-medium text-black/70">ASAP</span>
              </label>
            </div>
          </div>

          <div
            v-show="selectedEmploymentType === 'brigada'"
            class="flex flex-col gap-2"
            :class="usesStandardNastup ? 'mt-4' : ''"
          >
            <label :class="wizardFieldLabelClass">Obdobie</label>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label class="text-[15px] font-medium text-black/50">Od</label>
                <input v-model="brigOd" type="date" :class="wizardTextInputClass">
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[15px] font-medium text-black/50">Do</label>
                <input v-model="brigDo" type="date" :class="wizardTextInputClass">
              </div>
            </div>
          </div>

          <div
            v-show="selectedEmploymentType === 'turnus'"
            class="flex flex-col gap-2"
          >
            <label :class="wizardFieldLabelClass">Obdobie</label>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label class="text-[15px] font-medium text-black/50">Od</label>
                <input v-model="turnusOd" type="date" :class="wizardTextInputClass">
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[15px] font-medium text-black/50">Do</label>
                <input v-model="turnusDo" type="date" :class="wizardTextInputClass">
              </div>
            </div>
          </div>

          <div
            v-show="jobType === 'tpp' && selectedEmploymentType !== 'turnus'"
            class="flex flex-col gap-4"
            :class="usesStandardNastup ? 'mt-4' : ''"
          >
            <div class="flex flex-col gap-2">
              <label :class="wizardFieldLabelClass">Obdobie</label>
              <div class="flex flex-wrap gap-2.5">
                <button
                  v-for="tab in tppObdobieTabs"
                  :key="tab.value"
                  type="button"
                  :class="[wizardPillBase, wizardPillClass(tppObdobie === tab.value)]"
                  @click="tppObdobie = tab.value"
                >
                  {{ tab.label }}
                </button>
              </div>
            </div>
            <div v-show="tppObdobie === 'urcite'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label class="text-[15px] font-medium text-black/50">Od</label>
                <input v-model="tppOd" type="date" :class="wizardTextInputClass">
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[15px] font-medium text-black/50">Do</label>
                <input v-model="tppDo" type="date" :class="wizardTextInputClass">
              </div>
            </div>
          </div>

          <!-- Fuška -->
          <div v-show="jobType === 'fuska'" class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label :class="wizardFieldLabelClass">Dátum konania práce</label>
              <label class="mb-2 flex is-clickable items-center gap-3">
                <span class="relative inline-block h-7 w-12 shrink-0">
                  <input v-model="fuskaNezalezi" type="checkbox" class="peer sr-only">
                  <span
                    class="absolute inset-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-marketing-green"
                  />
                  <span
                    class="absolute left-1 top-1 size-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"
                  />
                </span>
                <span class="font-dmSans text-lg font-medium text-black/70">Nezáleží</span>
              </label>
              <div v-show="!fuskaNezalezi" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="flex flex-col gap-2">
                  <label class="text-[15px] font-medium text-black/50">Od</label>
                  <input v-model="fuskaOd" type="date" :class="wizardTextInputClass">
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-[15px] font-medium text-black/50">Do</label>
                  <input v-model="fuskaDo" type="date" :class="wizardTextInputClass">
                </div>
              </div>
            </div>
          </div>
        </JobPostSectionCard>

        <JobPostSectionCard title="Plat">
          <div :class="wizardFieldRowClass">
            <label :class="wizardFieldLabelClass">{{ S.jobPostSalaryTypeLabel }}</label>
            <div class="flex flex-wrap gap-2.5">
              <button
                v-for="opt in salaryTypeOptions"
                :key="opt.value"
                type="button"
                :class="[
                  wizardPillBase,
                  wizardPillClass(salaryType === opt.value),
                  'min-w-[10.75rem] flex-1 sm:flex-none',
                ]"
                @click="salaryType = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div v-show="showSalaryAmountFields" :class="[wizardFieldRowClass, 'mt-5']">
            <label :class="wizardFieldLabelClass">{{ S.jobSalary }}</label>
            <div class="relative max-w-md">
              <input
                v-model="salaryAmountInput"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                :placeholder="S.jobPostSalaryAmountPlaceholder"
                :class="[wizardTextInputClass, 'pr-14']"
              >
              <span class="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm font-semibold text-black/40">{{ salaryUnit }}</span>
            </div>
          </div>
        </JobPostSectionCard>
        </div>

        <div v-show="currentStep === 2" class="grid gap-5">
        <JobPostSectionCard title="Detaily">
          <div :class="wizardFieldRowClass">
            <label :class="wizardFieldLabelClass">Dátum podania prihlášky do</label>
            <input
              v-model="applicationDeadline"
              type="date"
              :class="[wizardTextInputClass, 'max-w-[300px]']"
            >
          </div>
          <div class="grid grid-cols-1 gap-y-4">
            <template v-if="props.variant === 'foreign'">
              <div :class="wizardFieldRowClass">
                <label :class="wizardFieldLabelClass">{{ S.jobPostForeignCountry }}</label>
                <AppFormDropdown
                  v-model="foreignWorkCountry"
                  bordered
                  :options="foreignCountryDropdownOptions"
                  :placeholder="S.jobPostForeignCountryPlaceholder"
                  :disabled="loading"
                />
              </div>
              <div :class="wizardFieldRowClass">
                <label :class="wizardFieldLabelClass">{{ S.jobPostForeignCity }}</label>
                <input
                  v-model="foreignWorkCity"
                  type="text"
                  :placeholder="S.jobPostForeignCityPlaceholder"
                  :class="wizardTextInputClass"
                  :disabled="loading"
                >
              </div>
            </template>
            <template v-else>
              <div :class="wizardFieldRowClass">
                <label :class="wizardFieldLabelClass">Mesto / obec</label>
                <AppSkMunicipalityCombobox
                  :model-value="selectedMunicipality?.name ?? ''"
                  placeholder="napríklad Bratislava"
                  :disabled="loading"
                  @update:model-value="onMunicipalityUpdate"
                />
              </div>
              <div :class="wizardFieldRowClass">
                <label :class="wizardFieldLabelClass">Kraj</label>
                <input
                  v-model="regionEditable"
                  type="text"
                  placeholder="Kraj"
                  :class="wizardTextInputClass"
                >
              </div>
            </template>
            <div :class="wizardFieldRowClass">
              <label :class="wizardFieldLabelClass">Ulica a číslo</label>
              <input
                v-model="streetLine"
                type="text"
                placeholder="Napr. Hlavná 12"
                :class="wizardTextInputClass"
              >
            </div>
            <div :class="wizardFieldRowClass">
              <label :class="wizardFieldLabelClass">PSČ</label>
              <input
                v-model="postalCode"
                type="text"
                placeholder="PSČ"
                maxlength="16"
                :class="[wizardTextInputClass, 'max-w-[200px]']"
              >
            </div>
          </div>
          <div :class="wizardFieldRowClass">
            <label :class="wizardFieldLabelClass">Forma práce</label>
            <div class="flex flex-wrap gap-2.5">
              <button
                v-for="wm in WORK_MODE_OPTIONS"
                :key="wm.value"
                type="button"
                :class="[wizardPillBase, wizardPillClass(workModes.includes(wm.value))]"
                @click="toggleWorkMode(wm.value)"
              >
                {{ wm.label }}
              </button>
            </div>
          </div>
          <div :class="wizardFieldRowClass">
            <label :class="wizardFieldLabelClass">Kategória</label>
            <AppFormDropdown
              v-model="categorySlug"
              bordered
              :options="categoryDropdownOptions"
              placeholder="Vyberte kategóriu"
              :disabled="loading"
            />
          </div>
          <div :class="wizardFieldRowClass">
            <label :class="wizardFieldLabelClass">Možnosti</label>
            <label class="flex is-clickable items-center gap-3">
              <AppCheckbox v-model="isUrgent" />
              <span class="font-dmSans text-lg font-semibold text-black">{{ S.urgentOnly }}</span>
            </label>
            <label class="mt-3 flex is-clickable items-start gap-3">
              <AppCheckbox v-model="isTopListing" class="mt-1" />
              <span class="font-dmSans text-lg font-semibold text-black">
                {{ S.jobTopListingLabel }}
                <span class="mt-0.5 block text-sm font-medium text-black/55">
                  {{ topListingCostHint }}
                </span>
              </span>
            </label>
          </div>
        </JobPostSectionCard>

        <JobPostSectionCard title="Obsah">
          <div :class="wizardFieldRowClass">
            <label :class="wizardFieldLabelClass">{{ S.jobDescription }}</label>
            <AppRichTextEditorLazy
              ref="richEditorRef"
              v-model="descriptionHtml"
              :disabled="loading"
              placeholder="Popíšte prácu, požiadavky a ďalšie informácie..."
            />
          </div>
        </JobPostSectionCard>

        <JobPostSectionCard title="Galéria">
          <div class="flex flex-wrap gap-3">
            <div
              v-for="(url, gi) in extraPhotos"
              :key="url + String(gi)"
              class="relative aspect-[4/3] w-[120px] shrink-0 overflow-hidden rounded-[14px]"
            >
              <img :src="url" alt="" class="size-full object-cover">
              <button
                type="button"
                class="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border-none bg-black text-white"
                :aria-label="S.remove"
                @click="removeGalleryAt(gi)"
              >
                <AppIcon name="x" :size="11" class="text-white" />
              </button>
            </div>
            <div
              class="relative flex aspect-[4/3] w-[120px] shrink-0 is-clickable flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[14px] border-2 border-dashed border-marketing-green bg-marketing-soft transition-colors hover:bg-marketing-mint"
            >
              <input
                ref="galleryInputRef"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                class="absolute inset-0 is-clickable opacity-0"
                :disabled="loading || uploadingExtra"
                @change="onExtraChange"
              >
              <AppIcon name="plus" :size="22" class="text-marketing-green" />
              <span class="font-dmSans text-[13px] text-black/30">Pridať</span>
            </div>
          </div>
          <p v-if="uploadingExtra" class="m-0 text-sm text-black/50">
            {{ S.loading }}
          </p>
        </JobPostSectionCard>
        </div>

        <div v-show="currentStep === 3" class="grid gap-5">
        <JobPostSectionCard :title="S.benefitsSectionTitle">
          <AppIdLabelMultiCombobox v-model="benefits" :options="BENEFITS" :disabled="loading" />
        </JobPostSectionCard>

        <JobPostSectionCard :title="S.jobAlertsCardEducation">
          <AppFormDropdown
            v-model="educationLevelModel"
            bordered
            :options="educationDropdownOptions"
            placeholder="Vyberte požadované vzdelanie"
            :disabled="loading"
          />
        </JobPostSectionCard>

        <JobPostSectionCard :title="S.jobAlertsCardLanguages">
          <JaDynamicRows
            v-model="languageRows"
            :options="LANGUAGES"
            :levels="LANGUAGE_LEVELS"
            :add-label="S.jobAlertsLanguagesAddRow"
            :option-placeholder="S.jobAlertsLanguageSelect"
            :level-label="S.jobAlertsLanguageLevel"
            :remove-label="S.jobAlertsRemoveRow"
          />
        </JobPostSectionCard>

        <JobPostSectionCard :title="S.jobAlertsCardPcSkills">
          <JobPostSkillTagsField
            v-model="skillTags"
            :placeholder="S.jobPostSkillsPlaceholder"
            :disabled="loading"
          />
        </JobPostSectionCard>

        <JobPostSectionCard :title="S.jobAlertsCardDriverLicense">
          <JobPostCvLicensePillGrid
            v-model="cvDriverLicenseCategories"
            :disabled="loading"
          />
        </JobPostSectionCard>

        <JobPostSectionCard title="Prihlásenie a kontakt">
          <div class="flex flex-col gap-4">
            <div class="flex flex-wrap gap-2.5">
              <button
                v-for="m in APPLICATION_METHOD_OPTIONS"
                :key="m.value"
                type="button"
                :class="[wizardPillBase, wizardPillClass(applicationMethod === m.value)]"
                :disabled="loading"
                @click="applicationMethod = m.value"
              >
                {{ m.label }}
              </button>
            </div>
            <input
              v-if="applicationMethod === 'email'"
              v-model="contactEmail"
              type="email"
              placeholder="Kontaktný e-mail"
              :class="wizardTextInputClass"
            >
            <input
              v-if="applicationMethod === 'phone'"
              v-model="contactPhone"
              type="tel"
              placeholder="Telefón"
              :class="wizardTextInputClass"
            >
            <input
              v-if="applicationMethod === 'external'"
              v-model="applicationUrl"
              type="url"
              placeholder="Odkaz na prihlásenie"
              :class="wizardTextInputClass"
            >
            <input
              v-model="contactPerson"
              type="text"
              placeholder="Kontaktná osoba"
              :class="wizardTextInputClass"
            >
            <div class="flex flex-wrap gap-2.5">
              <button
                v-for="d in jobPostRequiredDocuments"
                :key="d.value"
                type="button"
                :class="[wizardPillBase, wizardPillClass(requiredDocuments.includes(d.value))]"
                :disabled="loading"
                @click="toggleRequiredDocument(d.value)"
              >
                {{ d.label }}
              </button>
            </div>
          </div>
        </JobPostSectionCard>

        <JobPostSectionCard :title="S.jobPublishCreditsSectionTitle">
          <div
            class="rounded-2xl border border-marketing-green/20 bg-gradient-to-br from-marketing-mint/80 to-marketing-mint/30 p-5 sm:p-6"
          >
            <div class="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p class="m-0 font-dmSans text-sm font-medium text-black/50">
                  {{ S.jobPublishCostLabel }}
                </p>
                <p class="m-0 mt-1 font-dmSans text-[40px] font-extrabold leading-none text-marketing-green sm:text-[44px]">
                  {{ publishCostLabel }}
                </p>
                <p v-if="isUrgent && publishCredits > 0" class="m-0 mt-2 font-dmSans text-sm font-medium text-black/55">
                  {{ S.jobPublishUrgentCostHint }}
                </p>
                <p v-else-if="isUrgent" class="m-0 mt-2 font-dmSans text-sm font-medium text-marketing-green">
                  {{ S.jobPublishUrgentIncludedInPlan }}
                </p>
              </div>
              <dl class="m-0 grid gap-2 font-dmSans text-sm text-black/75">
                <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 sm:justify-end sm:text-right">
                  <dt class="font-medium text-black/45">
                    {{ S.jobYourCredits }}
                  </dt>
                  <dd class="m-0 font-extrabold text-black">
                    {{ effectiveCreditBalance ?? '…' }}
                  </dd>
                </div>
                <div
                  v-if="billingMaxOffers != null"
                  class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 sm:justify-end sm:text-right"
                >
                  <dt class="font-medium text-black/45">
                    {{ S.jobActiveOffersLimit }}
                  </dt>
                  <dd class="m-0 font-extrabold text-black">
                    {{ billingActiveOffers ?? 0 }} / {{ billingMaxOffers }}
                  </dd>
                </div>
              </dl>
            </div>
            <p
              v-if="insufficientCreditsForPublish"
              class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              role="status"
            >
              {{ S.insufficientCreditsMessage }}
            </p>
          </div>
          <AppButton
            to="/cennik"
            variant="outline"
            size="md"
            class="mt-4 w-full sm:w-auto"
          >
            {{ S.jobBuyCreditsLink }}
          </AppButton>
        </JobPostSectionCard>
        </div>

        <template #footer>
          <p
            v-if="draftSavedMessage"
            class="mb-3 w-full basis-full rounded-xl border border-marketing-green/30 bg-marketing-mint px-3 py-2 text-sm font-medium text-marketing-green"
            role="status"
          >
            {{ draftSavedMessage }}
          </p>
          <p
            v-if="error"
            data-job-post-action-error
            class="mb-3 w-full basis-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {{ error }}
          </p>
          <button
            v-if="currentStep > 0"
            type="button"
            class="inline-flex h-12 is-clickable items-center justify-center gap-2 rounded-full border-0 bg-marketing-soft px-5 text-[17px] font-extrabold text-black/[0.62] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] hover:bg-marketing-panel disabled:opacity-50"
            :disabled="loading"
            @click="currentStep -= 1"
          >
            <AppIcon name="chevron-left" :size="16" />
            {{ S.jobHubWizardBack }}
          </button>
          <div v-else />
          <div class="flex flex-wrap gap-3">
            <button
              v-if="currentStep < 3"
              type="button"
              class="inline-flex h-12 is-clickable items-center justify-center gap-2 rounded-full border-0 bg-marketing-green px-5 text-[17px] font-extrabold text-white disabled:opacity-50"
              :disabled="loading"
              @click="currentStep += 1"
            >
              {{ S.jobHubWizardNext }}
              <AppIcon name="chevron-right" :size="16" />
            </button>
            <template v-else>
              <button
                type="button"
                class="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-marketing-green bg-white px-5 text-[17px] font-extrabold text-marketing-green disabled:opacity-50"
                :disabled="loading"
                @click.prevent="handleSubmit(true)"
              >
                {{ loading ? S.loading : S.saveDraft }}
              </button>
              <button
                type="submit"
                class="inline-flex h-12 items-center justify-center gap-2 rounded-full border-0 bg-marketing-green px-5 text-[17px] font-extrabold text-white disabled:is-disabled-cursor disabled:opacity-60"
                :disabled="loading"
              >
                {{ loading ? S.loading : S.publishJobListing }}
              </button>
            </template>
          </div>
        </template>
      </JobPostShell>
    </form>
  </div>

  <AppConfirmDialog
    v-model:open="publishConfirmOpen"
    variant="confirm"
    :title="S.promotionConfirmTitle"
    :message="publishConfirmMessage"
    :confirm-text="S.publishJobListing"
    :cancel-text="S.cancel"
    @confirm="confirmPublish"
  />
</template>

<script setup lang="ts">
// Job post UI: typ úväzku drives employment_types; derived ad kind toggles date blocks; credits charged on API.
import { nextTick } from 'vue'
import { ROUTES } from '~/utils/app-routes'
import {
  getPlanTierCreditCost,
  parsePlanTierCreditCostsFromConfig,
} from '~/utils/plan-tier-credit-costs'
import { creditCountLabel } from '~/utils/sk-plural'
import { S } from '~/utils/strings'
import { showNotFound } from '~/utils/not-found'
import { waitForAuthReady } from '~/utils/wait-for-auth'
import { useJobWizardBootstrap } from '~/utils/job-post-hub'
import type { Job } from '~/utils/job'
import {
  wizardFieldLabelClass,
  wizardFieldRowClass,
  wizardPillBase,
  wizardPillClass,
  wizardTextInputClass,
} from '~/utils/wizard-ui'
import AppFormDropdown from '~/components/AppFormDropdown.vue'
import AppSkMunicipalityCombobox from '~/components/AppSkMunicipalityCombobox.vue'
import {
  compressImageFileToJpeg,
  validateImageUpload,
} from '~/utils/image-compression'
import { CATEGORIES, getCategoryLabel } from '~/utils/job'
import {
  BENEFITS,
  EDUCATION_LEVELS,
  LANGUAGES,
  LANGUAGE_LEVELS,
} from '~/utils/job-alert-options'
import {
  APPLICATION_METHOD_OPTIONS,
  employmentUsesStandardNastup,
  jobPostEmploymentOptionsForVariant,
  type JobPostVariant,
  JOB_POST_REQUIRED_DOCUMENT_OPTIONS,
  REQUIRED_EXPERIENCE_OPTIONS,
  WORK_MODE_OPTIONS,
  salaryTypeOptionsForEmployment,
  salaryUnitForType,
} from '~/utils/job-post-options'
import { foreignWorkCountryDropdownOptions } from '~/utils/foreign-work-countries'

const props = withDefaults(
  defineProps<{
    jobId: string
    variant?: JobPostVariant
    hubRoute?: string
    hubBackLabel?: string
    wizardPageTitle?: string
  }>(),
  {
    variant: 'domestic',
    hubRoute: ROUTES.jobHub,
    hubBackLabel: S.jobHubBackToHub,
    wizardPageTitle: '',
  },
)

const supabase = useSupabase()
const { api, getApiBaseUrl } = useApi()
const { user, profile, refreshUser } = useAuth()
const wizardBootstrap = useJobWizardBootstrap()
const currentStep = ref(0)
const hydrating = ref(true)
const loadError = ref<string | null>(null)
const billingCredits = ref<number | null>(null)
const billingPlanSlug = ref('zadarmo')
const billingMaxOffers = ref<number | null>(null)
const billingActiveOffers = ref<number | null>(null)
const { config: billingCatalogConfig, load: loadBillingCatalog } = useCatalogBilling()
const publishConfirmOpen = ref(false)
const pendingDraft = ref(false)
const draftSavedMessage = ref<string | null>(null)
const pageTitle = computed(() =>
  props.wizardPageTitle?.trim() ? props.wizardPageTitle : S.addJobPageTitle,
)
const hubRoute = computed(() => props.hubRoute)
const hubBackLabel = computed(() => props.hubBackLabel)
const { ensureMunicipality, dispose: disposeMunicipalitySearch } = useSkMunicipalitySearch()

const categoryDropdownOptions = CATEGORIES.map((slug) => ({
  value: slug,
  label: getCategoryLabel(slug),
  categorySlug: slug,
}))

const form = useJobPostForm({ variant: props.variant })
const {
  selectedEmploymentType,
  jobType,
  title,
  categorySlug,
  selectedMunicipality,
  regionEditable,
  foreignWorkCountry,
  foreignWorkCity,
  streetLine,
  postalCode,
  workModes,
  nastupDate,
  nastupAsap,
  brigOd,
  brigDo,
  tppObdobie,
  tppOd,
  tppDo,
  fuskaNezalezi,
  fuskaOd,
  fuskaDo,
  turnusOd,
  turnusDo,
  applicationDeadline,
  weeklyHours,
  estimatedHours,
  salaryType,
  salaryAmountInput,
  salaryMax,
  requiredExperience,
  benefits,
  educationLevel,
  cvDriverLicenseCategories,
  languageRows,
  skillTags,
  ownCarRequired,
  descriptionHtml,
  responsibilities,
  requirementsText,
  offerText,
  applicationMethod,
  contactPerson,
  contactEmail,
  contactPhone,
  showPhonePublicly,
  applicationUrl,
  requiredDocuments,
  coverPhoto,
  extraPhotos,
  isUrgent,
  isTopListing,
  isAlreadyPublished,
  hadTopOnLoad,
  toggleWorkMode,
  toggleRequiredDocument,
} = form

const planTierCosts = computed(() =>
  parsePlanTierCreditCostsFromConfig(billingCatalogConfig.value?.planTierCreditCosts),
)

const topListingCredits = computed(() =>
  getPlanTierCreditCost(
    planTierCosts.value,
    billingPlanSlug.value,
    'topOfCategory7Days',
  ),
)

const topCreditsNeeded = computed(() =>
  isTopListing.value && !hadTopOnLoad.value ? topListingCredits.value : 0,
)

const effectiveCreditBalance = computed(() => {
  if (billingCredits.value != null) return billingCredits.value
  return profile.value?.credits ?? null
})

const topListingCostHint = computed(() => {
  const n = topCreditsNeeded.value
  if (n < 1) return S.jobTopListingHint
  return `${S.jobTopListingHint} (${creditCountLabel(n)}).`
})

const publishCredits = computed(() => {
  const action = isUrgent.value ? 'publishUrgentJob' : 'publishJobMonth'
  const base = isAlreadyPublished.value
    ? 0
    : getPlanTierCreditCost(planTierCosts.value, billingPlanSlug.value, action)
  return base + topCreditsNeeded.value
})
const publishCostLabel = computed(() => {
  const n = publishCredits.value
  if (n < 1) return S.pricingCvFreeLabel
  return creditCountLabel(n)
})
const insufficientCreditsForPublish = computed(() => {
  const needed = publishCredits.value
  if (needed < 1) return false
  const balance = effectiveCreditBalance.value
  if (balance == null) return false
  return balance < needed
})
const publishConfirmMessage = computed(() =>
  S.promotionConfirmMessage.replace('{credits}', String(publishCredits.value)),
)

const employmentTypeOptions = computed(() =>
  jobPostEmploymentOptionsForVariant(props.variant),
)
const jobPostRequiredDocuments = JOB_POST_REQUIRED_DOCUMENT_OPTIONS

const usesStandardNastup = computed(() =>
  employmentUsesStandardNastup(selectedEmploymentType.value),
)

const educationDropdownOptions = EDUCATION_LEVELS.map((o) => ({
  value: String(o.id),
  label: o.label,
}))

const educationLevelModel = computed({
  get: () => (educationLevel.value !== '' ? String(educationLevel.value) : ''),
  set: (v: string) => {
    educationLevel.value = v ? Number(v) : ''
  },
})

const tppObdobieTabs = [
  { value: 'urcite' as const, label: 'Určité' },
  { value: 'neurcite' as const, label: 'Neurčité' },
]

const salaryTypeOptions = computed(() =>
  salaryTypeOptionsForEmployment(selectedEmploymentType.value),
)
const thumbInputRef = ref<HTMLInputElement | null>(null)
const galleryInputRef = ref<HTMLInputElement | null>(null)
const richEditorRef = ref<{ getPlainText: () => string } | null>(null)
const uploadingCover = ref(false)
const uploadingExtra = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const salaryUnit = computed(() => salaryUnitForType(salaryType.value))

const showSalaryAmountFields = computed(() => salaryType.value !== 'negotiable')

const foreignCountryDropdownOptions = foreignWorkCountryDropdownOptions()

async function onMunicipalityUpdate(name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) {
    selectedMunicipality.value = null
    return
  }
  const row = await ensureMunicipality(trimmed)
  if (row) {
    selectedMunicipality.value = row
    regionEditable.value = row.kraj
  }
}

watch(form.nastupAsap, (v) => {
  if (v) form.nastupDate.value = ''
})

watch(salaryType, (t) => {
  if (t === 'negotiable') {
    salaryAmountInput.value = ''
    salaryMax.value = ''
  }
})

onUnmounted(() => {
  disposeMunicipalitySearch()
})

async function uploadFile(file: File, kind: 'cover' | 'extra'): Promise<string> {
  if (!user.value?.id) {
    throw new Error('Nie ste prihlásený.')
  }
  const validationError = validateImageUpload(file)
  if (validationError) {
    throw new Error(validationError)
  }
  const jpegFile = await compressImageFileToJpeg(file)
  const { uploadJobPhoto } = useStorageUpload()
  const result = await uploadJobPhoto(jpegFile, kind)
  void api('/api/analytics/storage-access', {
    method: 'POST',
    body: {
      bucket_id: 'job-photos',
      object_path: result.storagePath,
      action: 'upload',
      bytes: result.size,
    },
  })
  return result.publicUrl
}

async function onCoverChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const validationError = validateImageUpload(file)
  if (validationError) {
    error.value = validationError
    input.value = ''
    return
  }
  uploadingCover.value = true
  error.value = null
  try {
    form.coverPhoto.value = await uploadFile(file, 'cover')
    form.markPhotosTouched()
  } catch (err) {
    error.value = String(err)
  } finally {
    uploadingCover.value = false
    input.value = ''
  }
}

async function onThumbnailDrop(e: DragEvent): Promise<void> {
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  const validationError = validateImageUpload(file)
  if (validationError) {
    error.value = validationError
    return
  }
  uploadingCover.value = true
  error.value = null
  try {
    form.coverPhoto.value = await uploadFile(file, 'cover')
    form.markPhotosTouched()
  } catch (err) {
    error.value = String(err)
  } finally {
    uploadingCover.value = false
  }
}

async function onExtraChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return
  for (let i = 0; i < files.length; i++) {
    const validationError = validateImageUpload(files[i]!)
    if (validationError) {
      error.value = validationError
      input.value = ''
      return
    }
  }
  uploadingExtra.value = true
  error.value = null
  try {
    for (let i = 0; i < files.length; i++) {
      const url = await uploadFile(files[i]!, 'extra')
      form.extraPhotos.value = [...form.extraPhotos.value, url]
      form.markPhotosTouched()
    }
  } catch (err) {
    error.value = String(err)
  } finally {
    uploadingExtra.value = false
    input.value = ''
  }
}

function removeGalleryAt(index: number): void {
  form.extraPhotos.value = form.extraPhotos.value.filter((_, i) => i !== index)
  form.markPhotosTouched()
}

async function loadBillingAccount(): Promise<void> {
  await waitForAuthReady()
  if (!user.value) return
  const res = await api<{
    credits: number
    planSlug?: string
    maxActiveOffers: number
    activeOffersCount: number
  }>('/api/billing/account')
  if (res.ok && res.data) {
    billingCredits.value = res.data.credits
    billingPlanSlug.value = res.data.planSlug?.trim() || 'zadarmo'
    billingMaxOffers.value = res.data.maxActiveOffers
    billingActiveOffers.value = res.data.activeOffersCount
  }
}

async function hydrateFromApi(): Promise<boolean> {
  let res = await api<Job>(`/api/jobs/${props.jobId}/for-edit`)
  if (!res.ok && (res.status === 401 || res.status === 404)) {
    const { refreshBffSessionFromApi } = await import('~/utils/bff-session-refresh')
    const refreshed = await refreshBffSessionFromApi(getApiBaseUrl())
    if (refreshed.ok) {
      res = await api<Job>(`/api/jobs/${props.jobId}/for-edit`)
    }
  }
  if (res.ok && res.data) {
    form.hydrateFromJob(res.data as Job & Record<string, unknown>)
    await form.resolveDomesticMunicipality(ensureMunicipality)
    return true
  }
  if (res.status === 403) {
    loadError.value = 'Nemáte oprávnenie upravovať tento inzerát.'
    return false
  }
  if (res.status === 404) {
    showNotFound(S.jobNotFound)
    return false
  }
  loadError.value = 'Inzerát sa nepodarilo načítať.'
  return false
}

async function hydrateWizard(): Promise<void> {
  if (!props.jobId) {
    hydrating.value = false
    showNotFound(S.jobNotFound)
    return
  }
  loadError.value = null
  hydrating.value = true
  await waitForAuthReady()
  const { data } = await supabase.auth.getUser()
  if (!contactEmail.value && data.user?.email) {
    contactEmail.value = data.user.email
  }

  const boot = wizardBootstrap.value
  if (boot?.id === props.jobId) {
    form.hydrateFromJob(boot as Job & Record<string, unknown>)
    await form.resolveDomesticMunicipality(ensureMunicipality)
    wizardBootstrap.value = null
    hydrating.value = false
    return
  }

  await hydrateFromApi()
  wizardBootstrap.value = null
  hydrating.value = false
}

onMounted(() => {
  void loadBillingCatalog()
  void loadBillingAccount()
  void hydrateWizard()
})

watch(
  () => user.value?.id,
  (id) => {
    if (id) void loadBillingAccount()
  },
)

watch(
  () => props.jobId,
  (id, prev) => {
    if (id && id !== prev) void hydrateWizard()
  },
)

function showActionError(message: string): void {
  error.value = message
  if (!import.meta.client) return
  nextTick(() => {
    document
      .querySelector('[data-job-post-action-error]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

function parseApiErrorMessage(body: string | undefined, fallback: string): string {
  if (!body) return fallback
  try {
    const parsed = JSON.parse(body) as { message?: string | string[] }
    const msg = parsed.message
    if (Array.isArray(msg)) return msg.join(' ')
    if (typeof msg === 'string' && msg.trim()) return msg.trim()
  } catch {
    /* plain text */
  }
  return body.length < 400 ? body : fallback
}

function handleSubmit(isDraft: boolean): void {
  draftSavedMessage.value = null
  if (isDraft) {
    void submitJob(true)
    return
  }
  if (insufficientCreditsForPublish.value) {
    showActionError(S.insufficientCreditsMessage)
    return
  }
  // SECURITY: Credit cost shown here is UX only — Nest charges on activate/publish.
  pendingDraft.value = false
  publishConfirmOpen.value = true
}

async function confirmPublish(): Promise<void> {
  await submitJob(pendingDraft.value)
}

async function submitJob(isDraft: boolean): Promise<void> {
  error.value = null
  draftSavedMessage.value = null
  const plain = richEditorRef.value?.getPlainText() ?? ''
  const validationError = form.validateForPublish(plain, isDraft)
  if (validationError) {
    showActionError(validationError)
    return
  }
  const { ensureBffCsrfForMutation } = await import('~/utils/bff-csrf-state')
  if (!(await ensureBffCsrfForMutation(getApiBaseUrl()))) {
    showActionError(S.sessionExpiredMessage)
    return
  }
  loading.value = true
  try {
    const body = form.buildApiBody(isDraft, plain)
    const res = await api<Job>(`/api/jobs/${props.jobId}`, { method: 'PATCH', body })
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        showActionError(parseApiErrorMessage(res.body, S.sessionExpiredMessage))
      } else {
        showActionError(parseApiErrorMessage(res.body, S.saveFailed))
      }
      return
    }
    if (res.data) {
      form.applyJobBillingSnapshot(res.data as Job & Record<string, unknown>)
    }
    await refreshUser()
    void loadBillingAccount()
    if (isDraft) {
      draftSavedMessage.value = S.jobDraftSaved
      return
    }
    await navigateTo({ path: props.hubRoute }, { replace: true })
  } catch (err) {
    showActionError(err instanceof Error ? err.message : S.saveFailed)
  } finally {
    loading.value = false
  }
}

</script>

