<template>
  <div
    class="flex min-h-dvh items-center justify-center bg-marketing-mint px-5 py-10 font-dmSans text-black antialiased"
  >
    <div
      class="flex w-full max-w-[1020px] flex-col overflow-hidden rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.13)] min-[701px]:min-h-[620px] min-[701px]:flex-row"
    >
      <div :class="authMarketingPanelClass">
        <AppBrandLogo
          variant="mark"
          root-class="relative z-[1]"
          image-class="size-10 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.12)]"
        />
        <div class="relative z-[1]">
          <h2 class="m-0 text-[42px] font-extrabold leading-[1.15]">
            Bez práce<br>nie sú koláče.
          </h2>
          <p class="mt-4 text-lg font-medium leading-normal text-white/75">
            Nastav si nové heslo a pokračuj v Jobbie.
          </p>
        </div>
      </div>

      <div
        class="flex flex-1 flex-col justify-center bg-white px-5 py-8 min-[390px]:px-7 min-[390px]:py-10 min-[701px]:px-14 min-[701px]:py-[52px]"
      >
        <h1 class="m-0 text-4xl font-extrabold leading-[1.1] text-black">
          {{ S.resetPasswordTitle }}
          <span class="text-marketing-green">{{ S.resetPasswordTitleAccent }}</span>
        </h1>
        <p class="mb-9 mt-2 text-[17px] font-normal leading-normal text-black/55">
          {{ S.resetPasswordSubtitle }}
        </p>

        <p v-if="loadingSession" class="text-sm text-black/60" role="status">
          {{ S.loading }}
        </p>

        <template v-else-if="!hasRecoverySession">
          <p class="mb-4 text-sm text-red-600" role="alert">
            {{ sessionError ?? S.resetPasswordExpired }}
          </p>
          <NuxtLink
            to="/auth/login"
            class="inline-flex h-14 w-full items-center justify-center rounded-full bg-marketing-green text-lg font-bold text-white no-underline transition-opacity duration-200 hover:opacity-[0.88]"
          >
            {{ S.resetPasswordBackToLogin }}
          </NuxtLink>
        </template>

        <template v-else>
          <p v-if="error" class="mb-4 text-sm text-red-600" role="alert">{{ error }}</p>
          <p v-if="success" class="mb-4 text-sm text-marketing-green" role="status">
            {{ success }}
          </p>
          <form v-if="!success" class="contents" @submit.prevent="handleSubmit">
            <div class="mb-5 flex flex-col gap-1.5">
              <label :class="fieldLabelClass" for="reset-password">
                {{ S.settingsNewPassword }}
              </label>
              <p class="m-0 font-dmSans text-sm text-black/55">{{ passwordPolicyHint() }}</p>
              <div class="relative flex items-center">
                <input
                  id="reset-password"
                  v-model="password"
                  :type="passwordVisible ? 'text' : 'password'"
                  autocomplete="new-password"
                  :placeholder="S.resetPasswordNewPlaceholder"
                  :class="inputWithIconClass"
                  :disabled="saving"
                >
                <button
                  type="button"
                  tabindex="-1"
                  class="absolute right-[18px] flex items-center border-none bg-transparent p-0 text-base text-black/30 transition-colors duration-150 hover:text-marketing-green"
                  :aria-label="passwordVisible ? 'Skryť heslo' : 'Zobraziť heslo'"
                  @click="passwordVisible = !passwordVisible"
                >
                  <svg
                    v-if="!passwordVisible"
                    class="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <svg
                    v-else
                    class="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 1 1 1-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div class="mb-7 flex flex-col gap-1.5">
              <label :class="fieldLabelClass" for="reset-password-confirm">
                {{ S.settingsConfirmPassword }}
              </label>
              <div class="relative flex items-center">
                <input
                  id="reset-password-confirm"
                  v-model="confirmPassword"
                  :type="confirmPasswordVisible ? 'text' : 'password'"
                  autocomplete="new-password"
                  :placeholder="S.resetPasswordConfirmPlaceholder"
                  :class="inputWithIconClass"
                  :disabled="saving"
                >
                <button
                  type="button"
                  tabindex="-1"
                  class="absolute right-[18px] flex items-center border-none bg-transparent p-0 text-base text-black/30 transition-colors duration-150 hover:text-marketing-green"
                  :aria-label="confirmPasswordVisible ? 'Skryť heslo' : 'Zobraziť heslo'"
                  @click="confirmPasswordVisible = !confirmPasswordVisible"
                >
                  <svg
                    v-if="!confirmPasswordVisible"
                    class="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <svg
                    v-else
                    class="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 1 1 1-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <AuthTurnstileWidget
              ref="resetTurnstileRef"
              v-model="captchaToken"
              class="mb-4"
            />

            <button
              type="submit"
              class="mb-4 h-14 w-full is-clickable rounded-full border-none bg-marketing-green text-lg font-bold text-white transition-opacity duration-200 hover:opacity-[0.88] disabled:is-disabled-cursor disabled:opacity-50"
              :disabled="saving"
            >
              {{ saving ? S.resetPasswordSaving : S.resetPasswordSubmit }}
            </button>
          </form>

          <NuxtLink
            v-else
            to="/auth/login"
            class="inline-flex h-14 w-full items-center justify-center rounded-full bg-marketing-green text-lg font-bold text-white no-underline transition-opacity duration-200 hover:opacity-[0.88]"
          >
            {{ S.resetPasswordBackToLogin }}
          </NuxtLink>

          <p v-if="!success" class="m-0 text-center text-base font-medium text-black/50">
            {{ S.resetPasswordHaveAccount }}
            <NuxtLink
              to="/auth/login"
              class="font-bold text-marketing-green no-underline transition-opacity duration-150 hover:opacity-75"
            >
              {{ S.signIn }}
            </NuxtLink>
          </p>
          <AuthLegalFooter class="mt-6" />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { setPasswordRecoverySkipProfile } from '~/utils/auth-recovery'
