<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
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
  <div class="flex min-h-screen items-center justify-center bg-slate-100 p-6">
    <Card class="w-full max-w-md shadow-md">
      <template #title>
        <div class="text-lg font-bold text-slate-900">JOBBIE Admin</div>
      </template>
      <template #subtitle>
        Lokálna desktop aplikácia. Vyžaduje <code>app_role = admin</code>.
      </template>
      <template #content>
        <div class="space-y-4">
          <Message v-if="configHint" severity="error" :closable="false">
            {{ configHint }}
          </Message>

          <div class="flex flex-col gap-2">
            <label for="login-email" class="text-sm font-medium text-slate-700">E-mail</label>
            <InputText
              id="login-email"
              v-model="email"
              type="email"
              class="w-full"
              autocomplete="username"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="login-password" class="text-sm font-medium text-slate-700">Heslo</label>
            <Password
              id="login-password"
              v-model="password"
              class="w-full"
              input-class="w-full"
              :feedback="false"
              toggle-mask
              autocomplete="current-password"
              @keyup.enter="submitLogin"
            />
          </div>

          <AdminTurnstileWidget
            v-if="showTurnstile"
            ref="turnstileRef"
            v-model="captchaToken"
          />

          <Button
            label="Prihlásiť"
            class="w-full"
            :loading="loading"
            @click="submitLogin"
          />

          <Message v-if="authError" severity="error" :closable="false">
            {{ authError }}
          </Message>

          <p v-if="isDev" class="m-0 text-xs text-slate-500">
            Supabase CAPTCHA: nastavte <code>VITE_TURNSTILE_SITE_KEY</code> v <code>app/.env</code>.
          </p>
        </div>
      </template>
    </Card>
  </div>
</template>
