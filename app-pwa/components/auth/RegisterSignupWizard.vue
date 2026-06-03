<template>
  <div
    class="font-dmSans flex min-h-screen items-center justify-center bg-marketing-mint px-5 py-10 antialiased"
  >
    <div
      class="flex w-full max-w-[1060px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.13)] md:flex-row"
    >
      <!-- Left marketing panel -->
      <div
        class="relative hidden w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#15803d] to-[#22c55e] px-11 py-10 before:pointer-events-none before:absolute before:right-[-100px] before:top-[-80px] before:size-[320px] before:rounded-full before:bg-white/[0.07] after:pointer-events-none after:absolute after:bottom-10 after:left-[-60px] after:size-[200px] after:rounded-full after:bg-white/[0.07] md:flex md:min-h-[640px] md:w-[38%] md:min-w-[38%] md:max-w-[38%]"
      >
        <AppBrandLogo
          variant="mark"
          root-class="relative z-[1]"
          image-class="size-10 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.12)]"
        />
        <div class="relative z-[1]">
          <h2 class="m-0 text-[38px] font-extrabold leading-[1.2] text-white">
            Začni svoju<br />cestu s nami.
          </h2>
          <p class="mt-3.5 text-[17px] font-medium leading-normal text-white/75">
            Registrácia trvá menej ako minútu. Nájdi prácu alebo brigádnikov už dnes.
          </p>
        </div>
      </div>

      <!-- Right: wizard -->
      <div
        class="flex min-h-[640px] flex-1 flex-col bg-white px-6 py-8 md:min-h-[640px] md:px-[52px] md:py-11"
      >
        <!-- Progress -->
        <div class="mb-9 flex items-start gap-0">
          <template v-for="(label, idx) in progressLabels" :key="idx">
            <div class="flex flex-col items-center gap-1.5">
              <div
                class="relative z-[1] flex size-[34px] items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300"
                :class="progressCircleClass(idx + 1)"
              >
                <i
                  v-if="currentStep > idx + 1"
                  class="fa-solid fa-check text-xs text-white"
                />
                <span v-else>{{ idx + 1 }}</span>
              </div>
              <span
                class="mt-0.5 whitespace-nowrap text-xs font-medium transition-colors duration-300"
                :class="progressLabelClass(idx + 1)"
              >
                {{ label }}
              </span>
            </div>
            <div
              v-if="idx < progressLabels.length - 1"
              class="mx-0 mt-4 h-0.5 min-w-[12px] flex-1 transition-colors duration-300"
              :class="currentStep > idx + 1 ? 'bg-marketing-green' : 'bg-gray-300'"
            />
          </template>
        </div>

        <!-- Step 1 -->
        <div v-show="currentStep === 1" class="flex flex-1 flex-col">
          <h2 class="m-0 mb-1.5 text-[30px] font-extrabold leading-[1.15] text-black">
            Aký typ účtu <span class="text-marketing-green">chceš?</span>
          </h2>
          <p class="mb-7 text-base font-normal leading-normal text-black/50">
            Vyber si, ako budeš Jobbie používať.
          </p>
          <div class="grid flex-1 grid-cols-1 content-start gap-3.5 sm:grid-cols-2">
            <button
              type="button"
              class="flex cursor-pointer flex-col gap-2.5 rounded-[18px] border-2 border-gray-200 p-7 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-marketing-green sm:px-6 sm:py-7"
              :class="
                accountType === 'individual'
                  ? 'border-marketing-green bg-marketing-mint'
                  : 'border-gray-200 bg-white'
              "
              @click="selectAccountType('individual')"
            >
              <i
                class="fa-solid fa-user text-[32px] transition-colors duration-200"
                :class="accountType === 'individual' ? 'text-marketing-green' : 'text-black/20'"
              />
              <h3 class="m-0 text-xl font-extrabold text-black">Jednotlivec</h3>
              <p class="m-0 text-[15px] font-normal leading-snug text-black/45">
                Fyzická osoba hľadajúca prácu, brigádu alebo ponúkajúca svoje služby.
              </p>
            </button>
            <button
              type="button"
              class="flex cursor-pointer flex-col gap-2.5 rounded-[18px] border-2 border-gray-200 p-7 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-marketing-green sm:px-6 sm:py-7"
              :class="
                accountType === 'company' ? 'border-marketing-green bg-marketing-mint' : 'border-gray-200 bg-white'
              "
              @click="selectAccountType('company')"
            >
              <i
                class="fa-solid fa-building text-[32px] transition-colors duration-200"
                :class="accountType === 'company' ? 'text-marketing-green' : 'text-black/20'"
              />
              <h3 class="m-0 text-xl font-extrabold text-black">Firma / SZČO</h3>
              <p class="m-0 text-[15px] font-normal leading-snug text-black/45">
                Podnikateľ alebo firma hľadajúca brigádnikov, zamestnancov alebo dodávateľov.
              </p>
            </button>
          </div>
          <p v-show="showErr1" class="mt-1.5 text-sm font-medium text-red-500">
            Vyber typ účtu aby si mohol pokračovať.
          </p>
          <div class="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              class="invisible pointer-events-none flex h-[52px] items-center gap-2 rounded-full border-[1.5px] border-gray-200 bg-marketing-soft px-7 text-base font-semibold text-black/60"
            >
              <i class="fa-solid fa-arrow-left" /> Späť
            </button>
            <button
              type="button"
              class="ml-auto flex h-[52px] items-center gap-2 rounded-full bg-marketing-green px-9 text-base font-bold text-white transition-opacity hover:opacity-[0.88]"
              @click="goNext"
            >
              Ďalej <i class="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>

        <!-- Step 2 -->
        <div v-show="currentStep === 2" class="flex flex-1 flex-col">
          <h2 class="m-0 mb-1.5 text-[30px] font-extrabold leading-[1.15] text-black">
            Aktívne <span class="text-marketing-green">roly</span>
          </h2>
          <p class="mb-7 text-base font-normal leading-normal text-black/50">
            Čo chceš robiť? Môžeš vybrať aj viac možností.
          </p>
          <div class="flex flex-1 flex-col gap-3">
            <button
              type="button"
              class="flex cursor-pointer items-center gap-3.5 rounded-full border-2 border-gray-200 px-6 py-4 text-left transition-colors duration-200 hover:border-marketing-green"
              :class="customerRole ? 'border-marketing-green bg-marketing-mint' : ''"
              @click="customerRole = !customerRole"
            >
              <div
                class="flex size-[42px] shrink-0 items-center justify-center rounded-full text-[17px] transition-colors duration-200"
                :class="
                  customerRole ? 'bg-marketing-panel text-marketing-green' : 'bg-gray-100 text-black/30'
                "
              >
                <i class="fa-solid fa-hammer" />
              </div>
              <span class="flex-1 text-[17px] font-semibold text-black">{{ S.roleCustomerCard }}</span>
              <div
                class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 transition-all duration-200"
                :class="customerRole ? 'border-marketing-green bg-marketing-green' : ''"
              >
                <i
                  class="fa-solid fa-check text-xs text-white"
                  :class="customerRole ? 'block' : 'hidden'"
                />
              </div>
            </button>
            <button
              type="button"
              class="flex cursor-pointer items-center gap-3.5 rounded-full border-2 border-gray-200 px-6 py-4 text-left transition-colors duration-200 hover:border-marketing-green"
              :class="workerRole ? 'border-marketing-green bg-marketing-mint' : ''"
              @click="workerRole = !workerRole"
            >
              <div
                class="flex size-[42px] shrink-0 items-center justify-center rounded-full text-[17px] transition-colors duration-200"
                :class="workerRole ? 'bg-marketing-panel text-marketing-green' : 'bg-gray-100 text-black/30'"
              >
                <i class="fa-solid fa-magnifying-glass" />
              </div>
              <span class="flex-1 text-[17px] font-semibold text-black">{{ S.roleWorkerCard }}</span>
              <div
                class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 transition-all duration-200"
                :class="workerRole ? 'border-marketing-green bg-marketing-green' : ''"
              >
                <i
                  class="fa-solid fa-check text-xs text-white"
                  :class="workerRole ? 'block' : 'hidden'"
                />
              </div>
            </button>
            <button
              type="button"
              class="flex cursor-pointer items-center gap-3.5 rounded-full border-2 border-gray-200 px-6 py-4 text-left transition-colors duration-200 hover:border-marketing-green"
              :class="providerRole ? 'border-marketing-green bg-marketing-mint' : ''"
              @click="providerRole = !providerRole"
            >
              <div
                class="flex size-[42px] shrink-0 items-center justify-center rounded-full text-[17px] transition-colors duration-200"
                :class="providerRole ? 'bg-marketing-panel text-marketing-green' : 'bg-gray-100 text-black/30'"
              >
                <i class="fa-solid fa-store" />
              </div>
              <span class="flex-1 text-[17px] font-semibold text-black">{{ S.roleProviderCard }}</span>
              <div
                class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 transition-all duration-200"
                :class="providerRole ? 'border-marketing-green bg-marketing-green' : ''"
              >
                <i
                  class="fa-solid fa-check text-xs text-white"
                  :class="providerRole ? 'block' : 'hidden'"
                />
              </div>
            </button>
          </div>
          <p v-show="showErr2" class="mt-1.5 text-sm font-medium text-red-500">
            Vyber aspoň jednu rolu aby si mohol pokračovať.
          </p>
          <div class="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              class="flex h-[52px] items-center gap-2 rounded-full border-[1.5px] border-gray-200 bg-marketing-soft px-7 text-base font-semibold text-black/60 transition-colors hover:border-marketing-green hover:text-marketing-green"
              @click="goPrev"
            >
              <i class="fa-solid fa-arrow-left" /> Späť
            </button>
            <button
              type="button"
              class="ml-auto flex h-[52px] items-center gap-2 rounded-full bg-marketing-green px-9 text-base font-bold text-white transition-opacity hover:opacity-[0.88]"
              @click="goNext"
            >
              Ďalej <i class="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>

        <!-- Step 3 -->
        <div v-show="currentStep === 3" class="flex flex-1 flex-col">
          <h2 class="m-0 mb-1.5 text-[30px] font-extrabold leading-[1.15] text-black">
            Tvoj <span class="text-marketing-green">profil</span>
          </h2>
          <p class="mb-7 text-base font-normal leading-normal text-black/50">
            {{ step3Description }}
          </p>
          <div
            v-show="accountType === 'individual'"
            class="flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div class="flex flex-col gap-1.5">
                <label :class="fieldLabelClass">Meno</label>
                <div class="relative flex items-center">
                  <input
                    v-model="firstName"
                    type="text"
                    placeholder="Ján"
                    :class="inputWithTrailingIconClass"
                  />
                  <i
                    class="fa-regular fa-user pointer-events-none absolute right-[18px] text-[15px] text-black/30"
                  />
                </div>
              </div>
              <div class="flex flex-col gap-1.5">
                <label :class="fieldLabelClass">Priezvisko</label>
                <div class="relative flex items-center">
                  <input
                    v-model="lastName"
                    type="text"
                    placeholder="Novák"
                    :class="inputWithTrailingIconClass"
                  />
                  <i
                    class="fa-regular fa-user pointer-events-none absolute right-[18px] text-[15px] text-black/30"
                  />
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label :class="fieldLabelClass">Dátum narodenia</label>
              <div class="relative flex items-center">
                <input
                  v-model="birthDate"
                  type="date"
                  :class="inputWithTrailingIconClass"
                />
                <i
                  class="fa-regular fa-calendar pointer-events-none absolute right-[18px] text-[15px] text-black/30"
                />
              </div>
            </div>
          </div>
          <div
            v-show="accountType === 'company'"
            class="flex flex-1 flex-col gap-4 overflow-y-auto"
          >
            <div class="flex flex-col gap-1.5">
              <label :class="fieldLabelClass">Názov spoločnosti</label>
              <div class="relative flex items-center">
                <input
                  v-model="companyName"
                  type="text"
                  placeholder="Napr. Stavebná firma Novák s.r.o."
                  :class="inputWithTrailingIconClass"
                />
                <i
                  class="fa-regular fa-building pointer-events-none absolute right-[18px] text-[15px] text-black/30"
                />
              </div>
            </div>
            <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div class="flex flex-col gap-1.5">
                <label :class="fieldLabelClass">IČO</label>
                <input
                  v-model="ico"
                  type="text"
                  placeholder="12345678"
                  :class="inputClass"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label :class="fieldLabelClass">IČ DPH</label>
                <input
                  v-model="vatId"
                  type="text"
                  placeholder="SK1234567890"
                  :class="inputClass"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label :class="fieldLabelClass">DIČ</label>
                <input
                  v-model="dic"
                  type="text"
                  placeholder="1234567890"
                  :class="inputClass"
                />
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label :class="fieldLabelClass">Sídlo spoločnosti</label>
              <div class="relative flex items-center">
                <input
                  v-model="registeredOffice"
                  type="text"
                  placeholder="Hlavná 1, 010 01 Žilina"
                  :class="inputWithTrailingIconClass"
                />
                <i
                  class="fa-solid fa-location-dot pointer-events-none absolute right-[18px] text-[15px] text-black/30"
                />
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label :class="fieldLabelClass">Meno používateľa profilu</label>
              <div class="relative flex items-center">
                <input
                  v-model="companyProfileUsername"
                  type="text"
                  placeholder="jan.novak"
                  :class="inputWithTrailingIconClass"
                />
                <i
                  class="fa-solid fa-at pointer-events-none absolute right-[18px] text-[15px] text-black/30"
                />
              </div>
            </div>
          </div>
          <p v-show="showErr3" class="mt-1.5 text-sm font-medium text-red-500">{{ err3Message }}</p>
          <div class="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              class="flex h-[52px] items-center gap-2 rounded-full border-[1.5px] border-gray-200 bg-marketing-soft px-7 text-base font-semibold text-black/60 transition-colors hover:border-marketing-green hover:text-marketing-green"
              @click="goPrev"
            >
              <i class="fa-solid fa-arrow-left" /> Späť
            </button>
            <button
              type="button"
              class="ml-auto flex h-[52px] items-center gap-2 rounded-full bg-marketing-green px-9 text-base font-bold text-white transition-opacity hover:opacity-[0.88]"
              @click="goNext"
            >
              Ďalej <i class="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>

        <!-- Step 4 -->
        <div v-show="currentStep === 4" class="flex flex-1 flex-col">
          <h2 class="m-0 mb-1.5 text-[30px] font-extrabold leading-[1.15] text-black">
            Vytvor si <span class="text-marketing-green">účet</span>
          </h2>
          <p class="mb-7 text-base font-normal leading-normal text-black/50">
            Zadaj e-mail a heslo, alebo sa registruj cez Google.
          </p>
          <div class="flex flex-1 flex-col gap-4 overflow-visible">
            <div class="flex flex-col gap-1.5">
              <label :class="fieldLabelClass">E-mail</label>
              <div class="relative flex items-center">
                <input
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  placeholder="jan.novak@email.sk"
                  :class="inputWithTrailingIconClass"
                />
                <i
                  class="fa-regular fa-envelope pointer-events-none absolute right-[18px] text-[15px] text-black/30"
                />
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label :class="fieldLabelClass">Heslo</label>
              <div class="relative flex items-center">
                <input
                  v-model="password"
                  :type="showPassword1 ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Minimálne 8 znakov"
                  :class="inputWithTrailingIconClass"
                />
                <button
                  type="button"
                  tabindex="-1"
                  class="absolute right-[18px] flex items-center border-0 bg-transparent p-0 text-[15px] text-black/30 transition-colors hover:text-marketing-green"
                  @click="showPassword1 = !showPassword1"
                >
                  <i :class="showPassword1 ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'" />
                </button>
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label :class="fieldLabelClass">Zopakovať heslo</label>
              <div class="relative flex items-center">
                <input
                  v-model="passwordConfirm"
                  :type="showPassword2 ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Zopakuj heslo"
                  :class="inputWithTrailingIconClass"
                />
                <button
                  type="button"
                  tabindex="-1"
                  class="absolute right-[18px] flex items-center border-0 bg-transparent p-0 text-[15px] text-black/30 transition-colors hover:text-marketing-green"
                  @click="showPassword2 = !showPassword2"
                >
                  <i :class="showPassword2 ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'" />
                </button>
              </div>
            </div>
            <label class="mt-1 flex cursor-pointer items-start gap-2.5">
              <AppCheckbox v-model="termsAgree" class="mt-1" />
              <span class="text-sm font-medium text-black/70">{{ S.termsAgree }}</span>
            </label>
            <label class="flex cursor-pointer items-start gap-2.5">
              <AppCheckbox v-model="newsletterSubscribe" class="mt-1" />
              <span class="text-sm font-medium text-black/70">{{ S.jobAlertsNewsletterLabel }}</span>
            </label>
            <div
              v-if="turnstileSiteKey"
              class="flex min-h-[65px] w-full items-center justify-center"
            >
              <div :key="turnstileKey" ref="turnstileContainer" class="w-full" />
            </div>
            <p v-show="showErr4" class="text-sm font-medium text-red-500">{{ err4Message }}</p>
            <p v-if="submitError" class="text-sm font-medium text-red-500">{{ submitError }}</p>
          </div>
          <div class="my-3 flex items-center gap-3">
            <div class="h-px flex-1 bg-black/10" />
            <span class="text-[13px] font-medium text-black/35">alebo</span>
            <div class="h-px flex-1 bg-black/10" />
          </div>
          <button
            type="button"
            class="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full border-[1.5px] border-black/12 bg-white font-dmSans text-base font-semibold text-black transition-colors hover:border-black/20 hover:bg-marketing-soft"
            :disabled="oauthLoading"
            @click="oauthGoogle"
          >
            <svg class="size-[18px] shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Registrovať sa cez Google
          </button>
          <div class="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              class="flex h-[52px] items-center gap-2 rounded-full border-[1.5px] border-gray-200 bg-marketing-soft px-7 text-base font-semibold text-black/60 transition-colors hover:border-marketing-green hover:text-marketing-green"
              @click="goPrev"
            >
              <i class="fa-solid fa-arrow-left" /> Späť
            </button>
            <button
              type="button"
              class="ml-auto flex h-[52px] items-center gap-2 rounded-full bg-marketing-green px-9 text-base font-bold text-white transition-opacity hover:opacity-[0.88] disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="saving"
              @click="submitRegister"
            >
              {{ saving ? S.loading : 'Registrovať sa' }}
              <i class="fa-solid fa-check" />
            </button>
          </div>
          <p class="mt-4 text-center text-[15px] font-medium text-black/45">
            Už máš účet?
            <NuxtLink to="/auth/login" class="font-bold text-marketing-green no-underline hover:opacity-75">
              Prihlásiť sa
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 4-step signup: credentials → roles → preferences → welcome; state in useRegistration useState.
import { ROUTES } from '~/utils/app-routes'
import { resolveSafeInternalPath } from '~/utils/safe-navigation'
import { S } from '~/utils/strings'
import {
  formFieldLabelClass,
  formTextInputClass,
  formTextInputTrailingIconCompactClass,
} from '~/utils/form-field-ui'

