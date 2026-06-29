<template>
  <div>
    <div class="mb-8 rounded-[14px] border border-[#e5e7eb] bg-marketing-surface/80 px-4 py-4">
      <p class="m-0 mb-3 font-dmSans text-sm font-extrabold text-black">
        {{ S.settingsSecuritySummaryTitle }}
      </p>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="chip in summaryChips"
          :key="chip.key"
          class="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-dmSans text-xs font-semibold text-black/70 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
        >
          <span class="text-black/45">{{ chip.label }}</span>
          <span class="truncate text-black">{{ chip.value }}</span>
        </span>
      </div>
    </div>

    <div>
      <SettingsSection
        :title="S.settingsSecurityCredentialsSection"
        :description="S.settingsSecurityCredentialsDesc"
        icon="user"
        first
      >
        <SettingsSecurityEmailPassword
          ref="passwordSectionRef"
          :current-email="user?.email ?? ''"
          :new-email="newEmail"
          :email-saving="emailSaving"
          :email-msg="emailMsg"
          :email-err="emailErr"
          :requires-current-password="requiresCurrentPassword"
          :current-password="currentPassword"
          :new-password="newPassword"
          :confirm-password="confirmPassword"
          :password-saving="passwordSaving"
          :password-err="passwordErr"
          :password-captcha-token="passwordCaptchaToken"
          @update:new-email="newEmail = $event"
          @update:current-password="currentPassword = $event"
          @update:new-password="newPassword = $event"
          @update:confirm-password="confirmPassword = $event"
          @update:password-captcha-token="passwordCaptchaToken = $event"
          @save-email="handleEmailChange"
          @save-password="onPasswordChangeClick"
        />
      </SettingsSection>

      <SettingsSection
        :title="S.settingsSecuritySignInSection"
        :description="S.settingsSecuritySignInDesc"
        icon="settings"
      >
        <SettingsSecurityPasskeys
          :passkeys="passkeys"
          :passkey-saving="passkeySaving"
          :passkey-msg="passkeyMsg"
          :passkey-err="passkeyErr"
          :can-use="canUsePasskeys()"
          :format-date="formatPasskeyDate"
          :passkey-needs-totp-code="passkeyNeedsTotpCode"
          :passkey-totp-code="passkeyTotpCode"
          @update:passkey-totp-code="passkeyTotpCode = $event"
          @add="handleAddPasskey"
          @remove="handleRemovePasskey"
        />
        <SettingsSecurityTotp
          :totp-mode="totpMode"
          :totp-qr-data-url="totpQrDataUrl"
          :totp-verify-code="totpVerifyCode"
          :totp-busy="totpBusy"
          :totp-err="totpErr"
          :totp-msg="totpMsg"
          :totp-status-label="totpStatusLabel"
          :totp-status-class="totpStatusClass"
          @update:totp-verify-code="totpVerifyCode = $event"
          @start-enroll="startTotpEnroll"
          @confirm-enroll="confirmTotpEnroll"
          @restart-enroll="restartTotpEnroll"
          @disable="onDisableTotpClick"
          @confirm-disable="confirmDisableTotp"
          @cancel-disable="cancelDisableTotp"
        />
      </SettingsSection>

      <div class="border-t border-black/10 pt-6">
        <NuxtLink
          to="/nastavenia/zariadenia"
          class="inline-flex items-center gap-1.5 font-dmSans text-[14px] font-semibold text-marketing-green hover:underline"
        >
          {{ S.settingsSecurityDevicesLink }}
          <AppIcon name="chevron-right" :size="16" class="opacity-80" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// MFA TOTP, passkeys, password change — destructive actions use useConfirm; admin needs aal2 on API.
import type { Session } from '@supabase/supabase-js'
import { normalizePublicApiBase } from '~/utils/api-base-url'
import { ensureSupabaseAuthSession } from '~/utils/ensure-supabase-auth-session'
import {
  collectMfaFactors,
  elevateToAal2WithTotpCode,
  findTotpFactor,
} from '~/utils/mfa-aal2'
import { formatMfaAuthError } from '~/utils/mfa-auth-errors'
import { mapSupabaseResetError } from '~/utils/map-supabase-reset-error'
import { isCaptchaLoginError } from '~/utils/map-supabase-login-error'
import { S } from '~/utils/strings'
import { validatePassword } from '~/utils/validate-password'
type TotpUiMode = 'off' | 'enroll' | 'active' | 'disabling'

