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
            Nájdi prácu cez Jobbie, rýchlo a bez starostí.
          </p>
        </div>
      </div>

      <div
        class="flex flex-1 flex-col justify-center bg-white px-5 py-8 min-[390px]:px-7 min-[390px]:py-10 min-[701px]:px-14 min-[701px]:py-[52px]"
      >
        <template v-if="forgotPasswordStep === 'sent'">
          <h1 class="m-0 text-4xl font-extrabold leading-[1.1] text-black">
            Skontrolujte <span class="text-marketing-green">e-mail</span>
          </h1>
          <p class="mb-9 mt-2 text-[17px] font-normal leading-normal text-black/55">
            {{ S.forgotPasswordSentMessage }}
          </p>
          <a
            v-if="forgotWebmailUrl"
            :href="forgotWebmailUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mb-4 inline-flex h-14 w-full items-center justify-center rounded-full bg-marketing-green text-lg font-bold text-white no-underline transition-opacity duration-200 hover:opacity-[0.88]"
          >
            {{ S.forgotPasswordOpenMailbox }}
          </a>
          <button
            type="button"
            class="h-14 w-full is-clickable rounded-full border-[1.5px] border-black/12 bg-white text-lg font-semibold text-black transition-[background-color,border-color] duration-150 hover:border-black/20 hover:bg-marketing-soft"
            @click="returnToLoginForm"
          >
            {{ S.forgotPasswordBackToLogin }}
          </button>
        </template>

        <template v-else-if="forgotPasswordStep === 'email'">
          <h1 class="m-0 text-4xl font-extrabold leading-[1.1] text-black">
            {{ S.forgotPasswordTitle }}
            <span class="text-marketing-green">{{ S.forgotPasswordTitleAccent }}</span>
          </h1>
          <p class="mb-9 mt-2 text-[17px] font-normal leading-normal text-black/55">
            {{ S.forgotPasswordSubtitle }}
          </p>

          <p v-if="error" class="mb-4 text-sm text-red-600" role="alert">{{ error }}</p>

          <AuthTurnstileWidget
            ref="forgotTurnstileRef"
            v-model="forgotCaptchaToken"
            :active="forgotPasswordStep === 'email'"
          />

          <form class="contents" @submit.prevent="submitForgotPasswordEmail">
            <div class="mb-7 flex flex-col gap-1.5">
              <label :class="fieldLabelClass" for="forgot-email">E-mail</label>
              <div class="relative flex items-center">
                <input
                  id="forgot-email"
                  v-model="email"
                  type="email"
                  autocomplete="username"
                  placeholder="jan.novak@email.sk"
                  :class="inputWithIconClass"
                  :disabled="forgotLoading"
                >
                <span class="pointer-events-none absolute right-[18px] text-black/30" aria-hidden="true">
                  <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                </span>
              </div>
            </div>

            <button
              type="submit"
              class="mb-4 h-14 w-full is-clickable rounded-full border-none bg-marketing-green text-lg font-bold text-white transition-opacity duration-200 hover:opacity-[0.88] disabled:is-disabled-cursor disabled:opacity-50"
              :disabled="forgotLoading"
            >
              {{ forgotLoading ? S.forgotPasswordSubmitting : S.forgotPasswordSubmit }}
            </button>
          </form>

          <button
            type="button"
            class="border-none bg-transparent p-0 text-base font-semibold text-marketing-green transition-opacity duration-150 hover:opacity-75"
            @click="returnToLoginForm"
          >
            {{ S.forgotPasswordBackToLogin }}
          </button>
        </template>

        <template v-else>
        <h1 class="mb-9 mt-0 text-4xl font-extrabold leading-[1.1] text-black">
          Vitaj <span class="text-marketing-green">späť</span>
        </h1>

        <p v-if="error" class="mb-4 text-sm text-red-600" role="alert">{{ error }}</p>
        <p v-if="infoMessage" class="mb-4 text-sm text-black/60" role="status">{{ infoMessage }}</p>

        <AuthTurnstileWidget
          ref="loginTurnstileRef"
          v-model="loginCaptchaToken"
          :active="showTurnstile"
        />

        <form class="contents" @submit.prevent="handleLoginSubmit">
          <div class="mb-5 flex flex-col gap-1.5">
            <label :class="fieldLabelClass" for="login-email">E-mail</label>
            <div class="relative flex items-center">
              <input
                id="login-email"
                v-model="email"
                type="email"
                autocomplete="username webauthn"
                placeholder="jan.novak@email.sk"
                :class="inputWithIconClass"
                :disabled="loading || oauthLoading"
              >
              <span class="pointer-events-none absolute right-[18px] text-black/30" aria-hidden="true">
                <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </span>
            </div>
          </div>

          <div class="mb-5 flex flex-col gap-1.5">
            <label :class="fieldLabelClass" for="login-password">{{ S.fieldLabelPassword }}</label>
            <div class="relative flex items-center">
              <input
                id="login-password"
                v-model="password"
                :type="passwordVisible ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Zadaj heslo"
                :class="inputWithIconClass"
                :disabled="loading || oauthLoading"
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

          <div class="mb-7 flex items-center justify-between">
            <label class="flex is-clickable items-center gap-2.5">
              <AppCheckbox v-model="rememberMe" />
              <span class="text-[15px] font-medium text-black/65">Zapamätať si ma</span>
            </label>
            <button
              type="button"
              class="border-none bg-transparent p-0 text-[15px] font-semibold text-marketing-green transition-opacity duration-150 hover:opacity-75 disabled:opacity-50"
              :disabled="forgotLoading"
              @click="handleForgotPassword"
            >
              Zabudol som heslo
            </button>
          </div>

          <button
            type="submit"
            class="mb-4 h-14 w-full is-clickable rounded-full border-none bg-marketing-green text-lg font-bold text-white transition-opacity duration-200 hover:opacity-[0.88] disabled:is-disabled-cursor disabled:opacity-50"
            :disabled="loading || oauthLoading"
          >
            {{ loading ? 'Načítava sa…' : 'Prihlásiť sa' }}
          </button>
        </form>

        <div class="mb-4 flex items-center gap-3">
          <span class="h-px flex-1 bg-black/10" />
          <span class="whitespace-nowrap text-sm font-medium text-black/35">alebo</span>
          <span class="h-px flex-1 bg-black/10" />
        </div>

        <button
          type="button"
          class="mb-7 flex h-14 w-full is-clickable items-center justify-center gap-2.5 rounded-full border-[1.5px] border-black/12 bg-white text-[17px] font-semibold text-black transition-[background-color,border-color] duration-150 hover:border-black/20 hover:bg-marketing-soft disabled:is-disabled-cursor disabled:opacity-50"
          :disabled="oauthLoading || loading"
          @click="oauthGoogle"
        >
          <svg class="size-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
          Prihlásiť sa cez Google
        </button>

        <p class="m-0 text-center text-base font-medium text-black/50">
          Nemáš ešte účet?
          <NuxtLink
            to="/auth/register"
            class="font-bold text-marketing-green no-underline transition-opacity duration-150 hover:opacity-75"
          >
            Registruj sa
          </NuxtLink>
        </p>
        <AuthLegalFooter class="mt-6" />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Generic login errors (no email enumeration); syncSession → BFF cookies; Turnstile when site key configured.