const fieldLabelClass = formFieldLabelClass
const inputClass = formTextInputClass
const inputWithTrailingIconClass = formTextInputTrailingIconCompactClass
import type { AccountType } from '~/composables/useRegistration'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
        },
      ) => string | undefined
      reset?: (widgetId?: string) => void
      remove?: (widgetId?: string) => void
    }
  }
}

const route = useRoute()
const config = useRuntimeConfig().public
const supabase = useSupabase()
const { setCredentials, setRoles } = useRegistration()
const { doSignUp, saving } = useRegistrationSignUp()
const { submit: submitNewsletter } = useNewsletterSubscribe()

const progressLabels = ['Typ účtu', 'Role', 'Profil', 'Prístup'] as const

const currentStep = ref(1)
const accountType = ref<AccountType | null>(null)
const customerRole = ref(false)
const workerRole = ref(false)
const providerRole = ref(false)

const firstName = ref('')
const lastName = ref('')
const birthDate = ref('')
const companyName = ref('')
const ico = ref('')
const dic = ref('')
const vatId = ref('')
const registeredOffice = ref('')
const companyProfileUsername = ref('')

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const termsAgree = ref(false)
const newsletterSubscribe = ref(false)
const showPassword1 = ref(false)
const showPassword2 = ref(false)

