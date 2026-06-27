<template>
  <div class="relative flex flex-col gap-3.5 overflow-visible rounded-[20px] bg-white p-7 shadow-[0_0_12px_rgba(0,0,0,0.07)]">
    <div>
      <div class="text-[13px] font-medium text-black/40">{{ salaryKindLabel }}</div>
      <div class="text-[42px] font-extrabold leading-none text-marketing-green">{{ salaryAmountLine }}</div>
      <div v-if="salarySubline" class="mt-0.5 text-base font-medium text-black/40">{{ salarySubline }}</div>
    </div>
    <hr class="m-0 border-0 border-t border-black/[0.07]">
    <div
      v-if="applicationDeadlineFormatted"
      class="flex items-center gap-2 text-sm font-medium text-black/50"
    >
      <AppIcon name="hourglass" :size="14" class="shrink-0 text-marketing-green" />
      <span>{{ S.jobApplyBy }} <strong class="font-semibold text-black">{{ applicationDeadlineFormatted }}</strong></span>
    </div>
    <AppButton
      v-if="isOwner"
      variant="outline"
      size="lg"
      block
      class="min-h-[50px] h-[50px] border-[1.5px] border-gray-200 bg-white text-base font-semibold text-black/65 hover:border-marketing-green hover:text-marketing-green"
      @click="emit('toggleStats')"
    >{{ S.jobCardStatsLink }} {{ showStatsToggle ? '▴' : '▾' }}</AppButton>
    <AppButton
      v-if="isOwner && !job.is_active && !job.is_draft"
      variant="primary"
      size="lg"
      block
      class="min-h-14 h-14 text-lg"
      :disabled="actionLoading"
      @click="emit('activate')"
    >{{ actionLoading ? S.loading : S.publishWithoutPayment }}</AppButton>
    <button
      v-if="hasUser && applied && !isOwner"
      type="button"
      disabled
      class="flex h-14 w-full is-disabled-cursor items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-lg font-semibold text-black/45"
    >{{ S.jobAlreadyApplied }}</button>
    <AppButton
      v-if="hasUser && !applied && !isOwner"
      variant="primary"
      size="lg"
      block
      class="min-h-14 h-14 text-lg"
      :disabled="actionLoading || !job.is_active"
      @click="emit('apply')"
    >{{ actionLoading ? S.loading : S.jobSingularApply }}</AppButton>
    <AppButton
      v-if="!hasUser"
      variant="primary"
      size="lg"
      block
      class="min-h-14 h-14 text-lg"
      :to="loginWithRedirect"
    >{{ S.jobSingularApply }}</AppButton>
    <div v-if="!isOwner" class="flex items-center gap-2">
      <AppButton
        variant="outline"
        size="lg"
        class="min-h-[50px] h-[50px] min-w-0 flex-1 border-[1.5px] border-gray-200 bg-white text-base font-semibold text-black/65 hover:border-marketing-green hover:text-marketing-green"
        :disabled="saveLoading"
        @click="emit('save')"
      >
        <AppIcon :name="isSaved ? 'check-circle' : 'bookmark'" :size="18" class="shrink-0" />
        {{ isSaved ? S.jobSavedRemove : S.jobSaveOffer }}
      </AppButton>
      <ContentReportMenu
        class="shrink-0"
        target-type="job_offer"
        :target-id="job.id"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { S } from '~/utils/strings'
import type { Job } from '~/utils/job'
import ContentReportMenu from '~/components/marketing/ContentReportMenu.vue'

const emit = defineEmits<{
  toggleStats: []
  activate: []
  apply: []
  save: []
}>()

defineProps<{
  job: Job
  salaryKindLabel: string
  salaryAmountLine: string
  salarySubline: string
  applicationDeadlineFormatted: string
  isOwner: boolean
  hasUser: boolean
  applied: boolean
  actionLoading: boolean
  saveLoading: boolean
  isSaved: boolean
  showStatsToggle: boolean
  loginWithRedirect: RouteLocationRaw
}>()
</script>