import {
  AUTH_RESET_PASSWORD_PATH,
  isAuthRecoveryInUrl,
  AUTH_LOGIN_BOOTSTRAP_KEY,
  setAuthLoginBootstrap,
  resolveAuthRedirectOrigin,
} from '~/utils/auth-recovery'
import { mapSupabaseForgotPasswordError } from '~/utils/map-supabase-forgot-password-error'
import { mapSupabaseLoginError, isCaptchaLoginError } from '~/utils/map-supabase-login-error'
import { setAuthRememberMePreference } from '~/utils/supabase-auth-storage'
import { resolveWebmailUrl } from '~/utils/email-webmail-url'
import { S } from '~/utils/strings'
import { authMarketingPanelClass } from '~/utils/marketing-ui'
import { formFieldLabelClass, formTextInputTrailingIconClass } from '~/utils/form-field-ui'

const fieldLabelClass = formFieldLabelClass
const inputWithIconClass = formTextInputTrailingIconClass
import {
  readAuthRememberMePreference,
  setAuthRememberMePreference,
} from '~/utils/supabase-auth-storage'
import { ROUTES } from '~/utils/app-routes'
import { resolveSafeInternalPath } from '~/utils/safe-navigation'
import { waitForAuthReady } from '~/utils/wait-for-auth'