const showErr1 = ref(false)
const showErr2 = ref(false)
const showErr3 = ref(false)
const err3Message = ref('')
const showErr4 = ref(false)
const err4Message = ref('')
const submitError = ref<string | null>(null)

const oauthLoading = ref(false)
const turnstileSiteKey = computed(() => (config.turnstileSiteKey as string) || '')
const captchaToken = ref('')
const turnstileContainer = ref<HTMLElement | null>(null)
const turnstileWidgetId = ref<string | undefined>(undefined)
const turnstileKey = ref(0)

const step3Description = computed(() =>
  accountType.value === 'company'
    ? 'Zadaj základné informácie o tvojej firme.'
    : 'Pár základných informácií o tebe.',
)

function progressCircleClass(stepIndex: number): string {
  if (currentStep.value > stepIndex) {
    return 'border-marketing-green bg-marketing-green text-white'
  }
  if (currentStep.value === stepIndex) {
    return 'border-marketing-green bg-marketing-green text-white'
  }
  return 'border-gray-300 bg-white text-black/30'
}

function progressLabelClass(stepIndex: number): string {
  if (currentStep.value > stepIndex) return 'font-bold text-marketing-green'
  if (currentStep.value === stepIndex) return 'font-bold text-marketing-green'
  return 'text-black/30'
}

