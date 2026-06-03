<template>
  <SettingsPageShell
    :title="S.settingsCardNotifikacie"
    :description="S.settingsCardNotifikacieDesc"
    :flash="flash"
    :error="error"
  >
    <SettingsNotificationsForm @saved="onSaved" />
  </SettingsPageShell>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const { flash, error } = useSettingsFeedback()

function onSaved(): void {
  flash.value = S.settingsNotifikacieSaved
  error.value = null
}

useHead({ title: () => S.settingsCardNotifikacie })
</script>
