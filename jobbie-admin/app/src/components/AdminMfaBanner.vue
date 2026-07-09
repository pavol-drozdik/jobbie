<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Message from 'primevue/message'
import { useAdminAuth } from '../composables/adminAuth'
import { useAdminRecentLogin } from '../composables/useAdminRecentLogin'

const { recentLoginSec, warnBeforeSec, ensureAdminRecentLoginConfig } =
  useAdminRecentLogin()

const show = ref(false)
const minutesLeft = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function decodeJwtPayload(token: string): { auth_time?: number; iat?: number } | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as { auth_time?: number; iat?: number }
  } catch {
    return null
  }
}

function tick() {
  const { getAccessToken } = useAdminAuth()
  const token = getAccessToken()
  if (!token) {
    show.value = false
    return
  }
  const payload = decodeJwtPayload(token)
  const ts = payload?.auth_time ?? payload?.iat
  if (typeof ts !== 'number') {
    show.value = false
    return
  }
  const ageSec = Math.floor(Date.now() / 1000) - ts
  const remaining = recentLoginSec.value - ageSec
  if (remaining <= 0) {
    show.value = true
    minutesLeft.value = 0
    return
  }
  if (remaining <= warnBeforeSec.value) {
    show.value = true
    minutesLeft.value = Math.max(1, Math.ceil(remaining / 60))
    return
  }
  show.value = false
}

const message = computed(() => {
  if (minutesLeft.value <= 0) {
    return 'Platnosť nedávneho prihlásenia vypršala. Pre pozastavenie účtu, moderáciu alebo export auditu sa znova prihláste.'
  }
  return `Nedávne prihlásenie (step-up) vyprší o ~${minutesLeft.value} min. Citlivé akcie môžu zlyhať — pri potrebe sa znova prihláste.`
})

onMounted(() => {
  void ensureAdminRecentLoginConfig().then(() => {
    tick()
    timer = setInterval(tick, 30_000)
  })
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <Message
    v-if="show"
    severity="warn"
    :closable="false"
    class="!rounded-none !border-x-0 !border-t-0"
  >
    {{ message }}
  </Message>
</template>