function selectAccountType(t: AccountType): void {
  accountType.value = t
  showErr1.value = false
}

function validateStep(n: number): boolean {
  if (n === 1) {
    if (!accountType.value) {
      showErr1.value = true
      return false
    }
  }
  if (n === 2) {
    if (!customerRole.value && !workerRole.value && !providerRole.value) {
      showErr2.value = true
      return false
    }
  }
  if (n === 3) {
    showErr3.value = false
    if (!accountType.value) {
      return false
    }
    if (accountType.value === 'individual') {
      if (!firstName.value.trim() || !lastName.value.trim()) {
        err3Message.value = 'Vyplňte meno a priezvisko.'
        showErr3.value = true
        return false
      }
      if (!birthDate.value.trim()) {
        err3Message.value = 'Vyberte dátum narodenia.'
        showErr3.value = true
        return false
      }
    } else if (accountType.value === 'company') {
      if (!companyName.value.trim()) {
        err3Message.value = 'Vyplňte názov spoločnosti.'
        showErr3.value = true
        return false
      }
      if (!ico.value.trim()) {
        err3Message.value = 'Vyplňte IČO.'
        showErr3.value = true
        return false
      }
      if (!dic.value.trim()) {
        err3Message.value = 'Vyplňte DIČ.'
        showErr3.value = true
        return false
      }
      if (!registeredOffice.value.trim()) {
        err3Message.value = 'Vyplňte sídlo spoločnosti.'
        showErr3.value = true
        return false
      }
      if (!companyProfileUsername.value.trim()) {
        err3Message.value = 'Vyplňte meno používateľa profilu.'
        showErr3.value = true
        return false
      }
    }
  }
  return true
}

