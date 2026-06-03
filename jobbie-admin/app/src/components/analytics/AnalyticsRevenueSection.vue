<script setup lang="ts">
import type { AdminAnalyticsSummary } from '../../types/analytics'
import { fmtMoneyCents, fmtNum } from '../../utils/analytics-format'

defineProps<{ summary: AdminAnalyticsSummary }>()
</script>

<template>
  <section class="section-card">
    <h2 class="section-title">Tržby a predplatné</h2>
    <div class="analytics-grid-3">
      <div v-if="summary.revenue" class="detail-block">
        <h3 class="detail-block-title">Aktuálny MRR</h3>
        <ul class="detail-list">
          <li><span>MRR</span><strong>{{ fmtMoneyCents(summary.revenue.mrr_cents) }}</strong></li>
          <li><span>ARR</span><strong>{{ fmtMoneyCents(summary.revenue.arr_cents) }}</strong></li>
          <li>
            <span>Platiaci</span><strong>{{ fmtNum(summary.revenue.active_paying_subscribers) }}</strong>
          </li>
          <li><span>ARPU</span><strong>{{ fmtMoneyCents(summary.revenue.arpu_cents) }}</strong></li>
        </ul>
      </div>
      <div v-if="summary.revenue_period" class="detail-block">
        <h3 class="detail-block-title">Obdobie</h3>
        <ul class="detail-list">
          <li>
            <span>Balíčky kreditov</span
            ><strong>{{ fmtNum(summary.revenue_period.credit_pack_purchases_count) }}</strong>
          </li>
          <li>
            <span>Kredity predané</span
            ><strong>{{ fmtNum(summary.revenue_period.credit_pack_credits_sold) }}</strong>
          </li>
          <li>
            <span>Nové predplatné</span
            ><strong>{{ fmtNum(summary.revenue_period.new_subscriptions_in_period) }}</strong>
          </li>
          <li>
            <span>Zrušené</span
            ><strong>{{ fmtNum(summary.revenue_period.subscription_canceled_in_period) }}</strong>
          </li>
        </ul>
      </div>
      <div v-if="summary.churn" class="detail-block">
        <h3 class="detail-block-title">Churn</h3>
        <p class="kpi-value" style="font-size: 1.5rem">
          {{ fmtNum(summary.churn.canceled_subscriptions_in_period) }}
        </p>
        <p class="muted">zrušených predplatných v období</p>
      </div>
    </div>
    <p v-if="!summary.revenue && !summary.revenue_period" class="muted">Žiadne dáta o tržbách.</p>
  </section>
</template>
