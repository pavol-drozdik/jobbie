<template>
  <SettingsPageShell
    content-layout="stacked"
    :title="S.settingsCardFirma"
    :description="S.settingsCardFirmaDesc"
    :flash="flash"
    :error="error"
  >
    <div class="flex flex-col gap-5">
      <div :class="settingsCardClass">
        <SettingsCompanyForm @saved="onSaved" @error="onError" />
      </div>

      <div
        v-if="user?.role === 'company'"
        :id="SETTINGS_FIRMA_AUTO_REPLIES_SECTION_ID"
        :class="[settingsCardClass, 'scroll-mt-24']"
      >
        <EmployerApplicantAutoMessages />
      </div>
    </div>
  </SettingsPageShell>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import EmployerApplicantAutoMessages from '~/components/applicants/EmployerApplicantAutoMessages.vue'
import { SETTINGS_FIRMA_AUTO_REPLIES_SECTION_ID } from '~/utils/app-routes'
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app', middleware: ['auth'] })

const route = useRoute()
const { user } = useAuth()
const { flash, error } = useSettingsFeedback()
const { settingsCardClass } = useSettingsFormStyles()

function onSaved(): void {
  flash.value = S.settingsFirmaSaved
  error.value = null
}

function onError(message: string): void {
  error.value = message
  flash.value = null
}

function scrollToAutoRepliesSection(): void {
  if (route.hash !== `#${SETTINGS_FIRMA_AUTO_REPLIES_SECTION_ID}`) return
  const scroll = (): void => {
    document.getElementById(SETTINGS_FIRMA_AUTO_REPLIES_SECTION_ID)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
  void nextTick(() => {
    scroll()
    window.setTimeout(scroll, 400)
  })
}

onMounted(() => {
  if (user.value && user.value.role !== 'company') {
    void navigateTo('/nastavenia')
    return
  }
  scrollToAutoRepliesSection()
})

watch(
  () => route.hash,
  () => scrollToAutoRepliesSection(),
)

useHead({ title: () => S.settingsCardFirma })
</script>