const supabase = useSupabase()
const { api } = useApi()
const { user, canUsePasskeys, passkeys, loadPasskeys, enrollPasskey, removePasskey, syncSession, refreshUser: refreshAuthUser, revokeAllSessionsEverywhere, signOut } = useAuth()
const { confirm } = useConfirm()
const { load } = useSettingsProfile()

const newEmail = ref('')
const emailSaving = ref(false)
const emailMsg = ref('')
const emailErr = ref('')

const currentPassword = ref('')
const requiresCurrentPassword = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const passwordSaving = ref(false)
const passwordErr = ref('')
const passwordCaptchaToken = ref('')
const passwordSectionRef = ref<{
  resetPasswordCaptcha?: () => void
  refreshPasswordCaptcha?: () => Promise<string | null>
} | null>(null)
const { turnstileEnabled, captchaRequiredMessage, supabaseCaptchaOptions } = useAuthCaptcha()

const TOTP_FRIENDLY_NAME = 'JOBBIE TOTP'

const totpQrDataUrl = ref('')
const totpPendingFactorId = ref<string | null>(null)
const totpVerifyCode = ref('')
const totpBusy = ref(false)
const totpErr = ref('')
const totpMsg = ref('')
const totpHasVerified = ref(false)
const totpDisableAwaitingCode = ref(false)

const totpMode = computed<TotpUiMode>(() => {
  if (totpDisableAwaitingCode.value) {
    return 'disabling'
  }
  if (totpHasVerified.value) {
    return 'active'
  }
  if (totpPendingFactorId.value) {
    return 'enroll'
  }
  return 'off'
})

const passkeySaving = ref(false)
const passkeyErr = ref('')
const passkeyMsg = ref('')
const passkeyNeedsTotpCode = ref(false)
const passkeyTotpCode = ref('')

const totpStatusLabel = computed(() => {
  if (totpHasVerified.value) {
    return S.settingsSecurityStatusOn
  }
  if (totpPendingFactorId.value) {
    return S.settingsSecurityStatusPending
  }
  return S.settingsSecurityStatusOff
})

const totpStatusClass = computed(() => {
  if (totpHasVerified.value) {
    return 'bg-marketing-mint text-marketing-green'
  }
  if (totpPendingFactorId.value) {
    return 'bg-amber-50 text-amber-900'
  }
  return 'bg-black/[0.06] text-black/50'
})

const summaryChips = computed(() => {
  const totpValue = totpHasVerified.value
    ? S.settingsSecurityStatusOn
    : totpPendingFactorId.value
      ? S.settingsSecurityStatusPending
      : S.settingsSecurityStatusOff
  return [
    {
      key: 'email',
      label: S.settingsEmailSection,
      value: user.value?.email?.trim() || '—',
    },
    {
      key: 'totp',
      label: S.settingsSecuritySummaryTotp,
      value: totpValue,
    },
    {
      key: 'passkeys',
      label: S.settingsSecuritySummaryPasskeys,
      value: String(passkeys.value.length),
    },
  ]
})

function clearTotpEnrollmentUi(): void {
  totpPendingFactorId.value = null
  totpQrDataUrl.value = ''
  totpVerifyCode.value = ''
}

function applyTotpQrFromEnroll(data: { totp?: { qr_code?: string | null } }): void {
  const qr = (data.totp?.qr_code ?? '').trim()
  totpQrDataUrl.value = qr.startsWith('data:') ? qr : `data:image/svg+xml;utf-8,${qr}`
}

async function unenrollTotpFactor(factorId: string): Promise<string | null> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) {
    return formatMfaAuthError(error.message)
  }
  return null
}

