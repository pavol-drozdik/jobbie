<script setup lang="ts">
import { computed } from 'vue'
import type { AdminAnalyticsSummary } from '../../types/analytics'
import { fmtNum } from '../../utils/analytics-format'

const props = defineProps<{ summary: AdminAnalyticsSummary }>()

const items = computed(() => {
  const m = props.summary.marketplace
  if (!m) return []
  return [
    { label: 'Nové ponuky (obdobie)', value: m.jobs_published_in_period },
    { label: 'Aktívne ponuky', value: m.active_jobs_now },
    { label: 'Reklamy firiem (obdobie)', value: m.company_ads_published_in_period },
    { label: 'Aktívne reklamy', value: m.active_company_ads_now },
    { label: 'CV v databáze', value: m.cvs_visible_to_employers_now },
    { label: 'Blog články (obdobie)', value: m.blog_posts_published_in_period },
    { label: 'Blog publikované', value: m.blog_posts_published_now },
    { label: 'Správy v chate', value: m.chat_messages_in_period },
    { label: 'Otvorené reporty', value: m.content_reports_open_now },
    { label: 'Nové reporty', value: m.content_reports_opened_in_period },
  ]
})
</script>

<template>
  <section class="admin-section-card">
    <h2 class="admin-section-title">Trhovisko</h2>
    <p v-if="!summary.marketplace" class="m-0 text-sm text-slate-500">
      Marketplace metriky nie sú k dispozícii — aplikujte rozšírenú migráciu analytiky.
    </p>
    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div v-for="item in items" :key="item.label" class="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ item.label }}</span>
        <span class="text-xl font-bold tabular-nums text-slate-900">{{ fmtNum(item.value) }}</span>
      </div>
    </div>
  </section>
</template>
