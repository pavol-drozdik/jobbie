/** Session-cached public billing catalog from GET /api/billing/config */
export function useCatalogBilling() {
  const { api } = useApi()
  const config = useState<Record<string, unknown> | null>('catalog-billing-config-v5', () => null)
  const loading = useState('catalog-billing-loading', () => false)
  const error = useState<string | null>('catalog-billing-error', () => null)

  async function load(force = false): Promise<Record<string, unknown> | null> {
    if (config.value && !force) return config.value
    loading.value = true
    error.value = null
    try {
      const res = await api<Record<string, unknown>>('/api/billing/config', {
        skipSessionExpiry: true,
      })
      if (!res.ok || !res.data) {
        error.value = 'Nepodarilo sa načítať cenník.'
        return null
      }
      config.value = res.data
      return res.data
    } finally {
      loading.value = false
    }
  }

  return { config, loading, error, load }
}
