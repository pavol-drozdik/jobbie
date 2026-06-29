<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminAuth } from '../composables/adminAuth'
import { adminApi } from '../composables/adminApi'
import { formatAdminApiError } from '../utils/format-admin-api-error'
import AdminTurnstileWidget from '../components/AdminTurnstileWidget.vue'

const email = ref('')
const password = ref('')
const captchaToken = ref('')
const turnstileRef = ref<InstanceType<typeof AdminTurnstileWidget> | null>(null)
const captchaRequired = ref(false)

const turnstileSiteKey = computed(() =>
  String(import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim(),
)
const showTurnstile = computed(
  () => Boolean(turnstileSiteKey.value) || captchaRequired.value,
)

const { signIn, signOut, loading, authError, lastAuthErrorCode } = useAdminAuth()
const router = useRouter()
const route = useRoute()

const configHint = computed(() => {
  const apiUrl = import.meta.env.VITE_ADMIN_API_URL?.trim()
  if (!apiUrl) {
    return 'Nastavte VITE_ADMIN_API_URL=http://127.0.0.1:3099 v app/.env.'
  }
  if (captchaRequired.value && !turnstileSiteKey.value) {
    return 'Supabase vyžaduje CAPTCHA. Pridajte VITE_TURNSTILE_SITE_KEY do app/.env (rovnaký ako NUXT_PUBLIC_TURNSTILE_SITE_KEY v app-pwa/.env).'
  }
  return null
})

const isDev = import.meta.env.DEV

async function verifyAdminOperator(): Promise<boolean> {
  const res = await adminApi('/admin/overview')
  if (res.ok) {
    return true
  }
  const { message } = formatAdminApiError(res.status, res.body)
  authError.value = message
  await signOut()
  return false
}

function resetCaptcha(): void {
  turnstileRef.value?.reset()
  captchaToken.value = ''
}

async function submitLogin() {
  if (configHint.value) {
    authError.value = configHint.value
    return
  }
  if (showTurnstile.value && !captchaToken.value.trim()) {
    authError.value = 'Dokončite overenie CAPTCHA (Turnstile) pred prihlásením.'
    return
  }
  const ok = await signIn(email.value, password.value, captchaToken.value)
  if (!ok) {
    if (lastAuthErrorCode.value === 'captcha_failed') {
      captchaRequired.value = true
      resetCaptcha()
    }
    return
  }
  const verified = await verifyAdminOperator()
  if (!verified) return
  await router.replace((route.query.redirect as string) || '/overview')
}
</script>

<template>
  <div class="card" style="max-width: 420px; margin: 2rem auto">
    <h1 style="margin: 0 0 0.5rem; font-size: 1.25rem">JOBBIE Admin — prihlásenie</h1>
    <p style="color: var(--ink3); font-size: 0.875rem; margin: 0 0 1rem">
      Lokálna desktop aplikácia. Vyžaduje <code>app_role = admin</code>.
    </p>
    <p v-if="configHint" class="error" style="font-size: 0.875rem; margin: 0 0 1rem">
      {{ configHint }}
    </p>
    <label style="display: block; font-size: 0.875rem; font-weight: 600">E-mail</label>
    <input
      v-model="email"
      type="email"
      class="card"
      style="width: 100%; margin: 0.25rem 0 0.75rem; padding: 0.5rem"
    />
    <label style="display: block; font-size: 0.875rem; font-weight: 600">Heslo</label>
    <input
      v-model="password"
      type="password"
      class="card"
      style="width: 100%; margin: 0.25rem 0 0.75rem; padding: 0.5rem"
      @keyup.enter="submitLogin"
    />
    <AdminTurnstileWidget
      v-if="showTurnstile"
      ref="turnstileRef"
      v-model="captchaToken"
    />
    <button
      type="button"
      class="btn btn-primary"
      :disabled="loading"
      @click="submitLogin"
    >
      Prihlásiť
    </button>
    <p v-if="authError" class="error" style="margin-top: 0.75rem">{{ authError }}</p>
    <p v-if="isDev" style="color: var(--ink3); font-size: 0.75rem; margin-top: 0.5rem">
      Supabase CAPTCHA: nastavte <code>VITE_TURNSTILE_SITE_KEY</code> v <code>app/.env</code>.
    </p>
  </div>
</template>
