/** Row in the cookie preferences inventory table (SK copy in strings). */
export interface CookieInventoryRow {
  name: string
  domain: string
  expiry: string
  path: string
  description: string
}

export interface CookieInventoryContext {
  siteHost: string
}

function hostLabel(ctx: CookieInventoryContext): string {
  return ctx.siteHost || 'jobbie.sk'
}

/** Nevyhnutné cookies — always active. */
export function buildNecessaryCookieRows(ctx: CookieInventoryContext): CookieInventoryRow[] {
  const host = hostLabel(ctx)
  return [
    {
      name: 'jb_consent',
      domain: host,
      expiry: '6 mesiacov',
      path: '/',
      description:
        'Ukladá stav súhlasu používateľa s používaním cookies na tomto webe.',
    },
    {
      name: 'jb_sid',
      domain: host,
      expiry: '30 dní',
      path: '/api',
      description: 'Identifikátor prihlásenej relácie (BFF) na serveri API.',
    },
    {
      name: 'jb_at',
      domain: host,
      expiry: '1 hodina',
      path: '/',
      description:
        'Krátkodobý prístupový token prihlásenia (HttpOnly). Obnovuje sa pri aktívnej relácii.',
    },
    {
      name: 'jb_rt',
      domain: host,
      expiry: '30 dní',
      path: '/api',
      description: 'Obnovovací token relácie (HttpOnly) na bezpečné predĺženie prihlásenia.',
    },
    {
      name: 'jb_csrf',
      domain: host,
      expiry: '30 dní',
      path: '/api',
      description:
        'Ochrana proti CSRF útokom pri zmene údajov cez API (odosielané v hlavičke X-CSRF-Token).',
    },
    {
      name: 'cf_clearance',
      domain: 'challenges.cloudflare.com',
      expiry: 'Relácia',
      path: '/',
      description:
        'Cloudflare Turnstile — overenie proti botom pri registrácii alebo prihlásení (ak je zapnuté).',
    },
  ]
}

/** Analytické cookies — len po súhlase. */
export function buildAnalyticsCookieRows(ctx: CookieInventoryContext): CookieInventoryRow[] {
  const host = hostLabel(ctx)
  return [
    {
      name: '_ga',
      domain: `.${host}`,
      expiry: '13 mesiacov',
      path: '/',
      description:
        'Hlavný identifikátor Google Analytics 4 (načítaný cez Google Tag Manager po súhlase).',
    },
    {
      name: '_ga_*',
      domain: `.${host}`,
      expiry: '13 mesiacov',
      path: '/',
      description:
        'Súbor Google Analytics 4 na udržanie stavu relácie (session), načítaný cez GTM.',
    },
    {
      name: '_gid',
      domain: `.${host}`,
      expiry: '24 hodín',
      path: '/',
      description: 'Rozlišuje používateľov v rámci dňa (Google Analytics 4 cez GTM).',
    },
    {
      name: '_clck',
      domain: `.${host}`,
      expiry: '1 rok',
      path: '/',
      description:
        'Microsoft Clarity — identifikátor návštevníka (načítaný cez GTM po súhlase).',
    },
    {
      name: '_clsk',
      domain: `.${host}`,
      expiry: 'Relácia',
      path: '/',
      description:
        'Microsoft Clarity — prepojenie zobrazení v jednej relácii (cez GTM po súhlase).',
    },
    {
      name: 'ph_*',
      domain: host,
      expiry: '1 rok',
      path: '/',
      description:
        'PostHog — identifikácia návštevníka a stav analytiky (napr. ph_phc_* podľa konfigurácie).',
    },
  ]
}
