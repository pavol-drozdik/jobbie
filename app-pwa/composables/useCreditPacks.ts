/** Credit packs from billing config (prefer useCatalogBilling for full page). */
export function useCreditPacks() {
  const { config, load } = useCatalogBilling()

  const creditPackages = computed(() => {
    const raw = config.value?.creditPackages
    return Array.isArray(raw) ? raw : []
  })

  return { creditPackages, loadCatalog: load }
}
