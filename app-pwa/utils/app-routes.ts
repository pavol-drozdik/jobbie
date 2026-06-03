/**
 * Canonical PWA paths (marketing slugs). Use these instead of hardcoded `/app/*` strings.
 */

/** Hash target on `/nastavenia/firma` for company applicant auto-reply templates. */
export const SETTINGS_FIRMA_AUTO_REPLIES_SECTION_ID = 'uchadzaci-auto-odpovede'

export const ROUTES = {
  home: '/',
  profile: '/profil',
  publicProfile: (userId: string) => `/profil/${userId}`,
  find: '/pracovne-ponuky',
  foreignFind: '/zahranicne-pracovne-ponuky',
  /**
   * Public job detail (marketing URL). Legacy `/app/jobs/:id` redirects here.
   * Future SEO slug URLs (e.g. `/praca/:slug`) need `job_offers.public_slug` + redirect table.
   */
  jobDetail: (jobId: string) => `/ponuka/${jobId}`,
  blogPost: (slug: string) => `/blog/${slug}`,
  cvHub: '/zivotopisy',
  cvNew: '/zivotopisy/novy',
  cvEdit: (cvId: string) => `/zivotopisy/${cvId}`,
  jobHub: '/vytvorit-ponuku',
  jobNew: '/vytvorit-ponuku/novy',
  jobWizard: (jobId: string) => `/vytvorit-ponuku/${jobId}`,
  foreignJobHub: '/vytvorit-zahranicnu-ponuku',
  foreignJobNew: '/vytvorit-zahranicnu-ponuku/novy',
  foreignJobWizard: (jobId: string) => `/vytvorit-zahranicnu-ponuku/${jobId}`,
  applicants: '/spravca-uchadzacov',
  applicantsJob: (jobId: string) => `/spravca-uchadzacov/${jobId}`,
  settingsFirmaAutoReplies: `/nastavenia/firma#${SETTINGS_FIRMA_AUTO_REPLIES_SECTION_ID}`,
  applicantsPrint: (jobId: string) => `/spravca-uchadzacov/print/${jobId}`,
  professionalsCatalog: '/profesionali',
  professionalDetail: (id: string) => `/profesionali/${id}`,
  myAds: '/moje-reklamy',
  myAdsNew: '/moje-reklamy/novy',
  myAdWizard: (adId: string) => `/moje-reklamy/${adId}`,
  chat: '/chat',
  chatRoom: (roomId: string) => `/chat/${roomId}`,
  pricing: '/cennik',
  blog: '/blog',
  security: '/bezpecnost',
  terms: '/vseobecne-podmienky',
  privacy: '/ochrana-osobnych-udajov',
  authRegister: '/auth/register',
  guideHowItWorks: '/navody/ako-to-funguje',
  guideRegister: '/navody/ako-sa-registrovat',
  guideCreateService: '/navody/ako-vytvorit-sluzbu',
  guideCreateProfile: '/navody/ako-si-vytvorit-profil',
  guideTopService: '/navody/ako-topovat-sluzbu',
  guideAddVoucher: '/navody/ako-pridat-voucher',
  guideApply: '/navody/ako-sa-prihlasit-na-brigadu',
  guideCreateJob: '/navody/ako-vytvorit-ponuku',
  guideCredits: '/navody/ako-funguju-kredity',
  guideCvDb: '/navody/databaza-zivotopisov',
  guideEmailAlerts: '/navody/ponuky-na-email',
  guideDeleteAccount: '/navody/vymazat-ucet',
  guideDataExport: '/navody/export-udajov',
  checkout: '/platba',
  checkoutCredits: (pack: string, returnPath = '/cennik') =>
    `/platba?type=credits&pack=${encodeURIComponent(pack)}&return=${encodeURIComponent(returnPath)}`,
  checkoutPlan: (planId: string, returnPath = '/cennik') =>
    `/platba?type=subscription&plan_id=${encodeURIComponent(planId)}&return=${encodeURIComponent(returnPath)}`,
} as const

/** Longest prefix first — order matters for `/app/firmy/*` disambiguation. */
const LEGACY_PREFIX_RULES: ReadonlyArray<{ from: string; to: string }> = [
  { from: '/app/profile/zivotopis', to: ROUTES.cvHub },
  { from: '/app/profile', to: ROUTES.profile },
  { from: '/app/firmy/add', to: ROUTES.myAds },
  { from: '/app/firmy/novy', to: ROUTES.myAdsNew },
  { from: '/app/firmy', to: ROUTES.professionalsCatalog },
  { from: '/app/find', to: ROUTES.find },
  { from: '/app/add', to: ROUTES.jobHub },
  { from: '/app/zaujemcovia', to: ROUTES.applicants },
  { from: '/app/databaza-zivotopisov', to: '/databaza-zivotopisov' },
  { from: '/app/chat', to: ROUTES.chat },
]

function resolveLegacyJobDetailPath(path: string): string | null {
  const match = /^\/app\/jobs\/([^/]+)$/.exec(path)
  if (!match?.[1]) return null
  return ROUTES.jobDetail(match[1])
}

/**
 * Maps a legacy `/app/*` pathname to its canonical slug path (suffix preserved).
 * Returns null when no rule matches.
 */
export function resolveLegacyAppPath(pathname: string): string | null {
  const path =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  const jobDetail = resolveLegacyJobDetailPath(path)
  if (jobDetail) return jobDetail
  if (path === '/app') return ROUTES.home
  if (path === '/app/messages') return ROUTES.chat
  for (const { from, to } of LEGACY_PREFIX_RULES) {
    if (path === from) return to
    if (path.startsWith(`${from}/`)) {
      return `${to}${path.slice(from.length)}`
    }
  }
  return null
}
