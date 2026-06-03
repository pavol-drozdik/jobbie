<template>
  <div class="app-shell flex min-h-screen items-center justify-center p-4">
    <p class="text-sm" style="color: var(--ink3)">{{ S.loading }}</p>
  </div>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { AUTH_RESET_PASSWORD_PATH } from '~/utils/auth-recovery'
import { resolveSafeInternalPath } from '~/utils/safe-navigation'

definePageMeta({ layout: 'app' })

const supabase = useSupabase()
const route = useRoute()
const { syncSession } = useAuth()

function resolveRedirectPath(): string {
  const raw = route.query.redirect
  const s = Array.isArray(raw) ? raw[0] : raw
  const path = resolveSafeInternalPath(s, ROUTES.home)
  if (path === AUTH_RESET_PASSWORD_PATH || path.startsWith(`${AUTH_RESET_PASSWORD_PATH}?`)) {
    return AUTH_RESET_PASSWORD_PATH
  }
  return path
}

function stripOAuthCallbackParamsFromUrl(): void {
  if (!import.meta.client || typeof window === 'undefined') return
  const url = new URL(window.location.href)
  const keys = ['code', 'state', 'error', 'error_description', 'error_code']
  let changed = false
  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (!changed) return
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', next)
}

onMounted(async () => {
  const code = route.query.code
  const codeStr = Array.isArray(code) ? code[0] : code
  if (typeof codeStr === 'string' && codeStr.trim()) {
    await supabase.auth.exchangeCodeForSession(codeStr)
  }
  await supabase.auth.getSession()
  await syncSession()
  const path = resolveRedirectPath()
  stripOAuthCallbackParamsFromUrl()
  await navigateTo(path, { replace: true })
})
</script>
