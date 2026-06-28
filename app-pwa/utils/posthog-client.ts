import type { PostHog } from 'posthog-js'
import type { Router } from 'vue-router'
import { isAnalyticsConsentGranted } from '~/utils/cookie-consent-state'

/** Custom events that also start session replay (project triggers + client belt-and-suspenders). */
export const POSTHOG_SESSION_RECORDING_EVENTS = new Set([
  'checkout_started',
  'job_applied',
  'credits_purchased',
  'subscription_purchased',
])

export type PosthogPublicConfig = {
  posthogKey?: unknown
  posthogHost?: unknown
  posthogDefaults?: unknown
}

export type PosthogInitConfig = {
  key: string
  host: string
  defaults?: string
  router: Router
}

let posthogClient: PostHog | null = null
let posthogModule: typeof import('posthog-js').default | null = null
let posthogLoadPromise: Promise<typeof import('posthog-js').default> | null = null
let routerHookRegistered = false
let posthogShutdown = false

/** Pure config read for init and unit tests (no composables). */
export function readPosthogPublicConfig(
  publicConfig: PosthogPublicConfig,
): Omit<PosthogInitConfig, 'router'> | null {
  const key = typeof publicConfig.posthogKey === 'string' ? publicConfig.posthogKey.trim() : ''
  if (!key) {
    return null
  }
  const host =
    typeof publicConfig.posthogHost === 'string' && publicConfig.posthogHost.trim()
      ? publicConfig.posthogHost.trim()
      : 'https://eu.i.posthog.com'
  const defaultsRaw = publicConfig.posthogDefaults
  const defaults =
    typeof defaultsRaw === 'string' && defaultsRaw.trim() ? defaultsRaw.trim() : undefined
  return { key, host, defaults }
}

function loadPosthogModule(): Promise<typeof import('posthog-js').default> {
  if (!posthogLoadPromise) {
    posthogLoadPromise = import('posthog-js').then((m) => m.default)
  }
  return posthogLoadPromise
}

async function getPosthogSdk(): Promise<typeof import('posthog-js').default | null> {
  if (!import.meta.client || !isPosthogKeyConfigured()) {
    return null
  }
  if (!posthogModule) {
    posthogModule = await loadPosthogModule()
  }
  return posthogModule
}

export function isPosthogKeyConfigured(): boolean {
  return readPosthogPublicConfig(useRuntimeConfig().public) !== null
}

/** Capture Nuxt composables synchronously while still in plugin / event context. */
export function resolvePosthogInitConfig(): PosthogInitConfig | null {
  if (!import.meta.client || !isAnalyticsConsentGranted() || posthogShutdown) {
    return null
  }
  const base = readPosthogPublicConfig(useRuntimeConfig().public)
  if (!base) {
    return null
  }
  try {
    return { ...base, router: useRouter() }
  } catch {
    return null
  }
}

export function getPosthogClient(): PostHog | null {
  return posthogClient
}

export function isPosthogCapturing(): boolean {
  if (!import.meta.client || !posthogClient || !isPosthogKeyConfigured()) {
    return false
  }
  if (!isAnalyticsConsentGranted()) {
    return false
  }
  try {
    const sdk = posthogModule
    if (!sdk) {
      return false
    }
    return !sdk.has_opted_out_capturing()
  } catch {
    return false
  }
}

function buildInitOptions(
  sdk: typeof import('posthog-js').default,
  host: string,
  defaults?: string,
): NonNullable<Parameters<typeof sdk.init>[1]> {
  const initOptions: NonNullable<Parameters<typeof sdk.init>[1]> = {
    api_host: host,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: false,
    disable_surveys: true,
    advanced_disable_flags: true,
    opt_out_capturing_by_default: true,
    persistence: 'localStorage+cookie',
  }
  if (defaults !== undefined) {
    ;(initOptions as Record<string, unknown>).defaults = defaults
  }
  return initOptions
}

function captureCurrentPageview(client: PostHog, router: Router): void {
  const route = router.currentRoute.value
  client.capture('$pageview', {
    path: route.fullPath,
    name: typeof route.name === 'string' ? route.name : undefined,
  })
}

function registerRouterPageviews(client: PostHog, router: Router): void {
  if (!routerHookRegistered) {
    router.afterEach((to) => {
      if (!isPosthogCapturing()) {
        return
      }
      client.capture('$pageview', {
        path: to.fullPath,
        name: typeof to.name === 'string' ? to.name : undefined,
      })
    })
    routerHookRegistered = true
  }
  captureCurrentPageview(client, router)
}

function warnPosthogInitFailure(err: unknown): void {
  const detail = err instanceof Error ? err.message : String(err)
  console.warn('[jobbie] PostHog init failed:', detail)
}

