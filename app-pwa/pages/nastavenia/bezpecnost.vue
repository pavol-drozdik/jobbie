<template>
  <SettingsPageShell
    :title="S.settingsCardBezpecnost"
    :description="S.settingsCardBezpecnostDesc"
    :flash="flash"
    :error="error"
  >
    <SettingsSecurityPanel />
  </SettingsPageShell>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const { flash, error } = useSettingsFeedback()

useHead({ title: () => S.settingsCardBezpecnost })
</script>