function goNext(): void {
  if (!validateStep(currentStep.value)) return
  if (currentStep.value < 4) {
    currentStep.value += 1
  }
}

function goPrev(): void {
  if (currentStep.value > 1) {
    currentStep.value -= 1
  }
}

function getPostLoginPath(): string {
  const raw = route.query.redirect
  const s = Array.isArray(raw) ? raw[0] : raw
  return resolveSafeInternalPath(s, ROUTES.home)
}

async function oauthGoogle(): Promise<void> {
  submitError.value = null
  oauthLoading.value = true
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const redirectTo = `${origin}/auth/callback?redirect=${encodeURIComponent(getPostLoginPath())}`
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: false },
    })
    if (e) submitError.value = e.message ?? 'OAuth zlyhal.'
  } catch {
    submitError.value = 'OAuth zlyhal.'
  } finally {
    oauthLoading.value = false
  }
}

function mountTurnstile(): void {
  if (!import.meta.client || !turnstileSiteKey.value || !turnstileContainer.value) return
  const siteKey = turnstileSiteKey.value
  const mount = (): void => {
    if (!window.turnstile?.render || !turnstileContainer.value) return
    turnstileWidgetId.value = window.turnstile.render(turnstileContainer.value, {
      sitekey: siteKey,
      callback: (t: string) => {
        captchaToken.value = t
      },
      'expired-callback': () => {
        captchaToken.value = ''
      },
    })
  }
  if (window.turnstile?.render) {
    mount()
    return
  }
  const s = document.createElement('script')
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
  s.async = true
  s.onload = mount
  document.head.appendChild(s)
}

