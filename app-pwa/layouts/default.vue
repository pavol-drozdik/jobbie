<template>
  <div class="flex min-h-screen min-w-0 flex-col">
    <div class="min-w-0 flex-1">
      <slot />
    </div>
    <div
      class="border-t border-black/10 py-4 text-center text-sm text-black/70"
    >
      <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <NuxtLink
          :to="ROUTES.privacy"
          class="font-semibold text-black/80 underline decoration-black/35 underline-offset-2 outline-none hover:text-black hover:decoration-black/60 focus-visible:ring-2 focus-visible:ring-marketing-green focus-visible:ring-offset-2"
        >
          {{ S.footerLinkPrivacy }}
        </NuxtLink>
        <NuxtLink
          :to="ROUTES.terms"
          class="font-semibold text-black/80 underline decoration-black/35 underline-offset-2 outline-none hover:text-black hover:decoration-black/60 focus-visible:ring-2 focus-visible:ring-marketing-green focus-visible:ring-offset-2"
        >
          {{ S.footerLinkTermsShort }}
        </NuxtLink>
        <button
          type="button"
          class="is-clickable border-none bg-transparent font-semibold text-black/80 underline decoration-black/35 underline-offset-2 outline-none hover:text-black hover:decoration-black/60 focus-visible:ring-2 focus-visible:ring-marketing-green focus-visible:ring-offset-2"
          @click="showCookiePreferencesModal('footer')"
        >
          {{ S.footerCookieSettings }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { openCookiePreferences as showCookiePreferencesModal } from '~/utils/cookie-consent-ui'
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
</script>
