<template>
  <p
    class="m-0 text-center text-[13px] font-normal leading-relaxed text-black/45"
  >
    <NuxtLink
      :to="ROUTES.privacy"
      class="font-medium text-marketing-green underline decoration-marketing-green/50 underline-offset-2 outline-none hover:decoration-marketing-green focus-visible:ring-2 focus-visible:ring-marketing-green/40"
    >
      {{ S.footerLinkPrivacy }}
    </NuxtLink>
    <span aria-hidden="true"> · </span>
    <NuxtLink
      :to="ROUTES.terms"
      class="font-medium text-marketing-green underline decoration-marketing-green/50 underline-offset-2 outline-none hover:decoration-marketing-green focus-visible:ring-2 focus-visible:ring-marketing-green/40"
    >
      {{ S.footerLinkTermsShort }}
    </NuxtLink>
  </p>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
</script>