watch(
  () => currentStep.value,
  (step) => {
    showErr4.value = false
    submitError.value = null
    if (step !== 4) {
      captchaToken.value = ''
      if (turnstileWidgetId.value && typeof window.turnstile?.remove === 'function') {
        window.turnstile.remove(turnstileWidgetId.value)
        turnstileWidgetId.value = undefined
      }
      return
    }
    turnstileKey.value += 1
    nextTick(() => {
      if (turnstileSiteKey.value) mountTurnstile()
    })
  },
)

watch(customerRole, () => {
  showErr2.value = false
})
watch(workerRole, () => {
  showErr2.value = false
})
watch(providerRole, () => {
  showErr2.value = false
})

async function submitRegister(): Promise<void> {
  showErr4.value = false
  submitError.value = null
  const em = email.value.trim()
  if (!em) {
    err4Message.value = 'Zadaj e-mailovú adresu.'
    showErr4.value = true
    return
  }
  if (password.value.length < 8) {
    err4Message.value = 'Heslo musí mať aspoň 8 znakov.'
    showErr4.value = true
    return
  }
  if (password.value !== passwordConfirm.value) {
    err4Message.value = 'Heslá sa nezhodujú.'
    showErr4.value = true
    return
  }
  if (!termsAgree.value) {
    err4Message.value = S.termsRequired
    showErr4.value = true
    return
  }
  if (turnstileSiteKey.value && !captchaToken.value.trim()) {
    err4Message.value = 'Potvrďte, že nie ste robot (Turnstile).'
    showErr4.value = true
    return
  }
  if (!accountType.value) return
  setCredentials({
    accountType: accountType.value,
    email: em,
    password: password.value,
    termsAgree: termsAgree.value,
    firstName: firstName.value.trim(),
    lastName: lastName.value.trim(),
    companyName: companyName.value.trim(),
    registeredOffice: registeredOffice.value.trim(),
    ico: ico.value.trim(),
    dic: dic.value.trim(),
    vatId: vatId.value.trim(),
    birthDate: accountType.value === 'individual' ? birthDate.value.trim() : undefined,
    companyProfileUsername:
      accountType.value === 'company' ? companyProfileUsername.value.trim() : undefined,
  })
  setRoles({
    customer_role: customerRole.value,
    worker_role: workerRole.value,
    provider_role: providerRole.value,
  })
  const wantsNewsletter = newsletterSubscribe.value
  const result = await doSignUp(null, captchaToken.value, wantsNewsletter)
  if (!result.ok) {
    submitError.value = result.error
    return
  }
  if (wantsNewsletter) {
    const displayName =
      accountType.value === 'individual'
        ? `${firstName.value.trim()} ${lastName.value.trim()}`.trim()
        : companyName.value.trim()
    await submitNewsletter({
      email: em,
      name: displayName || undefined,
      consent: true,
    })
  }
  if (result.needsEmailConfirmation) {
    await navigateTo('/auth/register/confirm-email', { replace: true })
  }
}
</script>
