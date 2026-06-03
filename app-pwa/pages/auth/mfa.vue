<template>
  <div
    class="flex min-h-dvh items-center justify-center bg-marketing-mint px-5 py-10 font-dmSans text-black antialiased"
  >
    <div
      class="flex w-full max-w-[1020px] flex-col overflow-hidden rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.13)] min-[701px]:min-h-[620px] min-[701px]:flex-row"
    >
      <div
        class="relative hidden w-full flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,#15803d_0%,#22c55e_100%)] px-11 py-10 text-white before:pointer-events-none before:absolute before:-right-[100px] before:-top-20 before:size-[320px] before:rounded-full before:bg-white/[0.07] after:pointer-events-none after:absolute after:-left-[60px] after:bottom-10 after:size-[200px] after:rounded-full after:bg-white/[0.07] min-[701px]:flex min-[701px]:w-[42%] min-[701px]:px-11 min-[701px]:py-10"
      >
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
            Overenie účtu chráni tvoje dáta a prístup do Jobbie.
          </p>
        </div>
      </div>

      <div
        class="flex flex-1 flex-col justify-center bg-white px-7 py-10 min-[701px]:px-14 min-[701px]:py-[52px]"
      >
        <h1 class="m-0 text-4xl font-extrabold leading-[1.1] text-black">
          Dvojfaktorové <span class="text-marketing-green">overenie</span>
        </h1>
        <p class="mb-9 mt-2 text-[17px] font-normal leading-normal text-black/55">
          Zadaj 6-miestny kód z autentifikačnej aplikácie.
        </p>

        <p v-if="error" class="mb-4 text-sm text-red-600" role="alert">{{ error }}</p>

        <form class="contents" @submit.prevent="handleVerify">
          <div class="mb-7 flex flex-col gap-2">
            <label :class="fieldLabelClass" for="mfa-otp-digit-0">
              Kód z aplikácie
            </label>
            <AuthOtpDigitInput
              id="mfa-otp-digit-0"
              v-model="code"
              :disabled="loading || !totpFactorId || factorsLoading"
              @complete="handleVerify"
            />
          </div>

          <button
            type="submit"
            class="mb-4 h-14 w-full cursor-pointer rounded-full border-none bg-marketing-green text-lg font-bold text-white transition-opacity duration-200 hover:opacity-[0.88] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="loading || !totpFactorId || factorsLoading || code.length < 6"
          >
            {{ loading ? 'Načítava sa…' : 'Potvrdiť' }}
          </button>
        </form>

        <NuxtLink
          to="/auth/login"
          class="text-center text-base font-semibold text-marketing-green no-underline transition-opacity duration-150 hover:opacity-75"
        >
          Späť na prihlásenie
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { resolveSafeInternalPath } from '~/utils/safe-navigation'
import { formatMfaAuthError } from '~/utils/mfa-auth-errors'
import { formFieldLabelClass } from '~/utils/form-field-ui'

const fieldLabelClass = formFieldLabelClass

definePageMeta({ layout: 'app' })

const route = useRoute()
const supabase = useSupabase()
const { syncSession } = useAuth()
const code = ref('')
const loading = ref(false)
const factorsLoading = ref(true)
const error = ref<string | null>(null)
const totpFactorId = ref<string | null>(null)

function getRedirect(): string {
  const raw = route.query.redirect
  const s = Array.isArray(raw) ? raw[0] : raw
  return resolveSafeInternalPath(s, ROUTES.home)
}

onMounted(async () => {
  factorsLoading.value = true
  error.value = null
  try {
    const { data, error: e } = await supabase.auth.mfa.listFactors()
    if (e) {
      error.value = formatMfaAuthError(e.message)
      return
    }
    const factors = data?.all ?? []
    const totp = factors.find(
      (f: { factor_type?: string; status?: string }) =>
        f.factor_type === 'totp' && f.status === 'verified',
    ) as { id: string } | undefined
    totpFactorId.value = totp?.id ?? null
    if (!totpFactorId.value) {
      error.value = 'Pre účet nie je nastavené TOTP MFA.'
    }
  } finally {
    factorsLoading.value = false
  }
})

async function handleVerify(): Promise<void> {
  const fid = totpFactorId.value
  if (!fid || loading.value) return
  const c = code.value.replace(/\s/g, '')
  if (c.length < 6) {
    error.value = 'Zadajte 6-miestny kód.'
    return
  }
  loading.value = true
  error.value = null
  try {
    const ch = await supabase.auth.mfa.challenge({ factorId: fid })
    if (ch.error || !ch.data) {
      error.value = formatMfaAuthError(ch.error?.message) ?? 'Výzva MFA zlyhala.'
      return
    }
    const verify = await supabase.auth.mfa.verify({
      factorId: fid,
      challengeId: ch.data.id,
      code: c,
    })
    if (verify.error) {
      error.value = formatMfaAuthError(verify.error.message) ?? 'Nesprávny kód.'
      return
    }
    const { data: sess } = await supabase.auth.getSession()
    await syncSession({
      loginBootstrap: true,
      supabaseSession: sess.session,
    })
    if (sess.session?.access_token) {
      try {
        const { stepUp } = useBffSession()
        await stepUp(sess.session.access_token)
      } catch {
        /* step-up best-effort */
      }
    }
    await navigateTo(getRedirect(), { replace: true })
  } catch {
    error.value = 'Overenie zlyhalo.'
  } finally {
    loading.value = false
  }
}
</script>
