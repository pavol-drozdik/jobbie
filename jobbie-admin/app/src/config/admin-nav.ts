export type AdminNavItem = {
  to: string
  label: string
  icon: string
  badge?: boolean
  requiresModeration?: boolean
}

export type AdminNavGroup = {
  id: string
  label?: string
  items: AdminNavItem[]
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: 'overview',
    items: [{ to: '/overview', label: 'Prehľad', icon: 'pi pi-home' }],
  },
  {
    id: 'operations',
    label: 'Operácie',
    items: [
      { to: '/infrastructure', label: 'Infra', icon: 'pi pi-server' },
      { to: '/support', label: 'Podpora', icon: 'pi pi-headphones' },
      {
        to: '/contract-withdrawals',
        label: 'Odstúpenie od zmluvy',
        icon: 'pi pi-inbox',
      },
      {
        to: '/moderation',
        label: 'Moderácia',
        icon: 'pi pi-flag',
        badge: true,
        requiresModeration: true,
      },
      { to: '/users', label: 'Účty', icon: 'pi pi-users' },
      { to: '/notifications', label: 'Upozornenia', icon: 'pi pi-bell' },
    ],
  },
  {
    id: 'data',
    label: 'Dáta',
    items: [
      { to: '/analytics', label: 'Analytics', icon: 'pi pi-chart-bar' },
      { to: '/audit', label: 'Audit', icon: 'pi pi-list-check' },
      { to: '/consent-log', label: 'Cookie súhlas', icon: 'pi pi-shield' },
    ],
  },
  {
    id: 'content',
    label: 'Obsah',
    items: [
      { to: '/blog', label: 'Blog', icon: 'pi pi-book' },
      { to: '/registration-promo', label: 'Promo kódy', icon: 'pi pi-ticket' },
    ],
  },
]