definePageMeta({ layout: 'app' })

const route = useRoute()
const config = useRuntimeConfig().public
const supabase = useSupabase()
const { syncSession, session, user, signOut } = useAuth()
const { finishAuthAfterSignIn } = usePasskeySignInFlow()
const { startConditionalPasskeySignIn, abortConditionalPasskeySignIn } =
  usePasskeyConditionalSignIn()
const api = useApi()

type ForgotPasswordStep = 'login' | 'email' | 'sent'

const LOCKOUT_ERROR =
  'Príliš veľa neúspešných pokusov. Skúste znova neskôr.'

const email = ref('')
const password = ref('')
const forgotPasswordStep = ref<ForgotPasswordStep>('login')
const forgotEmailForWebmail = ref('')
const loading = ref(false)
const oauthLoading = ref(false)
const forgotLoading = ref(false)
const error = ref<string | null>(null)
const infoMessage = ref<string | null>(null)
const rememberMe = ref(false)
const passwordVisible = ref(false)
const loginCaptchaToken = ref('')
const forgotCaptchaToken = ref('')
const { turnstileEnabled, captchaRequiredMessage, supabaseCaptchaOptions } =
  useAuthCaptcha()
const captchaRequired = ref(false)
const loginFailedOnce = ref(false)
const showTurnstile = computed(
  () => forgotPasswordStep.value === 'login' && turnstileEnabled.value,
)
type TurnstileWidgetHandle = {
  reset?: () => void
  ensureToken?: () => Promise<string | null>
  refreshToken?: () => Promise<string | null>
}

const loginTurnstileRef = ref<TurnstileWidgetHandle | null>(null)
const forgotTurnstileRef = ref<TurnstileWidgetHandle | null>(null)
let passkeyAutofillStarted = false
const forgotWebmailUrl = computed(() => resolveWebmailUrl(forgotEmailForWebmail.value))

function resetLoginCaptcha(): void {
  loginCaptchaToken.value = ''
  loginTurnstileRef.value?.reset?.()
}

function getPostLoginPath(): string {
  const raw = route.query.redirect
  const s = Array.isArray(raw) ? raw[0] : raw
  return resolveSafeInternalPath(typeof s === 'string' ? s : undefined, ROUTES.home)
}

async function recordLoginAttempt(success: boolean): Promise<boolean> {
  const res = await api.request<{
    allowed?: boolean
    retry_after_seconds?: number | null
  }>('/api/auth/security/login-attempt', {
    method: 'POST',
    body: {
      email: email.value.trim(),
      success,
    },
    skipSessionExpiry: true,
  })
  if (res.status === 429) {
    return true
  }
  if (!success && res.ok && res.data?.allowed === false) {
    return true
  }
  return false
}

async function beginConditionalPasskeyAutofill(): Promise<void> {
  if (forgotPasswordStep.value !== 'login') return
  if (passkeyAutofillStarted) return

  let captcha: string | undefined
  if (turnstileEnabled.value) {
    const token = await loginTurnstileRef.value?.ensureToken?.()
    if (!token) return
    captcha = token
    loginCaptchaToken.value = token
  }

  passkeyAutofillStarted = true
  startConditionalPasskeySignIn({
    redirectPath: getPostLoginPath(),
    getRememberMe: () => rememberMe.value,
    captchaToken: captcha,
    onError: (msg) => {
      error.value = msg
      loading.value = false
    },
    onSigningIn: () => {
      loading.value = true
      error.value = null
    },
  })
}

async function handleLoginSubmit(): Promise<void> {
  abortConditionalPasskeySignIn()
  infoMessage.value = null
  error.value = null
  setAuthLoginBootstrap(true)
  loading.value = true
  try {
    await runPasswordLogin()
  } catch (err) {
    console.error('[login] unexpected error', err)
    error.value = S.loginPostAuthFailed
    setAuthLoginBootstrap(false)
  } finally {
    loading.value = false
  }
}

