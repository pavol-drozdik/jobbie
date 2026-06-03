<template>

  <div class="min-h-screen bg-marketing-mint pb-20 font-dmSans">

    <div class="mx-auto box-border w-full max-w-[1400px] px-5">

      <section

        class="relative mb-8 mt-[30px] overflow-hidden rounded-[30px] bg-[linear-gradient(155deg,rgb(21,128,61)_0%,rgb(34,197,94)_100%)] px-6 py-10 sm:px-12 sm:py-14"

      >

        <div class="flex flex-col items-center text-center">

          <h1 class="m-0 max-w-[720px] font-dmSans text-[32px] font-extrabold leading-[1.08] text-white sm:text-[44px]">

            {{ S.pricingPageTitle }}

          </h1>

          <p class="mt-3 max-w-[600px] font-dmSans text-lg font-medium text-white/85 sm:text-xl">

            {{ S.pricingPageSubtitle }}

          </p>

          <div

            v-if="accountCredits !== null"

            class="mt-5 inline-flex items-center rounded-full bg-white/20 px-4 py-2 font-dmSans text-sm font-bold text-white backdrop-blur-sm"

          >

            {{ S.pricingBalanceLabel }}: {{ accountCredits }} {{ S.credits }}

          </div>

          <div class="pricing-hero-tabs mt-6 w-full max-w-[720px]">

            <JaSegmentedToggle

              v-model="activeTab"

              class="!flex !w-full"

              :options="tabOptions"

            />

          </div>

        </div>

      </section>



      <p

        v-if="user && !isEmployer"

        class="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"

      >

        {{ S.pricingEmployerOnlyHint }}

      </p>



      <div v-show="activeTab === 'credits'">

        <PricingCreditPacksGrid

          :return-base-path="returnPath"

          @credits-purchased="loadAccountCredits"

        />

      </div>



      <div v-show="activeTab === 'plans'">

        <PricingPlansGrid :return-base-path="returnPath" />

        <PricingCvCompareTable
          v-if="catalogPlans.length > 0"
          :plans="catalogPlans"
          :plan-tier-credit-costs="planTierCreditCosts"
        />

      </div>



      <div v-show="activeTab === 'addons'">

        <PricingAddonServicesGrid @contact="onAddonContact" />

        <PricingContactSection

          ref="contactSectionRef"

          :selected-service-id="selectedInquiryService"

        />

      </div>

    </div>

  </div>

</template>



<script setup lang="ts">

import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import {
  PRICING_PAGE_SUMMARY,
  PRICING_PAGE_UPDATED_AT,
} from '~/utils/pricing-page-copy'
import { normalizeSiteUrl } from '~/utils/seo-config'
import { buildWebPageJsonLd } from '~/utils/seo-json-ld'

import PricingCreditPacksGrid from '~/components/pricing/PricingCreditPacksGrid.vue'

import PricingPlansGrid from '~/components/pricing/PricingPlansGrid.vue'

import PricingCvCompareTable from '~/components/pricing/PricingCvCompareTable.vue'

import PricingAddonServicesGrid from '~/components/pricing/PricingAddonServicesGrid.vue'

import PricingContactSection from '~/components/pricing/PricingContactSection.vue'

import JaSegmentedToggle from '~/components/ui/JaSegmentedToggle.vue'

import type { PricingAddonServiceId } from '~/utils/pricing-addon-services'
import { parsePlanTierCreditCostsFromConfig } from '~/utils/plan-tier-credit-costs'



definePageMeta({ layout: 'app' })

const config = useRuntimeConfig()

usePageSeo(() => {
  const site = normalizeSiteUrl(String(config.public.siteUrl || ''))
  const jsonLd = site
    ? buildWebPageJsonLd({
        siteUrl: site,
        path: ROUTES.pricing,
        name: S.pricingPageTitle,
        description: PRICING_PAGE_SUMMARY,
        dateModified: PRICING_PAGE_UPDATED_AT,
      })
    : undefined
  return {
    title: S.pricingPageTitle,
    description: S.pricingPageSubtitle,
    canonicalPath: ROUTES.pricing,
    dateModified: PRICING_PAGE_UPDATED_AT,
    jsonLd,
  }
})



