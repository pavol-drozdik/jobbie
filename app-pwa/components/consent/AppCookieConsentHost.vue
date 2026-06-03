<template>
  <AppCookieBanner
    :open="showBanner && !isCookiePreferencesOpen"
    @accept-all="acceptAll()"
    @reject-all="rejectAll()"
    @open-preferences="openPreferences()"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cookiePreferencesOpen } from '~/utils/cookie-consent-ui'

const isCookiePreferencesOpen = computed(() => cookiePreferencesOpen.value)

const { showBanner, acceptAll, rejectAll, openPreferences } = useCookieConsentStore()
</script>
