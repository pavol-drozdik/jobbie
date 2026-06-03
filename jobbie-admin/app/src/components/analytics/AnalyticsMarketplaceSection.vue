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
  <section class="section-card">
    <h2 class="section-title">Trhovisko</h2>
    <p v-if="!summary.marketplace" class="muted">
      Marketplace metriky nie sú k dispozícii — aplikujte rozšírenú migráciu analytiky.
    </p>
    <div v-else class="kpi-grid kpi-grid--compact">
      <div v-for="item in items" :key="item.label" class="kpi-card kpi-card--compact">
        <span class="kpi-label">{{ item.label }}</span>
        <span class="kpi-value">{{ fmtNum(item.value) }}</span>
      </div>
    </div>
  </section>
</template>
