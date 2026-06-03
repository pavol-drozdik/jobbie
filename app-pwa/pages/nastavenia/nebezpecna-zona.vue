<template>
  <SettingsPageShell
    :title="S.settingsCardNebezpecna"
    :description="S.settingsCardNebezpecnaDesc"
    :flash="flash"
    :error="error"
  >
    <SettingsDangerZone />
  </SettingsPageShell>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const { flash, error } = useSettingsFeedback()

useHead({ title: () => S.settingsCardNebezpecna })
</script>
