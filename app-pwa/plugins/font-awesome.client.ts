/** Font Awesome is only used on CV editor and register wizard — avoid global CSS on marketing pages. */
const FA_ROUTE = /^\/(zivotopisy|auth\/register)/

let loaded = false

export default defineNuxtPlugin(() => {
  const router = useRouter()

  function maybeLoadFa(): void {
    if (loaded) return
    if (!FA_ROUTE.test(router.currentRoute.value.path)) return
    loaded = true
    void import('~/assets/css/font-awesome.css')
  }

  maybeLoadFa()
  router.afterEach(maybeLoadFa)
})