async function unenrollUnverifiedTotpIfAny(): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) {
    return formatMfaAuthError(error.message)
  }
  const unverified = findTotpFactor(collectMfaFactors(data), 'unverified')
  if (!unverified?.id) {
    return null
  }
  return unenrollTotpFactor(unverified.id)
}

function userHasEmailIdentity(session: Session | null): boolean {
  return Boolean(session?.user?.identities?.some((identity) => identity.provider === 'email'))
}

async function refreshCredentialPolicy(): Promise<void> {
  const ready = await ensureSupabaseAuthSession()
  if (!ready.ok || !ready.session) {
    requiresCurrentPassword.value = false
    return
  }
  requiresCurrentPassword.value = userHasEmailIdentity(ready.session)
}

async function reauthenticateWithPassword(password: string): Promise<string | null> {
  const ready = await ensureSupabaseAuthSession()
  const email = ready.session?.user?.email?.trim()
  if (!email) {
    return S.settingsSecurityReauthRequired
  }
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: supabaseCaptchaOptions(passwordCaptchaToken.value),
  })
  if (error) {
    return S.settingsCurrentPasswordWrong
  }
  return null
}

async function ensureCurrentPasswordForCredentialChange(): Promise<string | null> {
  if (!requiresCurrentPassword.value) {
    return null
  }
  if (!currentPassword.value) {
    return S.required
  }
  return reauthenticateWithPassword(currentPassword.value)
}

async function handleEmailChange(): Promise<void> {
  emailErr.value = ''
  emailMsg.value = ''
  const e = newEmail.value.trim()
  if (!e) {
    emailErr.value = S.required
    return
  }
  emailSaving.value = true
  try {
    const ready = await ensureSupabaseAuthSession()
    if (!ready.ok) {
      emailErr.value = ready.error ?? S.settingsSecurityReauthRequired
      return
    }
    const reauthErr = await ensureCurrentPasswordForCredentialChange()
    if (reauthErr) {
      emailErr.value = reauthErr
      return
    }
    const { error } = await supabase.auth.updateUser({ email: e })
    if (error) {
      emailErr.value = mapSupabaseResetError(error.code, error.message, 'settings')
      return
    }
    emailMsg.value = S.settingsEmailUpdated
    newEmail.value = ''
    currentPassword.value = ''
  } finally {
    emailSaving.value = false
  }
}

async function onPasswordChangeClick(): Promise<void> {
  passwordErr.value = ''
  if (newPassword.value !== confirmPassword.value) {
    passwordErr.value = S.settingsPasswordMismatch
    return
  }
  const passwordError = validatePassword(newPassword.value)
  if (passwordError) {
    passwordErr.value = passwordError
    return
  }
  const ok = await confirm({
    title: S.settingsSecurityPasswordConfirmTitle,
    message: S.settingsSecurityPasswordConfirmMessage,
    confirmDanger: true,
    confirmText: S.save,
    cancelText: S.cancel,
  })
  if (!ok) {
    return
  }
  await handlePasswordChange()
}

async function handlePasswordChange(): Promise<void> {
  passwordSaving.value = true
  try {
    let captchaForSupabase = ''
    if (turnstileEnabled.value) {
      const token = await passwordSectionRef.value?.refreshPasswordCaptcha?.()
      if (!token) {
        passwordErr.value = captchaRequiredMessage
        return
      }
      captchaForSupabase = token
      passwordCaptchaToken.value = token
    }
    const ready = await ensureSupabaseAuthSession()
    if (!ready.ok) {
      passwordErr.value = ready.error ?? S.settingsSecurityReauthRequired
      return
    }
    const reauthErr = await ensureCurrentPasswordForCredentialChange()
    if (reauthErr) {
      passwordErr.value = reauthErr
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword.value })
    if (error) {
      if (isCaptchaLoginError(error.code, error.message)) {
        passwordCaptchaToken.value = ''
        passwordSectionRef.value?.resetPasswordCaptcha?.()
      }
      passwordErr.value = mapSupabaseResetError(error.code, error.message, 'settings')
      return
    }
    await revokeAllSessionsEverywhere()
    await signOut()
    newPassword.value = ''
    confirmPassword.value = ''
    currentPassword.value = ''
    passwordCaptchaToken.value = ''
    await navigateTo('/auth/login', { replace: true })
  } finally {
    passwordSaving.value = false
  }
}

