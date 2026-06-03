<template>
  <div class="mx-auto box-border w-full max-w-[1100px] px-5 pb-16 pt-4 font-dmSans text-black lg:pb-20 lg:pt-6">
    <NuxtLink
      :to="ROUTES.profile"
      class="mb-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-marketing-green hover:underline"
    >
      <AppIcon name="chevron-left" :size="16" class="opacity-80" />
      {{ S.settingsBackToProfile }}
    </NuxtLink>
    <header class="mb-8">
      <h1 class="m-0 font-dmSans text-[28px] font-extrabold leading-tight sm:text-[32px]">
        {{ S.settingsTitle }}
      </h1>
      <p class="mt-2 max-w-2xl font-dmSans text-base text-black/55">
        {{ S.settingsDashboardDescription }}
      </p>
    </header>
    <p v-if="dashboardDeniedMessage" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      {{ dashboardDeniedMessage }}
    </p>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <SettingsDashboardCard
        to="/nastavenia/profil"
        :title="S.settingsCardProfil"
        :description="S.settingsCardProfilDesc"
        icon="user"
      />
      <SettingsDashboardCard
        :to="user?.role === 'company' ? '/nastavenia/firma' : '/nastavenia'"
        :title="S.settingsCardFirma"
        :description="user?.role === 'company' ? S.settingsCardFirmaDesc : S.settingsCardFirmaDisabled"
        icon="building"
        :disabled="user?.role !== 'company'"
      />
      <SettingsDashboardCard
        to="/nastavenia/notifikacie"
        :title="S.settingsCardNotifikacie"
        :description="S.settingsCardNotifikacieDesc"
        icon="bell"
      />
      <SettingsDashboardCard
        to="/nastavenia/bezpecnost"
        :title="S.settingsCardBezpecnost"
        :description="S.settingsCardBezpecnostDesc"
        icon="settings"
      />
      <SettingsDashboardCard
        to="/nastavenia/zariadenia"
        :title="S.settingsCardZariadenia"
        :description="S.settingsCardZariadeniaDesc"
        icon="id-card"
      />
      <SettingsDashboardCard
        to="/nastavenia/fakturacia"
        :title="S.settingsCardFakturacia"
        :description="S.settingsCardFakturaciaDesc"
        icon="currency"
      />
      <SettingsDashboardCard
        to="/nastavenia/kredity"
        :title="S.settingsCardKredity"
        :description="S.settingsCardKredityDesc"
        icon="currency"
      />
      <SettingsDashboardCard
        to="/nastavenia/export-udajov"
        :title="S.settingsCardExportData"
        :description="S.settingsCardExportDataDesc"
        icon="package"
      />
      <SettingsDashboardCard
        to="/nastavenia/nebezpecna-zona"
        :title="S.settingsCardNebezpecna"
        :description="S.settingsCardNebezpecnaDesc"
        icon="triangle-alert"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const route = useRoute()
const { user } = useAuth()

const dashboardDeniedMessage = computed(() => {
  const d = route.query.dashboardDenied
  if (d === 'customer') return S.dashboardRoleDeniedCustomer
  if (d === 'provider') return S.dashboardRoleDeniedProvider
  if (d === 'worker') return S.dashboardRoleDeniedWorker
  return ''
})

useHead({ title: () => S.settingsTitle })
</script>