import { authMarketingPanelClass } from '~/utils/marketing-ui'
import {
  bootstrapPasswordRecoverySession,
  readRecoveryHandoffForBootstrap,
} from '~/utils/bootstrap-password-recovery-session'
import { mapSupabaseResetError } from '~/utils/map-supabase-reset-error'
import { isCaptchaLoginError } from '~/utils/map-supabase-login-error'
import { S } from '~/utils/strings'
import { validatePassword, passwordPolicyHint } from '~/utils/validate-password'
import { formFieldLabelClass, formTextInputTrailingIconClass } from '~/utils/form-field-ui'

const fieldLabelClass = formFieldLabelClass
const inputWithIconClass = formTextInputTrailingIconClass
import { waitForAuthReady } from '~/utils/wait-for-auth'

definePageMeta({ layout: 'app' })

setPasswordRecoverySkipProfile(true)

const route = useRoute()
const supabase = useSupabase()
const { revokeAllSessionsEverywhere, signOut } = useAuth()

const loadingSession = ref(true)
const hasRecoverySession = ref(false)
const sessionError = ref<string | null>(null)
const password = ref('')
const confirmPassword = ref('')
const passwordVisible = ref(false)
const confirmPasswordVisible = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const captchaToken = ref('')
const resetTurnstileRef = ref<{ reset?: () => void } | null>(null)
const { requireCaptchaToken } = useAuthCaptcha()

async function bootstrapRecoverySession(): Promise<void> {
  sessionError.value = null
  const result = await bootstrapPasswordRecoverySession(
    supabase,
    readRecoveryHandoffForBootstrap(route),
  )
  hasRecoverySession.value = result.ok
  if (!result.ok) {
    sessionError.value = result.error
  }
}

async function handleSubmit(): Promise<void> {
  error.value = null
  if (password.value !== confirmPassword.value) {
    error.value = S.settingsPasswordMismatch
    return
  }
  const passwordError = validatePassword(password.value)
  if (passwordError) {
    error.value = passwordError
    return
  }

  const captchaErr = requireCaptchaToken(captchaToken.value)
  if (captchaErr) {
    error.value = captchaErr
    return
  }

  const { data: beforeUpdate } = await supabase.auth.getSession()
  if (!beforeUpdate.session?.access_token) {
    error.value = S.resetPasswordExpired
    hasRecoverySession.value = false
    return
  }

  saving.value = true
  try {
    const { error: updateError } = await supabase.auth.updateUser({
      password: password.value,
    })
    if (updateError) {
      if (isCaptchaLoginError(updateError.code, updateError.message)) {
        captchaToken.value = ''
        resetTurnstileRef.value?.reset?.()
      }
      error.value = mapSupabaseResetError(updateError.code, updateError.message)
      return
    }

    setPasswordRecoverySkipProfile(false)
    await revokeAllSessionsEverywhere()
    await signOut()

    success.value = S.resetPasswordSuccess
    password.value = ''
    confirmPassword.value = ''
  } catch {
    error.value = S.resetPasswordSaveFailed
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await waitForAuthReady()
  await bootstrapRecoverySession()
  loadingSession.value = false
})

onBeforeUnmount(() => {
  setPasswordRecoverySkipProfile(false)
})
</script>
