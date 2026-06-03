<template>
  <div class="app-shell min-h-screen">
    <div class="frame-surface overflow-x-hidden p-3">
      <div class="mx-auto w-full max-w-md text-center">
        <div class="jobbie-card space-y-4 p-4">
          <h2 class="text-lg font-extrabold tracking-tight" style="color: var(--ink)">{{ S.welcomeTitle }}</h2>
          <p v-if="name" class="text-sm" style="color: var(--ink2)">{{ S.welcomeGreeting }}, {{ name }}!</p>
          <p v-if="passkeyMessage" class="text-sm" :style="{ color: passkeyError ? '#dc2626' : 'var(--g500)' }">{{ passkeyMessage }}</p>
          <button
            v-if="canUsePasskeys()"
            type="button"
            class="btn-outline-green inline-flex w-full items-center justify-center disabled:opacity-50"
            :disabled="passkeyLoading"
            @click="handlePasskeyEnroll"
          >
            {{ passkeyLoading ? S.loading : S.passkeyEnrollCta }}
          </button>
          <NuxtLink
            :to="ROUTES.home"
            class="btn-green inline-flex w-full items-center justify-center"
            @click.prevent="handleEnter"
          >
            {{ S.enterTheApp }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { useAnalytics } from '~/composables/useAnalytics'

definePageMeta({ layout: 'app' })

const { session } = useAuth()
const { canUsePasskeys, enrollPasskey } = useAuth()
const { api } = useApi()
const { capture } = useAnalytics()
const name = ref<string | null>(null)
const passkeyLoading = ref(false)
const passkeyMessage = ref('')
const passkeyError = ref(false)

watchEffect(async () => {
  if (!session.value?.access_token) return
  const res = await api<{ display_name?: string | null; company_name?: string | null }>(
    '/api/profiles/me',
    { token: session.value.access_token }
  )
  if (res.ok && res.data) {
    const n = res.data.display_name?.trim() || res.data.company_name?.trim() || null
    name.value = n || null
  }
})
function handleEnter() {
  capture('registration_enter_app')
  navigateTo(ROUTES.home, { replace: true })
}

async function handlePasskeyEnroll(): Promise<void> {
  passkeyMessage.value = ''
  passkeyError.value = false
  passkeyLoading.value = true
  try {
    const result = await enrollPasskey()
    if (!result.ok) {
      passkeyError.value = true
      passkeyMessage.value = result.error ?? S.passkeyEnrollFailed
      return
    }
    passkeyMessage.value = result.message ?? S.passkeyEnrollSuccess
  } finally {
    passkeyLoading.value = false
  }
}
</script>
