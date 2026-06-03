<template>
  <section class="w-full">
    <template v-if="loading">
      <div class="flex flex-col gap-4">
        <div
          v-for="i in 5"
          :key="`sk-${i}`"
          class="animate-pulse rounded-[20px] border border-black/[0.06] bg-white p-5 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)]"
        >
          <div class="h-6 w-3/5 rounded bg-black/10" />
          <div class="mt-3 h-4 w-2/5 rounded bg-black/10" />
          <div class="mt-4 flex gap-2">
            <div class="h-8 w-20 rounded-full bg-black/10" />
            <div class="h-8 w-20 rounded-full bg-black/10" />
          </div>
          <div class="mt-5 flex gap-3">
            <div class="h-[3.25rem] flex-1 rounded-full bg-black/10 marketing:h-10" />
            <div class="h-[3.25rem] flex-1 rounded-full bg-black/10 marketing:h-10" />
          </div>
        </div>
      </div>
    </template>

    <div
      v-else-if="jobs.length === 0"
      class="rounded-[20px] border border-black/[0.06] bg-white px-6 py-12 text-center shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)]"
    >
      <h2 class="m-0 text-lg font-bold text-black">{{ emptyTitle }}</h2>
      <p v-if="emptyDescription" class="mt-2 text-marketing-muted">{{ emptyDescription }}</p>
      <slot name="empty-cta" />
    </div>

    <div v-else class="flex flex-col gap-4">
      <article
        v-for="job in jobs"
        :key="job.id"
        class="flex flex-col gap-4 rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)] marketing:p-5"
      >
        <div class="flex min-w-0 flex-1 items-stretch gap-3">
          <div
            class="w-1 shrink-0 self-stretch min-h-[2.75rem] rounded-full bg-marketing-green"
            aria-hidden="true"
          />
          <div class="min-w-0 flex-1">
            <h2 class="m-0 text-[18px] font-extrabold leading-snug text-black marketing:text-xl">
              {{ job.title }}
            </h2>
            <p class="m-0 mt-1.5 text-[13px] leading-snug text-black/50 marketing:text-sm">
              {{ listingMetaLine(job) }}
            </p>
            <div
              class="mt-3 flex items-start gap-2 font-dmSans text-[13px] text-black/65 marketing:text-sm"
            >
              <AppIcon name="calendar" :size="16" class="mt-0.5 shrink-0 text-black/40" />
              <span>
                <span class="font-semibold text-black/80">{{ S.applicantsColLastApplication }}:</span>
                {{ lastApplicationDisplay(job) }}
              </span>
            </div>
            <dl
              class="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 rounded-xl bg-marketing-soft/60 p-3 min-[520px]:grid-cols-3 marketing:grid-cols-6"
            >
              <div
                v-for="stat in statusStats(job)"
                :key="stat.key"
                class="min-w-0 text-center"
              >
                <dt class="m-0 truncate font-dmSans text-[11px] font-bold uppercase tracking-[0.04em] text-black/40 marketing:text-[12px]">
                  {{ stat.label }}
                </dt>
                <dd
                  class="m-0 mt-0.5 font-dmSans text-lg font-extrabold tabular-nums leading-none"
                  :class="stat.valueClass"
                >
                  {{ stat.count }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <NuxtLink
            :to="ROUTES.applicantsJob(job.id)"
            class="inline-flex flex-1 items-center justify-center rounded-full bg-marketing-green px-6 py-4 text-center text-[15px] font-bold leading-snug text-white no-underline hover:opacity-95 marketing:px-5 marketing:py-0 marketing:h-11 marketing:text-[14px] sm:flex-initial sm:min-w-[12rem]"
          >
            {{ S.applicantsViewApplicants }}
          </NuxtLink>
          <NuxtLink
            :to="ROUTES.jobDetail(job.id)"
            class="inline-flex flex-1 items-center justify-center rounded-full border border-black/12 bg-white px-6 py-4 text-center text-[15px] font-semibold leading-snug text-black/80 no-underline hover:bg-neutral-50 marketing:px-5 marketing:py-0 marketing:h-11 marketing:text-[14px] sm:flex-initial sm:min-w-[12rem]"
          >
            {{ S.applicantsViewJob }}
          </NuxtLink>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { JOB_LISTING_STATUS_LABELS } from '~/utils/job-listing-status'
import type { ApplicantStatusCounts, EmployerJobHubItem } from '~/types/employer-applicants'

type StatusStatKey = keyof ApplicantStatusCounts

type StatusStatRow = {
  key: StatusStatKey
  label: string
  count: number
  valueClass: string
}

defineProps<{
  jobs: EmployerJobHubItem[]
  loading: boolean
  emptyTitle: string
  emptyDescription: string
}>()

function listingLabel(job: EmployerJobHubItem): string {
  const key = job.listing_status as keyof typeof JOB_LISTING_STATUS_LABELS
  return JOB_LISTING_STATUS_LABELS[key] ?? job.listing_status
}

function formatApplicationDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function lastApplicationRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'pred menej ako hodinou'
  if (h < 24) return `pred ${h} hodinami`
  const d = Math.floor(h / 24)
  return `pred ${d} dňami`
}

function lastApplicationDisplay(job: EmployerJobHubItem): string {
  if (!job.last_application_at) return '—'
  const absolute = formatApplicationDate(job.last_application_at)
  const relative = lastApplicationRelative(job.last_application_at)
  return `${absolute} (${relative})`
}

function listingMetaLine(job: EmployerJobHubItem): string {
  const parts = [listingLabel(job)]
  if (job.location?.trim()) {
    parts.push(job.location.trim())
  }
  return parts.join(' · ')
}

function statusStats(job: EmployerJobHubItem): StatusStatRow[] {
  const c = job.status_counts
  return [
    { key: 'total', label: S.applicantsColTotal, count: c.total, valueClass: 'text-black' },
    {
      key: 'pending',
      label: S.applicantsColNew,
      count: c.pending,
      valueClass: c.pending > 0 || job.has_new_applications ? 'text-amber-700' : 'text-black/45',
    },
    {
      key: 'reviewing',
      label: S.applicantsColReviewing,
      count: c.reviewing,
      valueClass: c.reviewing > 0 ? 'text-amber-800' : 'text-black/45',
    },
    {
      key: 'interview_invited',
      label: S.applicantsColInterview,
      count: c.interview_invited,
      valueClass: c.interview_invited > 0 ? 'text-marketing-green' : 'text-black/45',
    },
    {
      key: 'accepted',
      label: S.applicantsColAccepted,
      count: c.accepted,
      valueClass: c.accepted > 0 ? 'text-emerald-700' : 'text-black/45',
    },
    {
      key: 'rejected',
      label: S.applicantsColRejected,
      count: c.rejected,
      valueClass: c.rejected > 0 ? 'text-red-700' : 'text-black/45',
    },
  ]
}
</script>
