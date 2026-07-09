<template>
  <SettingsPageShell
    content-layout="stacked"
    :title="S.settingsCardFakturacia"
    :description="S.settingsCardFakturaciaDesc"
    :flash="flash"
    :error="error"
  >
    <SettingsBillingPanel @saved="onSaved" />
  </SettingsPageShell>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app', middleware: ['auth', 'billing-access'] })

const { flash, error } = useSettingsFeedback()

function onSaved(): void {
  flash.value = S.settingsBillingSaved
  error.value = null
}

useHead({ title: () => S.settingsCardFakturacia })
</script>
