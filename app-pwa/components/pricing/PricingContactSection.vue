<template>
  <section
    id="pricing-contact"
    ref="sectionEl"
    class="scroll-mt-28"
    aria-labelledby="pricing-contact-heading"
  >
    <div
      class="flex flex-col overflow-hidden rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.13)] min-[900px]:min-h-[520px] min-[900px]:flex-row"
    >
      <aside
        class="pricing-contact-panel relative flex flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,#15803d_0%,#22c55e_100%)] px-6 py-8 text-white min-[900px]:w-[40%] min-[900px]:px-10 min-[900px]:py-10"
      >
        <div class="relative z-[1]">
          <h2
            id="pricing-contact-heading"
            class="m-0 font-dmSans text-[26px] font-extrabold leading-tight text-white sm:text-[32px]"
          >
            {{ S.pricingContactTitle }}
          </h2>
          <p class="mt-3 font-dmSans text-[15px] font-medium leading-relaxed text-white/80 sm:text-base">
            {{ S.pricingContactSubtitle }}
          </p>
          <p class="mt-8 font-dmSans text-[13px] font-bold uppercase tracking-wide text-white/70">
            {{ S.pricingContactDirectTitle }}
          </p>
          <ul class="m-0 mt-4 flex list-none flex-col gap-3 p-0">
            <li>
              <a
                :href="salesMailto"
                class="group inline-flex items-center gap-3 font-dmSans text-[15px] font-semibold text-white no-underline transition-opacity hover:opacity-90 sm:text-base"
              >
                <span
                  class="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15"
                  aria-hidden="true"
                >
                  <AppIcon name="send" :size="18" class="text-white" />
                </span>
                <span class="min-w-0 break-all">
                  <span class="block text-[12px] font-semibold uppercase tracking-wide text-white/65">
                    {{ S.pricingContactEmailLabel }}
                  </span>
                  {{ S.pricingSalesEmail }}
                </span>
              </a>
            </li>
            <li>
              <a
                :href="salesTelHref"
                class="group inline-flex items-center gap-3 font-dmSans text-[15px] font-semibold text-white no-underline transition-opacity hover:opacity-90 sm:text-base"
              >
                <span
                  class="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15"
                  aria-hidden="true"
                >
                  <AppIcon name="smartphone" :size="18" class="text-white" />
                </span>
                <span>
                  <span class="block text-[12px] font-semibold uppercase tracking-wide text-white/65">
                    {{ S.pricingContactPhoneLabel }}
                  </span>
                  {{ S.pricingSalesPhone }}
                </span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      <div class="flex flex-1 flex-col bg-white px-6 py-8 min-[900px]:px-10 min-[900px]:py-10">
        <p
          v-if="phase === 'success'"
          class="m-0 flex flex-1 flex-col justify-center rounded-xl border border-marketing-green/20 bg-marketing-mint/40 px-5 py-8 text-center font-dmSans text-base font-medium text-marketing-green"
          role="status"
        >
          {{ S.pricingContactSuccess }}
        </p>

        <form
          v-else
          class="flex flex-col gap-5"
          novalidate
          @submit.prevent="onSubmit"
        >
          <p v-if="formError" class="m-0 text-sm text-red-600" role="alert">
            {{ formError }}
          </p>

          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div class="flex flex-col gap-2">
              <label class="field-label" for="pricing-inquiry-name">{{ S.pricingContactName }}</label>
              <input
                id="pricing-inquiry-name"
                ref="nameInputEl"
                v-model="form.name"
                type="text"
                autocomplete="name"
                :class="formTextInputClass"
                :disabled="phase === 'loading'"
              >
            </div>
            <div class="flex flex-col gap-2">
              <label class="field-label" for="pricing-inquiry-company">{{ S.pricingContactCompany }}</label>
              <input
                id="pricing-inquiry-company"
                v-model="form.company"
                type="text"
                autocomplete="organization"
                :class="formTextInputClass"
                :disabled="phase === 'loading'"
              >
            </div>
          </div>

          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div class="flex flex-col gap-2">
              <label class="field-label" for="pricing-inquiry-email">{{ S.pricingContactEmail }}</label>
              <input
                id="pricing-inquiry-email"
                v-model="form.email"
                type="email"
                autocomplete="email"
                :class="formTextInputClass"
                :disabled="phase === 'loading'"
              >
            </div>
            <div class="flex flex-col gap-2">
              <label class="field-label" for="pricing-inquiry-phone">{{ S.pricingContactPhone }}</label>
              <input
                id="pricing-inquiry-phone"
                v-model="form.phone"
                type="tel"
                autocomplete="tel"
                :class="formTextInputClass"
                :disabled="phase === 'loading'"
              >
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label class="field-label" for="pricing-inquiry-service">{{ S.pricingContactService }}</label>
            <AppFormDropdown
              :model-value="form.service_id"
              :options="serviceOptions"
              :placeholder="S.pricingContactServicePlaceholder"
              bordered
              :disabled="phase === 'loading'"
              @update:model-value="form.service_id = $event"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label class="field-label" for="pricing-inquiry-message">{{ S.pricingContactMessage }}</label>
            <textarea
              id="pricing-inquiry-message"
              v-model="form.message"
              rows="5"
              :class="formTextareaClass"
              :placeholder="S.pricingContactMessagePlaceholder"
              :disabled="phase === 'loading'"
            />
          </div>

          <label class="flex cursor-pointer items-start gap-2 text-sm font-medium text-black/80">
            <AppCheckbox
              :model-value="form.consent"
              :disabled="phase === 'loading'"
              @update:model-value="form.consent = $event"
            />
            <span>{{ S.pricingContactConsent }}</span>
          </label>

          <div class="pt-1">
            <AppButton
              type="submit"
              variant="primary"
              class="!h-11 w-full !rounded-full !text-[15px] !font-bold sm:!w-auto sm:!min-w-[200px]"
              :disabled="phase === 'loading'"
            >
              {{ phase === 'loading' ? S.loading : S.pricingContactSubmit }}
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { S } from '~/utils/strings'
import { formTextInputClass, formTextareaClass } from '~/utils/form-field-ui'
import { validateEmail, requiredString } from '~/utils/validation'
import {
  pricingAddonServiceDropdownOptions,
  type PricingAddonServiceId,
} from '~/utils/pricing-addon-services'

