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

const route = useRoute()
const { flash, error } = useSettingsFeedback()

useHead({ title: () => S.settingsCardBezpecnost })

onMounted(async () => {
  if (route.query.email_changed !== '1') {
    return
  }
  flash.value = S.settingsEmailChangeConfirmed
  await navigateTo({ path: route.path }, { replace: true })
})
</script>
