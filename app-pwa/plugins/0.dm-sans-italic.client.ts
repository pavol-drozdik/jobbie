/** Defer italic variable font — not needed for homepage LCP text. */
export default defineNuxtPlugin(() => {
  const load = (): void => {
    void import('~/assets/css/dm-sans-italic.css')
  }
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(load)
  } else {
    setTimeout(load, 1500)
  }
})
