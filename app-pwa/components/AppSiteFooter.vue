<template>
  <footer
    class="relative mt-12 w-full bg-marketing-mint bg-[radial-gradient(ellipse_at_0%_100%,rgba(34,197,94,0.08),transparent_55%)] pb-[max(6rem,calc(4rem+env(safe-area-inset-bottom,0px)))] pt-14 font-dmSans marketing:mt-16 marketing:pb-10 marketing:pt-16"
  >
    <div class="mx-auto w-full max-w-[1320px] px-5 marketing:px-12">
      <div
        class="grid grid-cols-1 gap-10 sm:grid-cols-2 marketing:grid-cols-[1.05fr_0.95fr_1fr_1.6fr] marketing:gap-x-12 marketing:gap-y-10"
      >
        <div class="flex min-w-0 flex-col gap-5 sm:col-span-2 marketing:col-span-1">
          <AppBrandLogo
            :link-to="ROUTES.home"
            variant="full"
            root-class="w-fit"
            image-class="h-9 w-auto max-w-[11rem]"
          />
          <p class="m-0 max-w-[280px] font-dmSans text-[15px] font-normal leading-relaxed text-marketing-abMuted">
            {{ S.footerSlogan }}
          </p>
          <div class="flex flex-wrap gap-2.5">
            <a
              :href="footerInstagramUrl"
              class="inline-flex size-10 items-center justify-center rounded-xl bg-marketing-abChipBg text-marketing-abGreen no-underline transition-colors hover:bg-marketing-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green/40"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="S.footerSocialInstagram"
            >
              <svg class="size-5" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="currentColor"
                  d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"
                />
              </svg>
            </a>
            <a
              :href="footerFacebookUrl"
              class="inline-flex size-10 items-center justify-center rounded-xl bg-marketing-abChipBg text-marketing-abGreen no-underline transition-colors hover:bg-marketing-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green/40"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="S.footerSocialFacebook"
            >
              <svg class="size-5" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="currentColor"
                  d="M12 2.04c-5.5 0-10 4.46-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.56-4.5-10.02-10-10.02z"
                />
              </svg>
            </a>
          </div>
          <button
            type="button"
            class="flex w-fit is-clickable items-center gap-2 border-none bg-transparent p-0 font-dmSans text-[14.5px] font-medium text-marketing-abMuted transition-colors hover:text-marketing-abGreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green/40"
            @click="openFooterCookieSettings"
          >
            <AppIcon name="shield-check" :size="18" class="shrink-0 text-marketing-abGreen" />
            {{ S.footerCookieSettings }}
          </button>
        </div>

        <nav
          class="flex min-w-0 flex-col gap-[18px]"
          :aria-label="S.footerQuickMenuHeading"
        >
          <h3 :class="footerHeadingClass">
            {{ S.footerQuickMenuHeading }}
          </h3>
          <ul class="m-0 flex list-none flex-col gap-2.5 p-0">
            <li v-for="(item, index) in footerQuickMenuItems" :key="index">
              <NuxtLink :to="item.to" :class="footerLinkClass">
                {{ item.label }}
              </NuxtLink>
            </li>
          </ul>
          <a
            :href="footerMailto"
            class="mt-1 inline-flex w-fit items-center gap-2 font-dmSans text-[15px] font-semibold text-marketing-abGreen no-underline transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green/40"
          >
            <AppIcon name="mail" :size="18" class="shrink-0" />
            <span class="break-all">{{ brand.supportEmail }}</span>
          </a>
        </nav>

        <nav
          class="flex min-w-0 flex-col gap-[18px]"
          :aria-label="S.footerGuides"
        >
          <h3 :class="footerHeadingClass">
            {{ S.footerGuides }}
          </h3>
          <ul class="m-0 flex list-none flex-col gap-2.5 p-0">
            <li v-for="item in footerGuideItems" :key="item.slug">
              <NuxtLink :to="ROUTES.blogPost(item.slug)" :class="footerLinkClass">
                {{ item.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>

        <div class="flex min-w-0 flex-col sm:col-span-2 marketing:col-span-1">
          <div
            class="flex flex-col gap-4 rounded-2xl border border-marketing-abGreen/15 bg-marketing-abChipBg p-5 sm:p-6"
          >
            <div class="flex items-start gap-3">
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-full bg-marketing-abGreen text-white"
                aria-hidden="true"
              >
                <AppIcon name="bell" :size="20" />
              </span>
              <h3 class="m-0 min-w-0 flex-1 font-dmSans text-[17px] font-extrabold leading-snug text-marketing-abInk">
                {{ S.footerNewsletterTitle }}
              </h3>
            </div>
            <form
              class="flex max-w-full flex-col gap-2.5"
              @submit.prevent="handleNewsletterSubmit"
            >
              <input
                v-model="newsletterName"
                type="text"
                name="name"
                autocomplete="name"
                :placeholder="S.footerNewsletterPlaceholderName"
                :aria-label="`${S.firstName}, voliteľné`"
                :class="newsletterInputClass"
              >
              <input
                v-model="newsletterEmail"
                type="email"
                name="email"
                autocomplete="email"
                required
                :placeholder="S.footerNewsletterPlaceholderEmail"
                :aria-label="`${S.email}, ${S.required}`"
                :class="newsletterInputClass"
              >
              <button
                type="submit"
                :disabled="newsletterPhase === 'loading'"
                class="h-12 min-h-[48px] w-full is-clickable rounded-xl border-none bg-marketing-abGreen font-dmSans text-[16px] font-bold text-white transition-opacity hover:opacity-90 disabled:is-disabled-cursor disabled:opacity-60"
              >
                {{ newsletterPhase === 'loading' ? S.newsletterSubscribeSubmitting : S.footerNewsletterSubmit }}
              </button>
              <label class="flex is-clickable items-start gap-2.5 pt-1 font-dmSans">
                <AppCheckbox
                  v-model="newsletterConsent"
                  variant="default"
                  class="mt-0.5"
                  required
                />
                <span class="text-left text-[13px] font-normal leading-[1.5] text-marketing-abMuted">
                  {{ S.footerNewsletterConsentIntro }}
                  <NuxtLink
                    :to="ROUTES.privacy"
                    class="font-normal text-marketing-abGreen underline decoration-marketing-abGreen/60 underline-offset-2 outline-none hover:decoration-marketing-abGreen focus-visible:ring-2 focus-visible:ring-marketing-green/40 focus-visible:ring-offset-2"
                  >{{ S.footerPrivacyPolicyLinkText }}</NuxtLink>{{ S.footerNewsletterConsentOutro }}
                </span>
              </label>
              <p
                v-if="newsletterPhase === 'error'"
                class="m-0 font-dmSans text-[15px] font-semibold text-red-600"
                role="alert"
              >
                {{ S.newsletterSubscribeError }}
              </p>
            </form>
          </div>
        </div>
      </div>

      <div
        class="mt-12 flex flex-col items-start gap-4 border-t border-black/8 pt-5 marketing:flex-row marketing:items-center marketing:justify-between marketing:gap-5"
      >
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p class="m-0 font-dmSans text-[14.5px] font-normal text-marketing-abBottom">
            © {{ copyrightYear }} Jobbie. {{ S.footerCopyrightRights }}
          </p>
          <p class="m-0 inline-flex items-center gap-1.5 font-dmSans text-[14.5px] font-normal text-marketing-abBottom">
            {{ S.footerMadeBy }}
            <a
              :href="COCREATE_WEBSITE_URL"
              class="inline-flex items-center opacity-70 no-underline transition-opacity duration-200 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green/40 focus-visible:ring-offset-2"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="CoCreate"
            >
              <img
                :src="COCREATE_LOGO_PATH"
                alt="CoCreate"
                width="96"
                height="20"
                class="h-[18px] w-auto brightness-0"
                loading="lazy"
                decoding="async"
              >
            </a>
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
          <NuxtLink
            :to="ROUTES.privacy"
            class="font-dmSans text-[14.5px] font-normal text-marketing-abBottom no-underline transition-colors hover:text-marketing-abGreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green/40"
          >
            {{ S.footerLinkPrivacyShort }}
          </NuxtLink>
          <NuxtLink
            :to="ROUTES.terms"
            class="font-dmSans text-[14.5px] font-normal text-marketing-abBottom no-underline transition-colors hover:text-marketing-abGreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green/40"
          >
            {{ S.footerLinkTermsShort }}
          </NuxtLink>
          <NuxtLink
            :to="ROUTES.contractWithdrawal"
            class="font-dmSans text-[14.5px] font-normal text-marketing-abBottom no-underline transition-colors hover:text-marketing-abGreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green/40"
          >
            {{ S.footerLinkContractWithdrawal }}
          </NuxtLink>
          <NuxtLink
            :to="ROUTES.pricing"
            class="font-dmSans text-[14.5px] font-normal text-marketing-abBottom no-underline transition-colors hover:text-marketing-abGreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green/40"
          >
            {{ S.footerPricing }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ROUTES } from '~/utils/app-routes'
import { COCREATE_LOGO_PATH, COCREATE_WEBSITE_URL } from '~/utils/brand-assets'
import { openCookiePreferences as showCookiePreferencesModal } from '~/utils/cookie-consent-ui'
import { S } from '~/utils/strings'
import { useBrandSeoConfig } from '~/utils/brand-seo'

const footerHeadingClass =
  'm-0 font-dmSans text-[12.5px] font-bold leading-none text-marketing-abGreen'

const footerLinkClass =
  'font-dmSans text-[15px] font-medium leading-normal text-marketing-abLink no-underline transition-colors hover:text-marketing-abGreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green/40'

const newsletterInputClass =
  'h-11 min-h-[44px] w-full min-w-0 rounded-xl border border-black/10 bg-white px-4 font-dmSans text-[15px] font-normal text-marketing-abInk outline-none placeholder:font-dmSans placeholder:font-normal placeholder:text-black/30 focus-visible:border-marketing-abGreen focus-visible:ring-2 focus-visible:ring-marketing-green/20'

const brand = useBrandSeoConfig()
const footerMailto = computed(() => `mailto:${brand.supportEmail}`)
const footerInstagramUrl = computed(
  () => brand.socialInstagramUrl ?? S.footerSocialInstagramUrl,
)
const footerFacebookUrl = computed(
  () => brand.socialFacebookUrl ?? S.footerSocialFacebookUrl,
)
const copyrightYear = new Date().getFullYear()

const footerQuickMenuItems = [
  { to: ROUTES.find, label: S.footerQuickFindWork },
  { to: ROUTES.jobHub, label: S.footerQuickAddListing },
  { to: ROUTES.find, label: S.footerQuickForJobseekers },
  { to: ROUTES.jobHub, label: S.footerQuickForEmployers },
  { to: ROUTES.pricing, label: S.footerPricing },
  { to: ROUTES.authRegister, label: S.register },
] as const

function openFooterCookieSettings(): void {
  showCookiePreferencesModal('footer')
}

const { phase: newsletterPhase, submit: submitNewsletter, resetPhase: resetNewsletterPhase } =
  useNewsletterSubscribe()

const footerGuideItems = [
  { slug: 'ako-topovat-sluzbu', label: S.footerGuideTopService },
  { slug: 'ako-propagovat-sluzbu', label: S.footerGuidePromoteService },
  { slug: 'ako-vytvorit-pracovnu-ponuku', label: S.footerGuideCreateJob },
  { slug: 'ako-topovat-pracovnu-ponuku', label: S.footerGuideTopJob },
  { slug: 'ako-sa-registrovat-na-jobbie', label: S.footerGuideRegisterJobbie },
] as const

const newsletterName = ref<string>('')
const newsletterEmail = ref<string>('')
const newsletterConsent = ref<boolean>(false)

watch(newsletterEmail, () => {
  if (newsletterPhase.value === 'error') {
    resetNewsletterPhase()
  }
})

async function handleNewsletterSubmit(): Promise<void> {
  if (!newsletterConsent.value) {
    return
  }
  const ok = await submitNewsletter({
    email: newsletterEmail.value,
    name: newsletterName.value,
    consent: true,
  })
  if (ok) {
    newsletterName.value = ''
    newsletterEmail.value = ''
    newsletterConsent.value = false
  }
}
</script>