function formatPasskeyDate(iso: string | null): string {
  if (!iso) {
    return S.passkeyDateUnknown
  }
  try {
    return new Date(iso).toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return S.passkeyDateUnknown
  }
}

async function handleAddPasskey(): Promise<void> {
  passkeyErr.value = ''
  passkeyMsg.value = ''
  if (!canUsePasskeys()) {
    passkeyErr.value = S.passkeyNotSupported
    return
  }
  passkeySaving.value = true
  try {
    const result = await enrollPasskey({
      totpCode: passkeyNeedsTotpCode.value ? passkeyTotpCode.value : undefined,
    })
    if (!result.ok) {
      if (result.needsTotpCode) {
        passkeyNeedsTotpCode.value = true
      }
      passkeyErr.value = result.error ?? S.passkeyEnrollFailed
      return
    }
    passkeyNeedsTotpCode.value = false
    passkeyTotpCode.value = ''
    passkeyMsg.value = result.message ?? S.passkeyEnrollSuccess
    await loadPasskeys()
  } finally {
    passkeySaving.value = false
  }
}

async function handleRemovePasskey(factorId: string): Promise<void> {
  const ok = await confirm({
    title: S.settingsSecurityPasskeyRemoveTitle,
    message: S.settingsSecurityPasskeyRemoveMessage,
    confirmDanger: true,
    confirmText: S.remove,
  })
  if (!ok) {
    return
  }
  passkeyErr.value = ''
  passkeyMsg.value = ''
  passkeySaving.value = true
  try {
    const result = await removePasskey(factorId)
    if (!result.ok) {
      passkeyErr.value = result.error ?? S.passkeyRemoveFailed
      return
    }
    passkeyMsg.value = result.message ?? S.passkeyRemoveSuccess
    await loadPasskeys()
  } finally {
    passkeySaving.value = false
  }
}

async function refreshTotpState(): Promise<void> {
  const ready = await ensureSupabaseAuthSession()
  if (!ready.ok) {
    totpErr.value = ready.error ?? S.settingsSecuritySessionUnavailable
    return
  }
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) {
    totpErr.value = formatMfaAuthError(error.message)
    return
  }
  const factors = collectMfaFactors(data)
  const verified = findTotpFactor(factors, 'verified')
  const unverified = findTotpFactor(factors, 'unverified')

  totpHasVerified.value = Boolean(verified?.id)

  if (verified?.id) {
    if (!totpDisableAwaitingCode.value) {
      clearTotpEnrollmentUi()
    }
    return
  }

  if (unverified?.id) {
    totpPendingFactorId.value = unverified.id
    return
  }

  if (!totpBusy.value) {
    clearTotpEnrollmentUi()
  }
}

async function startTotpEnroll(): Promise<void> {
  totpErr.value = ''
  totpBusy.value = true
  try {
    const ready = await ensureSupabaseAuthSession()
    if (!ready.ok) {
      totpErr.value = ready.error ?? S.settingsSecurityReauthRequired
      return
    }
    const { data: listData, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError) {
      totpErr.value = formatMfaAuthError(listError.message)
      return
    }
    const factors = collectMfaFactors(listData)
    if (findTotpFactor(factors, 'verified')) {
      totpHasVerified.value = true
      clearTotpEnrollmentUi()
      return
    }

    const unenrollErr = await unenrollUnverifiedTotpIfAny()
    if (unenrollErr) {
      totpErr.value = unenrollErr
      return
    }
    clearTotpEnrollmentUi()

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: TOTP_FRIENDLY_NAME,
    })
    if (error || !data) {
      totpErr.value = formatMfaAuthError(error?.message)
      if (error?.message?.toLowerCase().includes('already exists')) {
        await refreshTotpState()
      }
      return
    }
    totpPendingFactorId.value = data.id
    applyTotpQrFromEnroll(data)
  } finally {
    totpBusy.value = false
  }
}

async function restartTotpEnroll(): Promise<void> {
  totpVerifyCode.value = ''
  await startTotpEnroll()
}

