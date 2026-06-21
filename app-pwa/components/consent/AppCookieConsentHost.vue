<template>
  <AppCookieBanner
    :open="showBanner && !isCookiePreferencesOpen"
    @accept-all="onBannerAcceptAll"
    @reject-all="onBannerRejectAll"
    @open-preferences="onOpenPreferences"
  />
  <AppCookiePreferences
    :open="isCookiePreferencesOpen"
    :categories="categories"
    @close="onClosePreferences"
    @save="onSavePreferences"
    @reject-all="onRejectAll"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CookieConsentCategories } from '~/utils/cookie-consent-state'
import { cookiePreferencesOpen } from '~/utils/cookie-consent-ui'
import { S } from '~/utils/strings'

const isCookiePreferencesOpen = computed(() => cookiePreferencesOpen.value)

const {
  showBanner,
  categories,
  acceptAll,
  rejectAll,
  savePreferences,
  isDirtyDraft,
  openPreferences,
  closePreferences,
} = useCookieConsentStore()

const { confirm } = useConfirm()

function onBannerAcceptAll(): void {
  acceptAll('banner')
}

function onBannerRejectAll(): void {
  rejectAll('banner')
}

function onOpenPreferences(): void {
  openPreferences('preferences')
}

async function onClosePreferences(draft: CookieConsentCategories): Promise<void> {
  if (!isDirtyDraft(draft)) {
    closePreferences()
    return
  }
  const save = await confirm({
    title: S.cookiePreferencesUnsavedTitle,
    message: S.cookiePreferencesUnsavedMessage,
    confirmText: S.cookiePreferencesUnsavedConfirm,
    cancelText: S.cookiePreferencesUnsavedDiscard,
  })
  if (save) {
    savePreferences(draft, 'preferences')
    return
  }
  closePreferences()
}

function onSavePreferences(draft: CookieConsentCategories): void {
  savePreferences(draft, 'preferences')
}

function onRejectAll(): void {
  rejectAll('preferences')
}
</script>
