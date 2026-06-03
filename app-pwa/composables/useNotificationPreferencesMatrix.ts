import { S } from '~/utils/strings'

export type NotifyCat =
  | 'messages'
  | 'applications'
  | 'reviews'
  | 'digest'
  | 'marketing'
  | 'job_updates'
  | 'payments'
  | 'offer_expiry'
  | 'low_credits'
  | 'job_email_alerts'
  | 'cv_database'

export type NotifyCh = 'in_app' | 'email' | 'push' | 'sms'

/** Channels shown in settings UI (SMS not offered). */
export const NOTIFY_UI_CHANNELS: readonly NotifyCh[] = ['in_app', 'email', 'push'] as const

/** All channels stored in prefs (sms always false). */
export const NOTIFY_CHANNELS: readonly NotifyCh[] = ['in_app', 'email', 'push', 'sms'] as const

export type NotifySectionId = 'communication' | 'work' | 'account' | 'digest_marketing' | 'company'

export type NotifyCategoryRow = {
  key: NotifyCat
  label: string
  description: string
}

export type NotifySection = {
  id: NotifySectionId
  title: string
  hint?: string
  categories: NotifyCat[]
  companyOnly?: boolean
}

const CATEGORY_DESCRIPTIONS: Record<NotifyCat, () => string> = {
  messages: () => S.settingsNotifyDescMessages,
  applications: () => S.settingsNotifyDescApplications,
  reviews: () => S.settingsNotifyDescReviews,
  digest: () => S.settingsNotifyDescDigest,
  marketing: () => S.settingsNotifyDescMarketing,
  job_updates: () => S.settingsNotifyDescJobUpdates,
  payments: () => S.settingsNotifyDescPayments,
  offer_expiry: () => S.settingsNotifyDescOfferExpiry,
  low_credits: () => S.settingsNotifyDescLowCredits,
  job_email_alerts: () => S.settingsNotifyDescJobEmail,
  cv_database: () => S.settingsNotifyDescCvDatabase,
}

const CATEGORY_LABELS: Record<NotifyCat, () => string> = {
  messages: () => S.settingsNotifyMessages,
  applications: () => S.settingsNotifyApplications,
  reviews: () => S.settingsNotifyReviews,
  digest: () => S.settingsNotifyDigest,
  marketing: () => S.settingsNotifyMarketing,
  job_updates: () => S.settingsNotifyJobUpdates,
  payments: () => S.settingsNotifyPayments,
  offer_expiry: () => S.settingsNotifyOfferExpiry,
  low_credits: () => S.settingsNotifyLowCredits,
  job_email_alerts: () => S.settingsNotifyJobEmail,
  cv_database: () => S.settingsNotifyCvDatabase,
}

export const NOTIFY_SECTIONS: NotifySection[] = [
  {
    id: 'communication',
    title: S.settingsNotifySectionCommunication,
    categories: ['messages'],
  },
  {
    id: 'work',
    title: S.settingsNotifySectionWork,
    hint: S.settingsNotifySectionWorkHint,
    categories: ['applications', 'job_updates', 'offer_expiry', 'job_email_alerts'],
  },
  {
    id: 'account',
    title: S.settingsNotifySectionAccount,
    categories: ['payments', 'low_credits', 'reviews'],
  },
  {
    id: 'digest_marketing',
    title: S.settingsNotifySectionDigestMarketing,
    categories: ['digest', 'marketing'],
  },
  {
    id: 'company',
    title: S.settingsNotifySectionCompany,
    companyOnly: true,
    categories: ['cv_database'],
  },
]

/** Subset used on public token preferences page (email unsubscribe flow). */
export const PUBLIC_TOKEN_NOTIFY_SECTIONS: NotifySection[] = [
  {
    id: 'communication',
    title: S.settingsNotifySectionCommunication,
    categories: ['messages'],
  },
  {
    id: 'work',
    title: S.settingsNotifySectionWork,
    categories: ['applications', 'job_updates'],
  },
  {
    id: 'account',
    title: S.settingsNotifySectionAccount,
    categories: ['payments', 'reviews'],
  },
  {
    id: 'digest_marketing',
    title: S.settingsNotifySectionDigestMarketing,
    categories: ['digest', 'marketing'],
  },
]

export function defaultChannels(
  over: Partial<Record<NotifyCh, boolean>> = {},
): Record<NotifyCh, boolean> {
  return {
    in_app: true,
    email: true,
    push: true,
    sms: false,
    ...over,
  }
}

export function createDefaultNotifyMatrix(): Record<NotifyCat, Record<NotifyCh, boolean>> {
  return {
    messages: defaultChannels(),
    applications: defaultChannels(),
    reviews: defaultChannels({ push: false, sms: false }),
    digest: defaultChannels({ push: false, sms: false }),
    marketing: defaultChannels({ email: false, push: false, sms: false }),
    job_updates: defaultChannels(),
    payments: defaultChannels(),
    offer_expiry: defaultChannels(),
    low_credits: defaultChannels(),
    job_email_alerts: defaultChannels(),
    cv_database: defaultChannels(),
  }
}

