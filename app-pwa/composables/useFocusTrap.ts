import { nextTick, onBeforeUnmount, type Ref, watch } from 'vue'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
  )
}

/** Trap Tab focus inside a modal while active; restore focus on deactivate. */
export function useFocusTrap(containerRef: Ref<HTMLElement | null>, active: Ref<boolean>): void {
  let previousFocus: HTMLElement | null = null

  function onKeydown(event: KeyboardEvent): void {
    if (!active.value || event.key !== 'Tab' || !containerRef.value) {
      return
    }
    const focusable = getFocusableElements(containerRef.value)
    if (focusable.length === 0) {
      return
    }
    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    const current = document.activeElement as HTMLElement | null
    if (event.shiftKey && current === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && current === last) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(
    active,
    (isActive) => {
      if (!import.meta.client) {
        return
      }
      if (isActive) {
        previousFocus = document.activeElement as HTMLElement | null
        document.addEventListener('keydown', onKeydown)
        void nextTick(() => {
          const root = containerRef.value
          if (!root) {
            return
          }
          const focusable = getFocusableElements(root)
          ;(focusable[0] ?? root).focus()
        })
        return
      }
      document.removeEventListener('keydown', onKeydown)
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus()
      }
      previousFocus = null
    },
    { flush: 'post' },
  )

  onBeforeUnmount(() => {
    if (import.meta.client) {
      document.removeEventListener('keydown', onKeydown)
    }
  })
}