async function confirmTotpEnroll(): Promise<void> {
  const fid = totpPendingFactorId.value
  const code = totpVerifyCode.value.replace(/\s/g, '')
  if (!fid || !code) {
    return
  }
  totpBusy.value = true
  totpErr.value = ''
  try {
    const ready = await ensureSupabaseAuthSession()
    if (!ready.ok) {
      totpErr.value = ready.error ?? S.settingsSecurityReauthRequired
      return
    }
    const aalErr = await elevateToAal2WithTotpCode(supabase, fid, code)
    if (aalErr) {
      totpErr.value = aalErr
      return
    }
    clearTotpEnrollmentUi()
    await refreshTotpState()
    await syncSession()
  } finally {
    totpBusy.value = false
  }
}

function onDisableTotpClick(): void {
  totpErr.value = ''
  totpMsg.value = ''
  totpVerifyCode.value = ''
  totpDisableAwaitingCode.value = true
  nextTick(() => {
    document.getElementById('totp-disable-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    document.getElementById('security-totp-disable-otp')?.focus()
  })
}

function cancelDisableTotp(): void {
  totpDisableAwaitingCode.value = false
  totpVerifyCode.value = ''
  totpErr.value = ''
  totpMsg.value = ''
}

async function confirmDisableTotp(): Promise<void> {
  const code = totpVerifyCode.value.replace(/\s/g, '')
  if (code.length < 6) {
    totpErr.value = 'Zadajte 6-miestny kód z autentifikačnej aplikácie.'
    return
  }
  await disableTotp(code)
}

async function disableTotp(code: string): Promise<void> {
  const ready = await ensureSupabaseAuthSession()
  if (!ready.ok) {
    totpErr.value = ready.error ?? S.settingsSecurityReauthRequired
    return
  }
  const { data, error: listError } = await supabase.auth.mfa.listFactors()
  if (listError) {
    totpErr.value = formatMfaAuthError(listError.message)
    return
  }
  const factors = collectMfaFactors(data)
  const totp = findTotpFactor(factors, 'verified')
  if (!totp?.id) {
    totpErr.value = S.settingsSecurityTotpNotActive
    totpDisableAwaitingCode.value = false
    await refreshTotpState()
    return
  }
  totpBusy.value = true
  totpErr.value = ''
  totpMsg.value = ''
  try {
    const aalErr = await elevateToAal2WithTotpCode(supabase, totp.id, code, {
      requireFreshVerify: true,
    })
    if (aalErr) {
      totpErr.value = aalErr
      return
    }
    let unenrollErr = await unenrollTotpFactor(totp.id)
    if (unenrollErr?.toLowerCase().includes('aal')) {
      const retryAal = await elevateToAal2WithTotpCode(supabase, totp.id, code, {
        requireFreshVerify: true,
      })
      if (retryAal) {
        totpErr.value = retryAal
        return
      }
      unenrollErr = await unenrollTotpFactor(totp.id)
    }
    if (unenrollErr) {
      totpErr.value = unenrollErr
      return
    }
    await supabase.auth.refreshSession()
    totpDisableAwaitingCode.value = false
    totpVerifyCode.value = ''
    totpHasVerified.value = false
    totpErr.value = ''
    totpMsg.value = S.settingsSecurityTotpDisableSuccess
    clearTotpEnrollmentUi()
    await refreshTotpState()
    const config = useRuntimeConfig().public
    const base = normalizePublicApiBase(String(config.apiBaseUrl ?? ''))
    const { refreshBffSessionFromApi } = await import('~/utils/bff-session-refresh')
    await refreshBffSessionFromApi(base, { syncSupabase: true })
  } finally {
    totpBusy.value = false
  }
}

onMounted(async () => {
  await load()
  try {
    await refreshCredentialPolicy()
  } catch {
    /* non-fatal */
  }
  try {
    await refreshTotpState()
  } catch {
    /* non-fatal */
  }
  if (canUsePasskeys()) {
    try {
      await loadPasskeys()
    } catch {
      /* non-fatal */
    }
  }
})
</script>