async function runPasswordLogin(): Promise<void> {
  if (!email.value.trim() || !password.value) {
    error.value = 'Vyplňte email a heslo.'
    setAuthLoginBootstrap(false)
    return
  }
  try {
    let captchaForSupabase = ''
    if (turnstileEnabled.value) {
      const token = await loginTurnstileRef.value?.refreshToken?.()
      if (!token) {
        error.value = captchaRequiredMessage
        return
      }
      captchaForSupabase = token
      loginCaptchaToken.value = token
    }
    const statusRes = await api.request<{
      allowed?: boolean
      retry_after_seconds?: number | null
      captcha_required?: boolean
    }>('/api/auth/security/login-status', {
      method: 'POST',
      body: {
        email: email.value.trim(),
      },
      skipSessionExpiry: true,
    })
    if (statusRes.ok && statusRes.data) {
      captchaRequired.value = Boolean(statusRes.data.captcha_required)
      if (statusRes.data.allowed === false) {
        error.value = LOCKOUT_ERROR
        return
      }
    }

    setAuthRememberMePreference(rememberMe.value)
    setAuthLoginBootstrap(true)
    const { data: signInData, error: e } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
      options: supabaseCaptchaOptions(captchaForSupabase || loginCaptchaToken.value),
    })
    if (e) {
      loginFailedOnce.value = true
      captchaRequired.value = true
      if (isCaptchaLoginError(e.code, e.message)) {
        resetLoginCaptcha()
      } else {
        loginCaptchaToken.value = ''
      }
      try {
        const lockedOut = await recordLoginAttempt(false)
        if (lockedOut) {
          error.value = LOCKOUT_ERROR
          return
        }
      } catch {
        /* best-effort */
      }
      error.value = mapSupabaseLoginError(e.code, e.message)
      return
    }
    if (!signInData.session?.access_token || !signInData.session.refresh_token) {
      error.value = S.loginPostAuthFailed
      return
    }
    const flow = await finishAuthAfterSignIn(signInData.session, getPostLoginPath())
    if (flow.error) {
      error.value = flow.error
    }
  } catch (err) {
    console.error('[login] password login error', err)
    error.value = S.loginPostAuthFailed
    setAuthLoginBootstrap(false)
  }
}

async function oauthGoogle(): Promise<void> {
  abortConditionalPasskeySignIn()
  infoMessage.value = null
  error.value = null
  oauthLoading.value = true
  try {
    let oauthCaptcha = loginCaptchaToken.value
    if (turnstileEnabled.value) {
      const token = await loginTurnstileRef.value?.refreshToken?.()
      if (!token) {
        error.value = captchaRequiredMessage
        return
      }
      oauthCaptcha = token
      loginCaptchaToken.value = token
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const redirectTo = `${origin}/auth/callback?redirect=${encodeURIComponent(getPostLoginPath())}`
    setAuthRememberMePreference(true)
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: false,
        ...supabaseCaptchaOptions(oauthCaptcha),
      },
    })
    if (e) {
      error.value = e.message ?? 'OAuth zlyhal.'
    }
  } catch {
    error.value = 'OAuth zlyhal.'
  } finally {
    oauthLoading.value = false
  }
}

async function sendForgotPasswordEmail(em: string): Promise<void> {
  error.value = null
  infoMessage.value = null
  let forgotCaptcha = ''
  if (turnstileEnabled.value) {
    const token = await forgotTurnstileRef.value?.refreshToken?.()
    if (!token) {
      error.value = captchaRequiredMessage
      return
    }
    forgotCaptcha = token
    forgotCaptchaToken.value = token
  }
  forgotLoading.value = true
  let supabaseError: { code?: string; message?: string } | null = null
  try {
    const origin = resolveAuthRedirectOrigin(String(config.siteUrl || ''))
    if (!origin) {
      supabaseError = { code: 'validation_failed', message: 'redirect origin missing' }
    } else {
      const redirectTo = `${origin}${AUTH_RESET_PASSWORD_PATH}`
      const { error: e } = await supabase.auth.resetPasswordForEmail(em, {
        redirectTo,
        ...(forgotCaptcha ? { captchaToken: forgotCaptcha } : {}),
      })
      supabaseError = e
    }
  } catch (err) {
    if (import.meta.dev) {
      console.warn('[forgot-password] unexpected error', err)
    }
    supabaseError = { code: 'unexpected_failure' }
  } finally {
    forgotLoading.value = false
  }

  const mapped = mapSupabaseForgotPasswordError(
    supabaseError?.code,
    supabaseError?.message,
  )
  if (mapped) {
    error.value = mapped
    return
  }

  if (supabaseError && import.meta.dev) {
    console.warn('[forgot-password] Supabase error (generic success shown)', supabaseError)
  }

  forgotEmailForWebmail.value = em
  forgotPasswordStep.value = 'sent'
}

