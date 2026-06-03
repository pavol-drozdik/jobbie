<template>
  <SettingsPageShell
    content-layout="stacked"
    :title="S.settingsCardProfil"
    :description="S.settingsCardProfilDesc"
    :flash="flash"
    :error="error"
  >
    <ProfileSettingsForm :show-footer-links="false" @saved="onSaved" />
  </SettingsPageShell>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const { flash, error } = useSettingsFeedback()

function onSaved(): void {
  flash.value = S.settingsProfilSaved
  error.value = null
}

useHead({ title: () => S.settingsCardProfil })
</script>
