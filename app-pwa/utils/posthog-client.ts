import type { PostHog } from 'posthog-js'
import { isAnalyticsConsentGranted } from '~/utils/cookie-consent-state'

/** Custom events that also start session replay (project triggers + client belt-and-suspenders). */
export const POSTHOG_SESSION_RECORDING_EVENTS = new Set([
  'checkout_started',
  'job_applied',
  'credits_purchased',
  'subscription_purchased',
])

let posthogClient: PostHog | null = null
let posthogModule: typeof import('posthog-js').default | null = null
let posthogLoadPromise: Promise<typeof import('posthog-js').default> | null = null
let routerHookRegistered = false

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
  const config = useRuntimeConfig().public
  const key = typeof config.posthogKey === 'string' ? config.posthogKey.trim() : ''
  return key.length > 0
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

function captureCurrentPageview(client: PostHog): void {
  const router = useRouter()
  const route = router.currentRoute.value
  client.capture('$pageview', {
    path: route.fullPath,
    name: typeof route.name === 'string' ? route.name : undefined,
  })
}

function registerRouterPageviews(client: PostHog): void {
  const router = useRouter()
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
  captureCurrentPageview(client)
}

/** Initialize PostHog when analytics consent is granted. Idempotent. */
export function initPosthogIfConsented(): PostHog | null {
  if (!import.meta.client || !isPosthogKeyConfigured() || !isAnalyticsConsentGranted()) {
    return null
  }
  void ensurePosthogInitialized()
  return posthogClient
}

async function ensurePosthogInitialized(): Promise<PostHog | null> {
  if (!import.meta.client || !isPosthogKeyConfigured() || !isAnalyticsConsentGranted()) {
    return null
  }
  const sdk = await getPosthogSdk()
  if (!sdk) {
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
  const runtimeConfig = useRuntimeConfig()
  const key = (runtimeConfig.public.posthogKey as string).trim()
  const host =
    typeof runtimeConfig.public.posthogHost === 'string' &&
    runtimeConfig.public.posthogHost.trim()
      ? runtimeConfig.public.posthogHost.trim()
      : 'https://eu.i.posthog.com'
  const defaultsRaw = runtimeConfig.public.posthogDefaults
  const defaults =
    typeof defaultsRaw === 'string' && defaultsRaw.trim() ? defaultsRaw.trim() : undefined
  posthogClient = sdk.init(key, buildInitOptions(sdk, host, defaults))
  try {
    sdk.opt_in_capturing()
  } catch {
    /* ignore */
  }
  registerRouterPageviews(posthogClient)
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
    for (const part of document.cookie.split(';')) {
      const name = part.split('=')[0]?.trim()
      if (!name?.startsWith('ph_')) {
        continue
      }
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`
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
  const sdk = posthogModule
  if (sdk) {
    try {
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
    void ensurePosthogInitialized()
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
  void ensurePosthogInitialized().then((client) => {
    if (!client || !isPosthogCapturing()) {
      return
    }
    client.capture(event, properties)
    maybeStartSessionRecordingForEvent(event)
  })
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
  void ensurePosthogInitialized().then(() => {
    runIdentify()
  })
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