const props = defineProps<{
  selectedServiceId?: PricingAddonServiceId | null
}>()

const { user, profile } = useAuth()
const { phase, submit, resetPhase } = usePricingInquiry()

const sectionEl = ref<HTMLElement | null>(null)
const nameInputEl = ref<HTMLInputElement | null>(null)
const formError = ref<string | null>(null)

const serviceOptions = pricingAddonServiceDropdownOptions()

const salesMailto = computed(() => `mailto:${S.pricingSalesEmail}`)
const salesTelHref = computed(() => `tel:${S.pricingSalesPhone.replace(/\s+/g, '')}`)

const form = reactive({
  name: '',
  company: '',
  email: '',
  phone: '',
  service_id: 'homepage_banner' as string,
  message: '',
  consent: false,
})

function applyProfilePrefill(): void {
  if (user.value?.email && !form.email.trim()) {
    form.email = user.value.email
  }
  if (!form.company.trim()) {
    const company =
      profile.value?.company_name?.trim() ||
      profile.value?.display_name?.trim() ||
      ''
    if (company) form.company = company
  }
  if (!form.name.trim()) {
    const first = profile.value?.first_name?.trim() ?? ''
    const last = profile.value?.last_name?.trim() ?? ''
    const combined = `${first} ${last}`.trim()
    if (combined) form.name = combined
    else if (profile.value?.display_name?.trim()) {
      form.name = profile.value.display_name.trim()
    }
  }
  if (!form.phone.trim() && profile.value?.phone_e164?.trim()) {
    form.phone = profile.value.phone_e164.trim()
  }
}

watch(
  () => props.selectedServiceId,
  (id) => {
    if (id) form.service_id = id
  },
  { immediate: true },
)

watch(
  () => [user.value?.id, profile.value?.id],
  () => {
    applyProfilePrefill()
  },
  { immediate: true },
)

function validateForm(): string | null {
  return (
    requiredString(form.name, S.pricingContactErrorName) ||
    requiredString(form.company, S.pricingContactErrorCompany) ||
    validateEmail(form.email, S.pricingContactErrorEmail) ||
    requiredString(form.service_id, S.pricingContactErrorService) ||
    requiredString(form.message, S.pricingContactErrorMessage) ||
    (!form.consent ? S.pricingContactErrorConsent : null)
  )
}

async function onSubmit(): Promise<void> {
  formError.value = null
  const validationError = validateForm()
  if (validationError) {
    formError.value = validationError
    return
  }
  resetPhase()
  const result = await submit({
    name: form.name,
    company: form.company,
    email: form.email,
    phone: form.phone || undefined,
    service_id: form.service_id,
    message: form.message,
    consent: form.consent,
  })
  if (!result.ok) {
    formError.value = result.message
  }
}

function focusFirstField(): void {
  nameInputEl.value?.focus({ preventScroll: true })
}

defineExpose({
  focusFirstField,
  sectionEl,
})
</script>

<style scoped>
.pricing-contact-panel::before,
.pricing-contact-panel::after {
  content: '';
  pointer-events: none;
  position: absolute;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.07);
}

.pricing-contact-panel::before {
  right: -100px;
  top: -80px;
  width: 280px;
  height: 280px;
}

.pricing-contact-panel::after {
  left: -60px;
  bottom: 40px;
  width: 180px;
  height: 180px;
}
</style>