function returnToLoginForm(): void {
  forgotPasswordStep.value = 'login'
  forgotCaptchaToken.value = ''
  error.value = null
  infoMessage.value = null
  passkeyAutofillStarted = false
  nextTick(() => {
    void beginConditionalPasskeyAutofill()
  })
}

async function submitForgotPasswordEmail(): Promise<void> {
  abortConditionalPasskeySignIn()
  const em = email.value.trim()
  if (!em) {
    error.value = 'Zadajte email pre obnovenie hesla.'
    return
  }
  await sendForgotPasswordEmail(em)
}

async function handleForgotPassword(): Promise<void> {
  abortConditionalPasskeySignIn()
  infoMessage.value = null
  error.value = null
  const em = email.value.trim()
  if (!em) {
    forgotPasswordStep.value = 'email'
    return
  }
  await sendForgotPasswordEmail(em)
}

watch(loginCaptchaToken, () => {
  if (forgotPasswordStep.value === 'login') {
    void beginConditionalPasskeyAutofill()
  }
})

watch(forgotPasswordStep, (step) => {
  if (step !== 'login') {
    abortConditionalPasskeySignIn()
  }
  if (step !== 'email') {
    forgotCaptchaToken.value = ''
  }
})

onBeforeUnmount(() => {
  abortConditionalPasskeySignIn()
})

onMounted(async () => {
  const saved = readAuthRememberMePreference()
  if (saved !== null) {
    rememberMe.value = saved
  }
  const reason = route.query.reason
  if (reason === 'session_expired') {
    infoMessage.value = S.sessionExpiredMessage
  }
  if (reason === 'auth_callback_failed') {
    const errRaw = route.query.error
    const err = Array.isArray(errRaw) ? errRaw[0] : errRaw
    error.value =
      typeof err === 'string' && err.trim() ? err.trim() : S.loginPostAuthFailed
  }
  const passkeyErrRaw = route.query.passkey_err
  const passkeyErr = Array.isArray(passkeyErrRaw) ? passkeyErrRaw[0] : passkeyErrRaw
  if (typeof passkeyErr === 'string' && passkeyErr.trim()) {
    error.value = passkeyErr.trim()
  }
  await waitForAuthReady()
  if (isAuthRecoveryInUrl(route) && session.value?.access_token) {
    await navigateTo(AUTH_RESET_PASSWORD_PATH, { replace: true })
    return
  }
  if (user.value) {
    await navigateTo(getPostLoginPath(), { replace: true })
    return
  }
  // Passkey / OAuth may leave a Supabase session before BFF bootstrap — finish login instead of signing out.
  if (session.value?.access_token && !user.value && !isAuthRecoveryInUrl(route)) {
    const { data: s } = await supabase.auth.getSession()
    const supaSession = s.session
    if (supaSession?.access_token && supaSession.refresh_token) {
      setAuthLoginBootstrap(true)
      const ok = await syncSession({
        loginBootstrap: true,
        supabaseSession: supaSession,
      })
      setAuthLoginBootstrap(false)
      if (ok && user.value) {
        await navigateTo(getPostLoginPath(), { replace: true })
        return
      }
      error.value = S.loginPostAuthFailed
    }
    if (!useState(AUTH_LOGIN_BOOTSTRAP_KEY, () => false).value) {
      await signOut()
    }
  }
  if (!turnstileEnabled.value) {
    void beginConditionalPasskeyAutofill()
  }
})
</script>
