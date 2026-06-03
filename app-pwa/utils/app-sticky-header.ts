export const APP_STICKY_HEADER_GAP_PX = 12

export const APP_MAIN_HEADER_SELECTOR = 'header[aria-label="Hlavná navigácia"]'

const APP_STICKY_HEADER_OFFSET_FALLBACK_PX = 100

/** Bottom edge of the fixed app nav + gap — for JS sticky sidebars (translateY). */
export function measureAppStickyHeaderOffsetPx(gapPx = APP_STICKY_HEADER_GAP_PX): number {
  if (!import.meta.client) {
    return APP_STICKY_HEADER_OFFSET_FALLBACK_PX
  }
  const header = document.querySelector(APP_MAIN_HEADER_SELECTOR)
  if (header instanceof HTMLElement) {
    return Math.ceil(header.getBoundingClientRect().bottom) + gapPx
  }
  return APP_STICKY_HEADER_OFFSET_FALLBACK_PX
}