const returnPath = '/cennik'

const { user, isEmployer } = usePricingCheckout(returnPath)

const { api } = useApi()

const { session } = useAuth()

const { plans: catalogPlansState, load: loadCatalogPlans } = usePlans()
const { config: billingCatalogConfig, load: loadBillingCatalog } = useCatalogBilling()



type PricingTab = 'credits' | 'plans' | 'addons'



const activeTab = ref<PricingTab>('credits')

const tabOptions = [

  { value: 'credits', label: S.pricingTabCredits },

  { value: 'plans', label: S.pricingTabPlans },

  { value: 'addons', label: S.pricingTabAddons },

]



const route = useRoute()

const contactSectionRef = ref<InstanceType<typeof PricingContactSection> | null>(null)

const selectedInquiryService = ref<PricingAddonServiceId | null>(null)



const accountCredits = ref<number | null>(null)

const catalogPlans = computed(() => catalogPlansState.value ?? [])
const planTierCreditCosts = computed(() =>
  parsePlanTierCreditCostsFromConfig(billingCatalogConfig.value?.planTierCreditCosts),
)



async function loadAccountCredits(): Promise<void> {

  if (!session.value?.access_token) {

    accountCredits.value = null

    return

  }

  const res = await api<{ credits: number }>('/api/billing/account')

  accountCredits.value = res.ok && res.data ? res.data.credits : null

}



function onAddonContact(serviceId: PricingAddonServiceId): void {

  void scrollToPricingContact(serviceId)

}



async function scrollToPricingContact(serviceId?: PricingAddonServiceId): Promise<void> {

  if (serviceId) {

    selectedInquiryService.value = serviceId

  }

  activeTab.value = 'addons'

  await nextTick()

  const el =

    contactSectionRef.value?.sectionEl ??

    document.getElementById('pricing-contact')

  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  await nextTick()

  contactSectionRef.value?.focusFirstField()

}



watch(

  () => session.value?.access_token,

  () => {

    void loadAccountCredits()

  },

  { immediate: true },

)



function applyTabFromQuery(): void {

  const tab = route.query.tab

  if (tab === 'credits' || tab === 'plans' || tab === 'addons') {

    activeTab.value = tab

    return

  }

  const success = route.query.success

  if (success === '1' || success === 'true') {

    activeTab.value = 'plans'

    return

  }

  const pi = route.query.payment_intent

  if (typeof pi === 'string' && pi.startsWith('pi_')) {

    activeTab.value = 'credits'

  }

}



watch(

  () => [route.query.tab, route.query.success, route.query.payment_intent],

  () => {

    applyTabFromQuery()

  },

  { immediate: true },

)



onMounted(() => {
  void loadCatalogPlans()
  void loadBillingCatalog()
})

</script>



<style scoped>

.pricing-hero-tabs :deep([role='radiogroup']) {

  width: 100%;

  border-radius: 999px;

  background: rgba(255, 255, 255, 0.2);

  padding: 4px;

}



.pricing-hero-tabs :deep([role='radio']) {

  flex: 1;

  justify-content: center;

  min-width: 0;

  padding-left: 0.75rem;

  padding-right: 0.75rem;

  font-size: 0.8125rem;

}



@media (min-width: 640px) {

  .pricing-hero-tabs :deep([role='radio']) {

    font-size: 0.875rem;

  }

}



.pricing-hero-tabs :deep([role='radio']:not([aria-checked='true'])) {

  color: rgba(255, 255, 255, 0.9);

}



.pricing-hero-tabs :deep([role='radio']:not([aria-checked='true']):hover) {

  color: #fff;

}



.pricing-hero-tabs :deep([role='radio'][aria-checked='true']) {

  background: #fff;

  color: rgb(21, 128, 61);

}

</style>

