// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import { visualizer } from 'rollup-plugin-visualizer'
import {
  BRAND_APPLE_TOUCH_ICON_PATH,
  BRAND_FAVICON_48_PATH,
  BRAND_FAVICON_ICO_PATH,
  BRAND_FAVICON_PATH,
  BRAND_ICON_192_PATH,
  BRAND_ICON_512_PATH,
  BRAND_THEME_COLOR,
} from './utils/brand-assets'
import {
  parseAllowIndexing,
  normalizeSiteUrl,
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_TITLE,
  SEO_DEFAULT_OG_IMAGE_PATH,
} from './utils/seo-config'
import {
  SEO_NOINDEX_ROUTE_PATTERNS,
  SEO_PUBLIC_SSR_ROUTE_PATTERNS,
} from './utils/seo-route-policy'

const cvDocumentDir = fileURLToPath(new URL('../backend-ts/src/cv/document', import.meta.url))
const cvPaginationNodePath = fileURLToPath(
  new URL('../backend-ts/src/cv/document/cv-document-pagination.node.ts', import.meta.url),
)
const cvPaginationBrowserStub = fileURLToPath(
  new URL('./utils/cv-document-pagination.browser-stub.ts', import.meta.url),
)

const stripePublishableKey = process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
if (stripePublishableKey && !stripePublishableKey.startsWith('pk_')) {
  throw new Error('NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a Stripe publishable key (pk_)')
}

const allowIndexing = parseAllowIndexing(process.env.NUXT_PUBLIC_ALLOW_INDEXING)
const siteUrl = normalizeSiteUrl(process.env.NUXT_PUBLIC_SITE_URL)
const isCapacitorBuild = process.env.NUXT_PUBLIC_CAPACITOR_BUILD === '1'
const analyzeBundle = process.env.ANALYZE === '1' || process.env.ANALYZE === 'true'

function supabaseImageHosts(): string[] {
  const raw = process.env.NUXT_PUBLIC_SUPABASE_URL?.trim()
  if (!raw) return []
  try {
    return [new URL(raw).hostname]
  } catch {
    return []
  }
}

function buildPreconnectLinks(): Array<{
  rel: string
  href: string
  crossorigin?: '' | 'anonymous' | 'use-credentials'
}> {
  const links: Array<{
    rel: string
    href: string
    crossorigin?: '' | 'anonymous' | 'use-credentials'
  }> = []
  const seen = new Set<string>()

  function addOrigin(raw: string | undefined): void {
    const trimmed = raw?.trim()
    if (!trimmed) return
    try {
      const origin = new URL(trimmed).origin
      if (!origin.startsWith('https://') || seen.has(origin)) return
      seen.add(origin)
      links.push({ rel: 'preconnect', href: origin, crossorigin: 'anonymous' })
    } catch {
      /* ignore invalid URL */
    }
  }

  addOrigin(normalizePublicApiBase(process.env.NUXT_PUBLIC_API_BASE_URL))
  addOrigin(process.env.NUXT_PUBLIC_SUPABASE_URL)
  const cdn = process.env.NUXT_PUBLIC_CDN_URL?.trim()
  if (cdn) addOrigin(cdn)

  return links.slice(0, 3)
}

import { normalizePublicApiBase } from './utils/api-base-url'
import {
  PRIVATE_DOCUMENT_CACHE_HEADERS,
  PUBLIC_DOCUMENT_CACHE_HEADERS,
} from './utils/cache-route-policy'

/** Long-cache hashed assets; security headers come from `security-headers` middleware. */
const STATIC_ASSET_CACHE_HEADERS = {
  'cache-control': 'public, max-age=31536000, immutable',
} as const

