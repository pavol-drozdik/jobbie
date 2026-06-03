<template>
  <div class="cv-form box-border w-full bg-marketing-mint px-5 pt-[24px] font-dmSans text-black">
    <div
      ref="shellRef"
      class="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-start gap-[22px] min-[821px]:grid-cols-[280px_minmax(0,1fr)]"
    >
      <aside
        id="job-post-sidebar"
        ref="sidebarRef"
        class="relative z-50 rounded-[20px] bg-white p-[18px] shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] max-[820px]:static"
      >
        <div class="flex flex-col gap-2">
          <button
            v-for="(s, idx) in activeSteps"
            :key="idx"
            type="button"
            class="grid w-full cursor-pointer grid-cols-[42px_minmax(0,1fr)] items-center gap-3 rounded-2xl border-0 p-2.5 text-left transition-colors hover:bg-marketing-panel hover:text-marketing-green"
            :class="
              modelValue === idx
                ? 'bg-marketing-panel text-marketing-green'
                : 'bg-transparent text-black/[0.58]'
            "
            @click="emit('update:modelValue', idx)"
          >
            <span
              class="flex h-[42px] w-[42px] items-center justify-center rounded-full text-lg font-black"
              :class="
                modelValue === idx
                  ? 'bg-marketing-green text-white'
                  : 'bg-marketing-mint text-marketing-green'
              "
            >{{ idx + 1 }}</span>
            <span class="min-w-0">
              <strong class="block text-[17px] font-extrabold leading-tight">{{ s.title }}</strong>
              <span class="mt-0.5 block text-[13px] font-medium text-black/[0.42]">{{ s.sub }}</span>
            </span>
          </button>
        </div>
      </aside>
      <section class="overflow-hidden rounded-[20px] bg-white shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)]">
        <div class="overflow-hidden rounded-t-[20px]">
          <div class="h-2 bg-black/[0.06]">
            <span
              class="block h-full bg-marketing-green transition-[width] duration-300"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
        </div>
        <div class="overflow-visible p-[34px] max-[820px]:px-[18px] max-[820px]:py-6">
          <h1 v-if="pageTitle" class="m-0 mb-6 text-[28px] font-extrabold leading-tight text-black max-sm:text-[24px]">
            {{ pageTitle }}
          </h1>
          <slot />
          <div v-if="$slots.footer" class="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-5">
            <slot name="footer" />
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

export type WizardShellStep = { title: string; sub: string }

const defaultJobSteps: WizardShellStep[] = [
  { title: S.jobHubWizardStepBasic, sub: S.jobHubWizardStepBasicSub },
  { title: S.jobHubWizardStepDates, sub: S.jobHubWizardStepDatesSub },
  { title: S.jobHubWizardStepPlace, sub: S.jobHubWizardStepPlaceSub },
  { title: S.jobHubWizardStepPublish, sub: S.jobHubWizardStepPublishSub },
]

const props = defineProps<{
  modelValue: number
  pageTitle?: string
  steps?: WizardShellStep[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const shellRef = ref<HTMLElement | null>(null)
const sidebarRef = ref<HTMLElement | null>(null)
useCvPrototypeStickySidebar(sidebarRef, shellRef)

const activeSteps = computed(() =>
  props.steps?.length ? props.steps : defaultJobSteps,
)

const progressPercent = computed(
  () => ((props.modelValue + 1) / activeSteps.value.length) * 100,
)
</script>
