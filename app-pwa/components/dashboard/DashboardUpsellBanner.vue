<template>
  <div
    v-if="showUpsell"
    class="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl bg-marketing-surface px-[22px] py-[18px]"
  >
    <span class="font-dmSans text-[17px] font-semibold text-black/55">{{ S.dashboardUpgradeHint }}</span>
    <AppButton
      variant="outline"
      size="sm"
      :to="{ path: ROUTES.pricing, query: { tab: 'plans' } }"
      class="min-h-[42px] h-[42px] shrink-0 px-[18px] text-[15px] hover:bg-marketing-green hover:text-white"
    >
      {{ S.dashboardUpgradeCta }}
    </AppButton>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'

const { hasPaidPlanAccess, loaded, load } = useBillingAccount()

onMounted(() => {
  void load()
})

const showUpsell = computed(() => loaded.value && !hasPaidPlanAccess.value)
</script>