/** Initialize PostHog when analytics consent is granted. Idempotent. */
export function initPosthogIfConsented(): PostHog | null {
  if (!import.meta.client || !isPosthogKeyConfigured() || !isAnalyticsConsentGranted()) {
    return null
  }
  posthogShutdown = false
  const config = resolvePosthogInitConfig()
  if (!config) {
    return null
  }
  void ensurePosthogInitialized(config).catch(warnPosthogInitFailure)
  return posthogClient
}

async function ensurePosthogInitialized(config: PosthogInitConfig): Promise<PostHog | null> {
  if (!import.meta.client || !isAnalyticsConsentGranted() || posthogShutdown) {
    return null
  }
  const sdk = await getPosthogSdk()
  if (!sdk) {
    return null
  }
  if (!isAnalyticsConsentGranted() || posthogShutdown) {
    return null
  }
  if (posthogClient) {
    try {
      sdk.opt_in_capturing()
    } catch {
      /* ignore */
    }
    return posthogClient
  }
  posthogClient = sdk.init(config.key, buildInitOptions(sdk, config.host, config.defaults))
  try {
    sdk.opt_in_capturing()
  } catch {
    /* ignore */
  }
  registerRouterPageviews(posthogClient, config.router)
  return posthogClient
}

function clearPosthogPersistence(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i)
      if (key?.startsWith('ph_') || key?.includes('posthog')) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : ''
    for (const part of document.cookie.split(';')) {
      const name = part.split('=')[0]?.trim()
      if (!name?.startsWith('ph_')) {
        continue
      }
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax${secure}`
    }
  } catch {
    /* ignore */
  }
}

/** Stop capture and clear PostHog client state (consent withdrawn). */
export function shutdownPosthog(): void {
  if (!import.meta.client) {
    return
  }
  posthogShutdown = true
  const sdk = posthogModule
  if (sdk) {
    try {
      if (typeof sdk.stopSessionRecording === 'function') {
        sdk.stopSessionRecording()
      }
      sdk.opt_out_capturing()
      sdk.reset()
    } catch {
      /* ignore */
    }
  }
  posthogClient = null
  clearPosthogPersistence()
}

/** Align PostHog with current cookie consent (call from consent callbacks). */
export function syncPosthogWithConsent(): void {
  if (!import.meta.client || !isPosthogKeyConfigured()) {
    return
  }
  if (isAnalyticsConsentGranted()) {
    posthogShutdown = false
    const config = resolvePosthogInitConfig()
    if (config) {
      void ensurePosthogInitialized(config).catch(warnPosthogInitFailure)
    }
  } else {
    shutdownPosthog()
  }
}

export function capturePosthogEvent(event: string, properties?: Record<string, unknown>): void {
  if (!import.meta.client || !isPosthogKeyConfigured() || !isAnalyticsConsentGranted()) {
    return
  }
  if (isPosthogCapturing() && posthogClient) {
    posthogClient.capture(event, properties)
    maybeStartSessionRecordingForEvent(event)
    return
  }
  const config = resolvePosthogInitConfig()
  if (!config) {
    return
  }
  void ensurePosthogInitialized(config)
    .then((client) => {
      if (!client || !isPosthogCapturing()) {
        return
      }
      client.capture(event, properties)
      maybeStartSessionRecordingForEvent(event)
    })
    .catch(warnPosthogInitFailure)
}

export function identifyPosthogUser(
  user: {
    id: string
    email: string
    role: string
    appRole: string
  },
  profile: {
    role: string
    customer_role: boolean
    worker_role: boolean
    provider_role: boolean
  } | null,
): void {
  if (!import.meta.client || !isPosthogKeyConfigured() || !isAnalyticsConsentGranted()) {
    return
  }
  const runIdentify = (): void => {
    if (!posthogClient || !isPosthogCapturing()) {
      return
    }
    const props: Record<string, unknown> = {
      role: user.role,
      app_role: user.appRole,
    }
    if (profile) {
      props.profile_role = profile.role
      props.customer_role = profile.customer_role
      props.worker_role = profile.worker_role
      props.provider_role = profile.provider_role
    }
    posthogClient.identify(user.id, props)
  }
  if (posthogClient) {
    runIdentify()
    return
  }
  const config = resolvePosthogInitConfig()
  if (!config) {
    return
  }
  void ensurePosthogInitialized(config)
    .then(() => {
      runIdentify()
    })
    .catch(warnPosthogInitFailure)
}

export function resetPosthog(): void {
  if (!import.meta.client || !isPosthogKeyConfigured()) {
    return
  }
  const sdk = posthogModule
  if (sdk) {
    sdk.reset()
  }
}

export function maybeStartSessionRecordingForEvent(event: string): void {
  if (!POSTHOG_SESSION_RECORDING_EVENTS.has(event) || !isPosthogCapturing()) {
    return
  }
  const sdk = posthogModule
  if (!sdk) {
    return
  }
  try {
    if (!sdk.sessionRecordingStarted()) {
      sdk.startSessionRecording()
    }
  } catch {
    /* ignore */
  }
}
