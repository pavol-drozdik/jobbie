<script setup lang="ts">
import type { AdminAnalyticsSummary } from '../../types/analytics'
import { fmtNum } from '../../utils/analytics-format'

defineProps<{ summary: AdminAnalyticsSummary }>()
</script>

<template>
  <section class="section-card">
    <h2 class="section-title">Používatelia</h2>
    <p v-if="!summary.users_breakdown" class="muted">Rozpad používateľov nie je k dispozícii.</p>
    <div v-else class="analytics-grid-3">
      <div class="detail-block">
        <h3 class="detail-block-title">Registrácie v období</h3>
        <ul class="detail-list">
          <li>
            <span>Firmy</span><strong>{{ fmtNum(summary.users_breakdown.signups_company) }}</strong>
          </li>
          <li>
            <span>Jednotlivci</span
            ><strong>{{ fmtNum(summary.users_breakdown.signups_individual) }}</strong>
          </li>
        </ul>
      </div>
      <div class="detail-block">
        <h3 class="detail-block-title">Aktivita</h3>
        <p class="kpi-value" style="font-size: 1.35rem">
          {{ fmtNum(summary.users_breakdown.active_users_distinct) }}
        </p>
        <p class="muted">unikátnych užívateľov v API logoch (vzorkované)</p>
      </div>
      <div class="detail-block">
        <h3 class="detail-block-title">Účty</h3>
        <ul class="detail-list">
          <li>
            <span>Pozastavené</span
            ><strong>{{ fmtNum(summary.users_breakdown.suspended_accounts_now) }}</strong>
          </li>
          <li>
            <span>Zatvorené</span><strong>{{ fmtNum(summary.users_breakdown.closed_accounts_now) }}</strong>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