function buildSeoRouteRules(): Record<string, object> {
  const rules: Record<string, object> = {
    '/_nuxt/**': {
      headers: { ...STATIC_ASSET_CACHE_HEADERS },
    },
    '/_ipx/**': {
      headers: { ...STATIC_ASSET_CACHE_HEADERS },
    },
    '/assets/**': {
      headers: { ...STATIC_ASSET_CACHE_HEADERS },
    },
    '/fonts/**': {
      headers: { ...STATIC_ASSET_CACHE_HEADERS },
    },
    '/app/profile/settings': { redirect: { to: '/nastavenia', statusCode: 301 } },
    '/nastavenia/sukromie': { redirect: { to: '/nastavenia/profil', statusCode: 301 } },
    '/cennik/kredity': { redirect: { to: '/cennik', statusCode: 301 } },
    '/app/plans': { redirect: { to: '/cennik?tab=plans', statusCode: 301 } },
    '/app/plans/**': { redirect: { to: '/cennik?tab=plans', statusCode: 301 } },
    '/faq': { redirect: { to: '/', statusCode: 301 } },
    '/casto-kladene-otazky': { redirect: { to: '/', statusCode: 301 } },
    '/o-nas': { redirect: { to: '/', statusCode: 301 } },
    '/kontakt': { redirect: { to: '/', statusCode: 301 } },
    '/app/jobs/**': { redirect: { to: '/ponuka/**', statusCode: 301 } },
    '/auth/signin': { redirect: { to: '/auth/login', statusCode: 301 } },
    '/auth/signup': { redirect: { to: '/auth/register', statusCode: 301 } },
    '/dashboard/poskytovatel': { redirect: { to: '/dashboard/profesional', statusCode: 301 } },
    '/nastavenia/**': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/chat/**': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/spravca-uchadzacov/**': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/dashboard/**': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/platba': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/platba/**': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/profil': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/auth/**': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/zivotopisy/**': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/zivotopisy': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/moje-reklamy/**': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/vytvorit-ponuku/**': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/vytvorit-zahranicnu-ponuku/**': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/messages/**': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/unsubscribe/**': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/preferences/**': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
    '/app/**': { headers: { ...PRIVATE_DOCUMENT_CACHE_HEADERS } },
  }
  if (!allowIndexing) {
    rules['/**'] = {
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
    return rules
  }
  // Platform security headers (CSP, X-Frame-Options, HSTS, …) are set once in
  // `server/middleware/security-headers.ts`. Route rules here only add per-route
  // cache, robots, or SSR flags — never duplicate security headers.
  for (const pattern of SEO_PUBLIC_SSR_ROUTE_PATTERNS) {
    const robots =
      pattern === '/databaza-zivotopisov'
        ? 'noindex, nofollow'
        : 'index, follow'
    rules[pattern] = {
      ssr: true,
      headers: {
        ...PUBLIC_DOCUMENT_CACHE_HEADERS,
        'X-Robots-Tag': robots,
      },
    }
  }
  for (const pattern of SEO_NOINDEX_ROUTE_PATTERNS) {
    if (rules[pattern]) {
      const prev = rules[pattern] as { headers?: Record<string, string> }
      rules[pattern] = {
        ...prev,
        ssr: false,
        headers: {
          ...(prev.headers ?? {}),
          ...PRIVATE_DOCUMENT_CACHE_HEADERS,
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
      continue
    }
    rules[pattern] = {
      ssr: false,
      headers: {
        ...PRIVATE_DOCUMENT_CACHE_HEADERS,
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
  }
  return rules
}

export default defineNuxtConfig({
  hooks: {
    listen(_server, listener) {
      if (listener.dev) {
        console.info(
          '[JOBBIE] PWA dev server ready — start Nest API (backend-ts, port 8000) before login/API calls.',
        )
      }
    },
  },
  components: [
    '~/components',
    { path: '~/components/ui', pathPrefix: false },
    { path: '~/components/consent', pathPrefix: false },
    { path: '~/components/marketing', pathPrefix: false },
  ],
  /**
   * Default CSR for the logged-in PWA. When `NUXT_PUBLIC_ALLOW_INDEXING` is set,
   * SSR is enabled globally and public marketing routes opt in via `routeRules`.
   */
  ssr: allowIndexing,
  app: {
    /** Production: set NUXT_PUBLIC_CDN_URL (origin only); Nuxt prefixes `_nuxt` assets. */
    cdnURL: (() => {
      const raw = process.env.NUXT_PUBLIC_CDN_URL?.trim()
      if (!raw) return ''
      return raw.endsWith('/') ? raw : `${raw}/`
    })(),
    head: {
      htmlAttrs: { lang: 'sk' },
      title: SEO_DEFAULT_TITLE,
      titleTemplate: '%s — JOBBIE',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'referrer', content: 'strict-origin-when-cross-origin' },
        { name: 'description', content: SEO_DEFAULT_DESCRIPTION },
        ...(allowIndexing
          ? [{ name: 'robots', content: 'index, follow' }]
          : [{ name: 'robots', content: 'noindex, nofollow' }]),
        ...(process.env.NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim()
          ? [
              {
                name: 'google-site-verification',
                content: process.env.NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION.trim(),
              },
            ]
          : []),
        ...(process.env.NUXT_PUBLIC_BING_SITE_VERIFICATION?.trim()
          ? [
              {
                name: 'msvalidate.01',
                content: process.env.NUXT_PUBLIC_BING_SITE_VERIFICATION.trim(),
              },
            ]
          : []),
        { property: 'og:site_name', content: 'JOBBIE' },
        { property: 'og:locale', content: 'sk_SK' },
        { property: 'og:image', content: SEO_DEFAULT_OG_IMAGE_PATH },
        { name: 'twitter:card', content: 'summary_large_image' },
        ...(isCapacitorBuild
          ? [
              {
                'http-equiv': 'Content-Security-Policy',
                content:
                  "default-src 'self' capacitor: ionic: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; frame-src https://js.stripe.com https://hooks.stripe.com;",
              },
            ]
          : []),
      ],
      link: [
        // PNG/ICO first — Google Search favicon crawler prefers ≥48px raster icons over SVG.
        { rel: 'icon', href: BRAND_FAVICON_ICO_PATH, sizes: '48x48' },
        { rel: 'icon', type: 'image/png', href: BRAND_FAVICON_48_PATH, sizes: '48x48' },
        { rel: 'icon', type: 'image/svg+xml', href: BRAND_FAVICON_PATH },
        { rel: 'apple-touch-icon', href: BRAND_APPLE_TOUCH_ICON_PATH },
        { rel: 'privacy-policy', href: '/ochrana-osobnych-udajov' },
        {
          rel: 'preload',
          href: '/fonts/dm-sans-latin-ext-wght-normal.woff2',
          as: 'font',
          type: 'font/woff2',
          crossorigin: 'anonymous',
        },
        {
          rel: 'preload',
          href: '/fonts/dm-sans-latin-wght-normal.woff2',
          as: 'font',
          type: 'font/woff2',
          crossorigin: 'anonymous',
        },
        ...buildPreconnectLinks(),
      ],
    },
  },
  devtools: { enabled: false },
  experimental: {
    /**
     * Must be false for production hybrid-SSR builds (allowIndexing = true).
     * Vite's Environment API + hybrid SSR (global ssr:true but private routes
     * have ssr:false via routeRules) breaks Vue Router's dynamic route component
     * registry — /blog/:slug, /ponuka/:id etc resolve to undefined, causing 500.
     * For CSR-only builds (allowIndexing = false, staging) the value is true
     * so the server environment is still built correctly for local dev.
     */
    viteEnvironmentApi: !allowIndexing,
    /** Vite preload chunk errors → reload; Vue Router lazy-route errors in `0.chunk-reload.client.ts`. */
    emitRouteChunkError: 'automatic-immediate',
  },
  compatibilityDate: '2025-03-16',
  devServer: {
    port: 3001,
  },
  runtimeConfig: {
    public: {
      /** Same origin as `app.cdnURL` for runtime checks / meta */
      cdnUrl: process.env.NUXT_PUBLIC_CDN_URL || '',
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
      stripePublishableKey,
      turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || '',
      /** Set to 1 to send sampled nav/click/submit batches to the API */
      auditClientEvents: process.env.NUXT_PUBLIC_AUDIT_CLIENT_EVENTS || '',
      /** Client telemetry: nav sample rate 0..1 (default 0.4 if unset when audit enabled) */
      auditClientSampleRate: process.env.NUXT_PUBLIC_AUDIT_CLIENT_SAMPLE_RATE || '',
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || '',
      sentryEnvironment: process.env.NUXT_PUBLIC_SENTRY_ENVIRONMENT || '',
      sentryTracesSampleRate: process.env.NUXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0',
      posthogKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || '',
      posthogHost: process.env.NUXT_PUBLIC_POSTHOG_HOST || '',
      /** Optional PostHog config version string (see PostHog Nuxt docs). */
      posthogDefaults: process.env.NUXT_PUBLIC_POSTHOG_DEFAULTS || '',
      /** Google Tag Manager container ID (GTM-…). GA4/Clarity tags live in the container; consent-gated load. */
      gtmContainerId: process.env.NUXT_PUBLIC_GTM_CONTAINER_ID || '',
      /** Sample rate 0..1 for Core Web Vitals beacon (0 = off). */
      webVitalsSampleRate: process.env.NUXT_PUBLIC_WEB_VITALS_SAMPLE_RATE || '0',
      /** Canonical site origin (no trailing slash), e.g. https://jobbie.sk — overridable via NUXT_PUBLIC_SITE_URL */
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || '',
      /** Set to 1 on production only (NUXT_PUBLIC_ALLOW_INDEXING). */
      allowIndexing: process.env.NUXT_PUBLIC_ALLOW_INDEXING || '',
      /** Set to 1 after legal counsel review — enables indexing of terms/privacy pages. */
      legalPublished: process.env.NUXT_PUBLIC_LEGAL_PUBLISHED || '',
      brandName: process.env.NUXT_PUBLIC_BRAND_NAME || 'JOBBIE',
      brandAlternateName: process.env.NUXT_PUBLIC_BRAND_ALTERNATE_NAME || 'Jobbie',
      supportEmail: process.env.NUXT_PUBLIC_SUPPORT_EMAIL || 'ahoj@jobbie.sk',
      supportPhone: process.env.NUXT_PUBLIC_SUPPORT_PHONE || '',
      socialInstagramUrl: process.env.NUXT_PUBLIC_SOCIAL_INSTAGRAM_URL || '',
      socialFacebookUrl: process.env.NUXT_PUBLIC_SOCIAL_FACEBOOK_URL || '',
      googleSiteVerification: process.env.NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
      bingSiteVerification: process.env.NUXT_PUBLIC_BING_SITE_VERIFICATION || '',
      indexNowKey: process.env.NUXT_PUBLIC_INDEXNOW_KEY || '',
    },
  },
  modules: [
    './modules/dev-stable',
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    '@vite-pwa/nuxt',
  ],
  /** Tailwind config viewer (`/_tailwind`) can ECONNRESET and fork-restart `nuxt dev` on Windows. */
  tailwindcss: {
    viewer: false,
  },
  css: ['~/assets/css/main.css'],
  /** Hashed build assets: long cache when served by Nitro or mirrored CDN. */
  nitro: {
    /**
     * Do not set `nitro.preset` here: forcing `node-server` breaks `nuxt generate`
     * (HTML gets `/@vite/client` + `C:/.../entry.js`). `nuxt build` still defaults to
     * `node-server` for `.output/server`.
     *
     * Disable link crawling so we do not prerender every route as HTML on Windows
     * (that path once produced the same broken dev-only asset URLs).
     */
    prerender: {
      crawlLinks: false,
      // NOTE: Do NOT prerender dynamic list pages (jobs/ads/blog catalogs). Prerendering
      // freezes the build-time API response (often empty if the build runner can't reach the
      // API) into static HTML, so normal loads hydrate an empty list and never refetch —
      // results only appear after a hard refresh that hits live SSR. These routes keep
      // `ssr: true` via routeRules, so they're rendered live with fresh data on each request.
      routes: allowIndexing
        ? [
            '/',
            '/bezpecnost',
            '/cennik',
            '/vseobecne-podmienky',
            '/ochrana-osobnych-udajov',
          ]
        : [],
    },
    routeRules: buildSeoRouteRules(),
    devProxy: {
      '/api': {
        target: normalizePublicApiBase(process.env.NUXT_PUBLIC_API_BASE_URL),
        changeOrigin: true,
      },
    },
  },
  image: {
    format: ['webp', 'avif'],
    quality: 82,
    domains: supabaseImageHosts(),
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
  /**
   * PWA: `autoUpdate` activates a new service worker and reloads clients when an
   * update is found; browsers often check on tab focus, which caused a brief full
   * reload (auth boot / blank flash). `prompt` defers reload until the user
   * confirms via the banner in `app.vue`.
   *
   * To confirm a document reload vs in-app skeleton: DevTools → Network → Doc,
   * enable Preserve log, switch tabs and return; a new document request indicates
   * a real reload. `performance.getEntriesByType('navigation')[0]?.type` shows
   * `reload` vs `navigate`.
   */
  pwa: {
    /** Custom SW: precache + Web Push `push` / `notificationclick` handlers. */
    strategies: 'injectManifest',
    srcDir: 'service-worker',
    filename: 'sw.ts',
    registerType: 'prompt',
    /**
     * Web Push needs an active service worker. With `false`, local `nuxt dev`
     * never registers the SW and push subscribe always fails after timeout.
     */
    /** Off in dev — SW + proxy races caused ECONNRESET and `nuxt dev` restart loops. */
    devOptions: {
      enabled: false,
    },
    manifest: {
      name: 'JOBBIE',
      short_name: 'JOBBIE',
      description: 'Brigády a pracovné ponuky na Slovensku aj v zahraničí.',
      theme_color: BRAND_THEME_COLOR,
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: BRAND_ICON_192_PATH, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: BRAND_ICON_512_PATH, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: BRAND_FAVICON_PATH, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      ],
    },
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,png,ico,svg}'],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      globIgnores: [
        /** Hashed route chunks change every build; precaching them in an old SW causes stale imports after deploy. */
        '**/_nuxt/**',
        '**/home-design/feature-*.webp',
        '**/home-design/*-illustration.png',
        '**/home-design/jobbie-def-thumb.webp',
        '**/home-design/hero-*.png',
        '**/home-design/perspective.png',
        '**/pdf.worker*.js',
        '**/pdf.worker*.mjs',
        '**/img/9061-01-iphone-*.png',
      ],
    },
  },
  /**
   * Ignore build output dirs so `nuxt generate` / `nuxt build` while `nuxt dev` is running
   * does not trigger endless Nitro restarts and eventual heap OOM (~4GB default limit).
   */
  watchers: {
    chokidar: {
      ignored: [
        '**/.output/**',
        '**/.nuxt/**',
        '**/dist/**',
        '**/127.0.0.1/**',
      ],
    },
  },
  alias: {
    '#cv-document': cvDocumentDir,
  },
  vite: {
    server: {
      proxy: {
        '/api': {
          target: normalizePublicApiBase(process.env.NUXT_PUBLIC_API_BASE_URL),
          changeOrigin: true,
        },
        '/socket.io': {
          target: normalizePublicApiBase(process.env.NUXT_PUBLIC_API_BASE_URL),
          ws: true,
          changeOrigin: true,
        },
      },
      watch: {
        ignored: [
          '**/.output/**',
          '**/.nuxt/**',
          '**/dist/**',
          '**/127.0.0.1/**',
          '**/../backend-ts/**',
        ],
      },
    },
    resolve: {
      alias: {
        '#cv-document': cvDocumentDir,
        [cvPaginationNodePath]: cvPaginationBrowserStub,
      },
    },
    plugins: analyzeBundle
      ? [
          visualizer({
            filename: 'stats/bundle-stats.html',
            gzipSize: true,
            brotliSize: true,
            open: false,
          }),
        ]
      : [],
  },
})
