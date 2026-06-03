<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminAuth } from '../composables/adminAuth'
import { adminApi } from '../composables/adminApi'
import { formatAdminApiError } from '../utils/format-admin-api-error'

const email = ref('')
const password = ref('')
const totpCode = ref('')
const needsMfa = ref(false)

const { signIn, signOut, ensureMfa, verifyTotp, loading, authError } = useAdminAuth()
const router = useRouter()
const route = useRoute()

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

async function finishLogin() {
  const ok = await verifyAdminOperator()
  if (!ok) return
  await router.replace((route.query.redirect as string) || '/overview')
}

async function submitLogin() {
  const ok = await signIn(email.value, password.value)
  if (!ok) return
  const mfa = await ensureMfa()
  if (mfa.ok) {
    await finishLogin()
    return
  }
  if (mfa.needsVerify) {
    needsMfa.value = true
  }
}

async function submitMfa() {
  const ok = await verifyTotp(totpCode.value)
  if (ok) {
    await finishLogin()
  }
}
</script>

<template>
  <div class="card" style="max-width: 420px; margin: 2rem auto">
    <h1 style="margin: 0 0 0.5rem; font-size: 1.25rem">JOBBIE Admin — prihlásenie</h1>
    <p style="color: var(--ink3); font-size: 0.875rem; margin: 0 0 1rem">
      Lokálna desktop aplikácia. Vyžaduje <code>app_role = admin</code> a TOTP (AAL2).
    </p>
    <template v-if="!needsMfa">
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
      <button
        type="button"
        class="btn btn-primary"
        :disabled="loading"
        @click="submitLogin"
      >
        Prihlásiť
      </button>
    </template>
    <template v-else>
      <p style="font-size: 0.875rem">Zadajte TOTP kód:</p>
      <input
        v-model="totpCode"
        inputmode="numeric"
        class="card"
        style="width: 100%; margin: 0.5rem 0; padding: 0.5rem"
        @keyup.enter="submitMfa"
      />
      <button type="button" class="btn btn-primary" @click="submitMfa">Overiť MFA</button>
    </template>
    <p v-if="authError" class="error" style="margin-top: 0.75rem">{{ authError }}</p>
  </div>
</template>
