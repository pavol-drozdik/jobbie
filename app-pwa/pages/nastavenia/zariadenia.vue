<template>
  <SettingsPageShell
    :title="S.settingsCardZariadenia"
    :description="S.settingsCardZariadeniaDesc"
    :flash="flash"
    :error="error"
  >
    <SettingsDevicesPanel />
  </SettingsPageShell>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const { flash, error } = useSettingsFeedback()

useHead({ title: () => S.settingsCardZariadenia })
</script>
