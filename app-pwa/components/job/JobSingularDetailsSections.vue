<template>
  <div class="flex flex-col gap-5">
    <section
      v-if="scheduleItems.length > 0"
      class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9"
    >
      <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">
        {{ S.jobDetailScheduleTitle }}
      </h2>
      <dl class="m-0 grid gap-3">
        <div
          v-for="(item, idx) in scheduleItems"
          :key="`schedule-${idx}`"
          class="grid gap-0.5 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-4"
        >
          <dt class="text-[15px] font-semibold text-black/45">{{ item.label }}</dt>
          <dd class="m-0 text-[17px] font-medium text-black/75">{{ item.value }}</dd>
        </div>
      </dl>
    </section>

    <section
      v-if="locationDetail.lines.length > 0"
      class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9"
    >
      <div class="mb-[18px] flex flex-wrap items-center gap-2">
        <h2 class="m-0 text-[22px] font-extrabold text-black">
          {{ S.jobDetailLocationTitle }}
        </h2>
        <span
          v-if="locationDetail.isForeign"
          class="inline-flex rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-800"
        >
          {{ S.jobDetailForeignBadge }}
        </span>
      </div>
      <dl class="m-0 grid gap-3">
        <div
          v-for="(item, idx) in locationDetail.lines"
          :key="`location-${idx}`"
          class="grid gap-0.5 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-4"
        >
          <dt class="text-[15px] font-semibold text-black/45">{{ item.label }}</dt>
          <dd class="m-0 text-[17px] font-medium text-black/75">{{ item.value }}</dd>
        </div>
      </dl>
    </section>

    <section
      v-if="hasRequirements"
      class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9"
    >
      <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">
        {{ S.jobDetailRequirementsTitle }}
      </h2>
      <div class="flex flex-col gap-5">
        <div v-if="requirementsDetail.education">
          <h3 class="m-0 mb-2 text-[15px] font-semibold text-black/45">
            {{ S.jobAlertsCardEducation }}
          </h3>
          <p class="m-0 text-[17px] font-medium text-black/75">
            {{ requirementsDetail.education }}
          </p>
        </div>
        <div v-if="requirementsDetail.languages.length > 0">
          <h3 class="m-0 mb-2 text-[15px] font-semibold text-black/45">
            {{ S.jobAlertsCardLanguages }}
          </h3>
          <ul class="m-0 list-none space-y-1.5 p-0">
            <li
              v-for="(lang, idx) in requirementsDetail.languages"
              :key="`lang-${idx}`"
              class="text-[17px] font-medium text-black/75"
            >
              {{ lang }}
            </li>
          </ul>
        </div>
        <div v-if="requirementsDetail.skills.length > 0">
          <h3 class="m-0 mb-2.5 text-[15px] font-semibold text-black/45">
            {{ S.jobAlertsCardPcSkills }}
          </h3>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(skill, idx) in requirementsDetail.skills"
              :key="`skill-${idx}`"
              class="inline-flex rounded-full bg-marketing-soft px-3.5 py-1.5 text-[15px] font-medium text-black/75"
            >
              {{ skill }}
            </span>
          </div>
        </div>
        <div v-if="requirementsDetail.driverLicenses.length > 0">
          <h3 class="m-0 mb-2.5 text-[15px] font-semibold text-black/45">
            {{ S.jobAlertsCardDriverLicense }}
          </h3>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(license, idx) in requirementsDetail.driverLicenses"
              :key="`license-${idx}`"
              class="inline-flex rounded-full bg-marketing-soft px-3.5 py-1.5 text-[15px] font-medium text-black/75"
            >
              {{ license }}
            </span>
          </div>
        </div>
        <div v-if="requirementsDetail.workShifts.length > 0">
          <h3 class="m-0 mb-2.5 text-[15px] font-semibold text-black/45">
            {{ S.jobAlertsCardWorkShiftMode }}
          </h3>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(shift, idx) in requirementsDetail.workShifts"
              :key="`shift-${idx}`"
              class="inline-flex rounded-full bg-marketing-soft px-3.5 py-1.5 text-[15px] font-medium text-black/75"
            >
              {{ shift }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="benefitLabels.length > 0"
      class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9"
    >
      <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">
        {{ S.benefitsSectionTitle }}
      </h2>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="(benefit, idx) in benefitLabels"
          :key="`benefit-${idx}`"
          class="inline-flex rounded-full bg-marketing-soft px-3.5 py-1.5 text-[15px] font-medium text-black/75"
        >
          {{ benefit }}
        </span>
      </div>
    </section>

    <section
      v-if="hasApplicationInfo"
      class="rounded-[20px] bg-white px-6 py-8 shadow-[0_0_12px_rgba(0,0,0,0.07)] marketing:px-9"
    >
      <h2 class="m-0 mb-[18px] text-[22px] font-extrabold text-black">
        {{ S.jobDetailApplicationTitle }}
      </h2>
      <dl class="m-0 grid gap-3">
        <div
          v-if="applicationDetail.method"
          class="grid gap-0.5 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-4"
        >
          <dt class="text-[15px] font-semibold text-black/45">
            {{ S.jobDetailApplicationMethod }}
          </dt>
          <dd class="m-0 text-[17px] font-medium text-black/75">
            {{ applicationDetail.method }}
          </dd>
        </div>
        <div
          v-if="applicationDetail.contactPerson"
          class="grid gap-0.5 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-4"
        >
          <dt class="text-[15px] font-semibold text-black/45">
            {{ S.jobDetailContactPerson }}
          </dt>
          <dd class="m-0 text-[17px] font-medium text-black/75">
            {{ applicationDetail.contactPerson }}
          </dd>
        </div>
        <div v-if="applicationDetail.requiredDocuments.length > 0">
          <dt class="mb-2 text-[15px] font-semibold text-black/45">
            {{ S.jobDetailRequiredDocuments }}
          </dt>
          <dd class="m-0">
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(doc, idx) in applicationDetail.requiredDocuments"
                :key="`doc-${idx}`"
                class="inline-flex rounded-full bg-marketing-soft px-3.5 py-1.5 text-[15px] font-medium text-black/75"
              >
                {{ doc }}
              </span>
            </div>
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Job } from '~/utils/job'
import { S } from '~/utils/strings'
import {
  buildJobApplicationDetail,
  buildJobBenefitLabels,
  buildJobLocationDetail,
  buildJobRequirementsDetail,
  buildJobScheduleItems,
  hasJobRequirementsDetail,
} from '~/utils/job-detail-display'

const props = defineProps<{
  job: Job
}>()

const scheduleItems = computed(() => buildJobScheduleItems(props.job))
const locationDetail = computed(() => buildJobLocationDetail(props.job))
const requirementsDetail = computed(() => buildJobRequirementsDetail(props.job))
const benefitLabels = computed(() => buildJobBenefitLabels(props.job))
const applicationDetail = computed(() => buildJobApplicationDetail(props.job))

const hasRequirements = computed(() =>
  hasJobRequirementsDetail(requirementsDetail.value),
)

const hasApplicationInfo = computed(() => {
  const app = applicationDetail.value
  const methodValue = (props.job.application_method ?? 'platform').trim()
  return (
    methodValue !== 'platform' ||
    Boolean(app.contactPerson) ||
    app.requiredDocuments.length > 0
  )
})
</script>
