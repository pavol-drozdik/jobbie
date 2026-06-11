<template>
  <div
    class="min-h-[50vh] bg-marketing-mint px-5 pb-20 pt-[calc(5.5rem+env(safe-area-inset-top))] font-dmSans md:pt-28"
  >
    <article class="mx-auto max-w-4xl">
      <header class="mb-8">
        <h1 class="m-0 font-dmSans text-[32px] font-extrabold leading-tight text-black sm:text-[40px]">
          {{ S.footerLinkPrivacy }}
        </h1>
        <p class="mt-4 font-dmSans text-lg font-medium leading-relaxed text-black/70">
          {{ S.privacyPolicyIntro }}
        </p>
        <p class="mt-3 font-dmSans text-sm font-medium text-black/45">
          {{ S.privacyPolicyEffectiveDate }}
        </p>
      </header>

      <div class="mb-6 flex flex-wrap gap-3">
        <a
          :href="GDPR_PRIVACY_POLICY_PDF_URL"
          download
          class="inline-flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-marketing-green bg-white px-5 font-dmSans text-[15px] font-bold text-marketing-green no-underline transition-colors hover:bg-marketing-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green/40"
        >
          {{ S.privacyPolicyDownloadPdf }}
        </a>
        <a
          :href="GDPR_PRIVACY_POLICY_PDF_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-11 items-center justify-center rounded-full border border-transparent bg-transparent px-5 font-dmSans text-[15px] font-semibold text-black/70 no-underline transition-colors hover:bg-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green/40"
        >
          {{ S.privacyPolicyOpenPdf }}
        </a>
      </div>

      <div
        class="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_8px_30px_rgba(14,28,20,0.06)]"
      >
        <iframe
          :src="GDPR_PRIVACY_POLICY_PDF_URL"
          :title="S.footerLinkPrivacy"
          class="block h-[min(80vh,920px)] w-full border-0"
        />
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import {
  GDPR_PRIVACY_POLICY_PDF_URL,
  GDPR_PRIVACY_POLICY_UPDATED_AT,
} from '~/utils/legal-documents'
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'

definePageMeta({ layout: 'app', layoutMainFlushTop: true })

usePageSeo({
  title: S.footerLinkPrivacy,
  description: S.privacyPolicyIntro,
  canonicalPath: ROUTES.privacy,
  dateModified: GDPR_PRIVACY_POLICY_UPDATED_AT,
})
</script>