export function createPublicTokenNotifyMatrix(): Record<
  NotifyCat,
  Record<NotifyCh, boolean>
> {
  const full = createDefaultNotifyMatrix()
  return {
    messages: full.messages,
    applications: full.applications,
    reviews: full.reviews,
    digest: full.digest,
    marketing: full.marketing,
    job_updates: full.job_updates,
    payments: full.payments,
    offer_expiry: defaultChannels(),
    low_credits: defaultChannels(),
    job_email_alerts: defaultChannels(),
    cv_database: defaultChannels(),
  }
}

export function notifyCategoryRow(key: NotifyCat): NotifyCategoryRow {
  return {
    key,
    label: CATEGORY_LABELS[key](),
    description: CATEGORY_DESCRIPTIONS[key](),
  }
}

export function isChannelShownForCategory(category: NotifyCat, channel: NotifyCh): boolean {
  if (channel === 'sms') {
    return false
  }
  return true
}

export function channelLabel(channel: NotifyCh): string {
  if (channel === 'in_app') return S.notifyColInApp
  if (channel === 'email') return S.notifyColEmail
  if (channel === 'push') return S.notifyColPush
  return ''
}

export function channelIcon(channel: NotifyCh): string {
  if (channel === 'in_app') return 'bell'
  if (channel === 'email') return 'send'
  if (channel === 'push') return 'smartphone'
  return 'chat'
}

export function normalizeNotificationPrefs(
  matrix: Record<NotifyCat, Record<NotifyCh, boolean>>,
  raw: unknown,
): void {
  if (!raw || typeof raw !== 'object') {
    return
  }
  const o = raw as Record<string, unknown>
  if (o.v === 2 && o.categories && typeof o.categories === 'object') {
    const cats = o.categories as Record<string, Partial<Record<NotifyCh, boolean>>>
    for (const key of Object.keys(matrix) as NotifyCat[]) {
      const c = cats[key]
      if (!c || typeof c !== 'object') {
        continue
      }
      for (const ch of NOTIFY_CHANNELS) {
        if (typeof c[ch] === 'boolean') {
          matrix[key][ch] = c[ch] as boolean
        }
      }
    }
    return
  }
  if (typeof o.messages === 'boolean') {
    const v = o.messages
    matrix.messages = defaultChannels({ in_app: v, email: v, push: v, sms: false })
  }
  if (typeof o.new_applications === 'boolean') {
    const v = o.new_applications
    matrix.applications = defaultChannels({ in_app: v, email: v, push: v, sms: false })
  }
  if (typeof o.reviews === 'boolean') {
    const v = o.reviews
    matrix.reviews = defaultChannels({ in_app: v, email: v, push: false, sms: false })
  }
}

function matrixWithSmsDisabled(
  matrix: Record<NotifyCat, Record<NotifyCh, boolean>>,
): Record<string, Record<string, boolean>> {
  const categories = JSON.parse(JSON.stringify(matrix)) as Record<
    string,
    Record<string, boolean>
  >
  for (const cat of Object.keys(categories)) {
    categories[cat] = { ...categories[cat], sms: false }
  }
  return categories
}

export function buildNotificationPreferencesPayload(
  matrix: Record<NotifyCat, Record<NotifyCh, boolean>>,
): { v: 2; categories: Record<string, Record<string, boolean>> } {
  return {
    v: 2,
    categories: matrixWithSmsDisabled(matrix),
  }
}

/** Merge edited categories into existing prefs (public token page must not wipe categories off-form). */
export function mergeNotificationPreferencesPayload(
  existing: unknown,
  matrix: Record<NotifyCat, Record<NotifyCh, boolean>>,
  categoryKeys: NotifyCat[],
): { v: 2; categories: Record<string, Record<string, boolean>> } {
  const base =
    existing && typeof existing === 'object'
      ? (JSON.parse(JSON.stringify(existing)) as Record<string, unknown>)
      : { v: 2, categories: {} }
  if (base.v !== 2) {
    base.v = 2
  }
  const categories =
    typeof base.categories === 'object' && base.categories !== null
      ? { ...(base.categories as Record<string, Record<string, boolean>>) }
      : {}
  for (const key of categoryKeys) {
    categories[key] = { ...(JSON.parse(JSON.stringify(matrix[key])) as Record<string, boolean>), sms: false }
  }
  return { v: 2, categories }
}

export function publicTokenCategoryKeys(): NotifyCat[] {
  return PUBLIC_TOKEN_NOTIFY_SECTIONS.flatMap((s) => s.categories)
}

export function visibleNotifySections(
  sections: NotifySection[],
  isCompany: boolean,
): NotifySection[] {
  return sections.filter((s) => !s.companyOnly || isCompany)
}

export function useNotificationPreferencesMatrix() {
  const { user } = useAuth()
  const notifyMatrix = reactive(createDefaultNotifyMatrix())

  const isCompany = computed(() => user.value?.role === 'company')

  const sections = computed(() => visibleNotifySections(NOTIFY_SECTIONS, isCompany.value))

  return {
    notifyMatrix,
    sections,
    isCompany,
  }
}
