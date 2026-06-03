<template>
  <div class="cv-form box-border w-full bg-marketing-mint px-5 pt-[24px] font-dmSans text-black">
    <div
      ref="shellRef"
      class="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-start gap-[22px] min-[821px]:grid-cols-[280px_minmax(0,1fr)]"
    >
      <aside
        id="job-alert-sidebar"
        ref="sidebarRef"
        class="relative z-50 rounded-[20px] bg-white p-[18px] shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] max-[820px]:static"
      >
        <div class="flex flex-col gap-2">
          <button
            v-for="s in stepNav"
            :key="s.step"
            type="button"
            class="grid w-full cursor-pointer grid-cols-[42px_minmax(0,1fr)] items-center gap-3 rounded-2xl border-0 p-2.5 text-left transition-colors hover:bg-marketing-panel hover:text-marketing-green"
            :class="
              parentStep + 1 === s.step
                ? 'bg-marketing-panel text-marketing-green'
                : 'bg-transparent text-black/[0.58]'
            "
            @click="emit('goStep', s.step - 1)"
          >
            <span
              class="flex h-[42px] w-[42px] items-center justify-center rounded-full text-lg font-black"
              :class="
                parentStep + 1 === s.step
                  ? 'bg-marketing-green text-white'
                  : 'bg-marketing-mint text-marketing-green'
              "
            >{{ s.step }}</span>
            <span class="min-w-0">
              <strong class="block text-[17px] font-extrabold leading-tight">{{ s.title }}</strong>
              <span class="mt-0.5 block text-[13px] font-medium text-black/[0.42]">{{ s.sub }}</span>
            </span>
          </button>
        </div>
        <div
          v-show="parentStep === 1"
          class="mt-[18px] flex flex-col gap-2 border-t border-black/[0.06] pt-4"
        >
          <div class="px-2.5 pb-1 text-[13px] font-black uppercase tracking-wide text-black/[0.34]">
            {{ S.jobEmailAlertsWizardStep2Sections }}
          </div>
          <button
            v-for="sec in sectionMenu"
            :key="sec.id"
            type="button"
            class="flex items-center gap-2 rounded-full border-0 px-3 py-2.5 text-left text-[15px] font-bold transition-colors hover:bg-marketing-mint hover:text-marketing-green"
            :class="
              activeSection === sec.id
                ? 'bg-marketing-mint text-marketing-green'
                : 'bg-transparent text-black/[0.55]'
            "
            @click="scrollToSection(sec.id)"
          >
            {{ sec.label }}
          </button>
        </div>
      </aside>

      <section class="overflow-hidden rounded-[20px] bg-white shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)]">
        <div class="overflow-hidden rounded-t-[20px]">
          <div class="h-2 bg-black/[0.06]">
            <span
              class="block h-full bg-marketing-green transition-[width] duration-300"
              :style="{ width: `${(parentStep + 1) * 33.333}%` }"
            />
          </div>
        </div>
        <div class="overflow-visible p-[34px] max-[820px]:px-[18px] max-[820px]:py-6">
          <slot :name="`step${parentStep}`" :step-badge="stepBadge" />
          <div class="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-5">
            <button
              type="button"
              class="inline-flex h-12 items-center justify-center gap-2 rounded-full border-0 px-5 text-[17px] font-extrabold"
              :class="
                parentStep === 0
                  ? 'cursor-not-allowed bg-marketing-soft text-black/[0.62] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]'
                  : 'cursor-pointer bg-marketing-soft text-black/[0.62] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] hover:bg-marketing-panel'
              "
              :disabled="parentStep === 0"
              @click="parentStep > 0 && emit('goStep', parentStep - 1)"
            >
              <AppIcon name="chevron-left" :size="16" />
              {{ S.jobEmailAlertsWizardBack }}
            </button>
            <div class="flex flex-wrap gap-3">
              <slot name="step-actions" :parent-step="parentStep" />
              <button
                v-if="parentStep < 2"
                type="button"
                class="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-marketing-green px-5 text-[17px] font-extrabold text-white"
                @click="emit('next')"
              >
                {{ S.jobEmailAlertsWizardContinue }}
                <AppIcon name="chevron-right" :size="16" />
              </button>
              <button
                v-else
                type="button"
                class="inline-flex h-12 items-center justify-center gap-2 rounded-full border-0 bg-marketing-green px-5 text-[17px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="finishDisabled"
                @click="emit('finish')"
              >
                {{ S.jobEmailAlertsWizardFinish }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCvPrototypeStickySidebar } from '~/composables/useCvPrototypePreview'
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    parentStep: number
    finishDisabled?: boolean
  }>(),
  { finishDisabled: false },
)

const emit = defineEmits<{
  goStep: [step: number]
  next: []
  finish: []
}>()

const shellRef = ref<HTMLElement | null>(null)
const sidebarRef = ref<HTMLElement | null>(null)
useCvPrototypeStickySidebar(sidebarRef, shellRef)

const activeSection = ref('ja-search')

const stepNav = computed(() => [
  { step: 1, title: S.jobEmailAlertsWizardStep1NavTitle, sub: S.jobEmailAlertsWizardStep1NavSub },
  { step: 2, title: S.jobEmailAlertsWizardStep2NavTitle, sub: S.jobEmailAlertsWizardStep2NavSub },
  { step: 3, title: S.jobEmailAlertsWizardStep3NavTitle, sub: S.jobEmailAlertsWizardStep3NavSub },
])

const sectionMenu = [
  { id: 'ja-search', label: S.jobEmailAlertsWizardSectionSearch },
  { id: 'ja-location', label: S.jobEmailAlertsWizardSectionLocation },
  { id: 'ja-employment', label: S.jobEmailAlertsWizardSectionEmployment },
  { id: 'ja-category', label: S.jobEmailAlertsWizardSectionCategory },
  { id: 'ja-benefits', label: S.benefitsSectionTitle },
]

const stepBadge = computed(() =>
  S.jobEmailAlertsWizardStepBadge.replace('{step}', String(props.parentStep + 1)),
)

function scrollToSection(id: string): void {
  activeSection.value = id
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>
