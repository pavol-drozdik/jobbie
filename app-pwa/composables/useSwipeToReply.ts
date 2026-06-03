import type { MaybeRefOrGetter, Ref } from 'vue'
import { ref, toValue } from 'vue'

const DEFAULT_THRESHOLD_PX = 56
const MAX_VISUAL_SHIFT_PX = 52
/** Horizontal movement must dominate vertical before treating as swipe */
const HORIZONTAL_DOMINANCE = 1.28

/**
 * Instagram-style horizontal swipe on a message row to enter reply mode (mobile).
 * Uses threshold distance and slight translate feedback while dragging.
 */
export function useSwipeToReply(
  onConfirmReply: () => void,
  options?: {
    enabled?: MaybeRefOrGetter<boolean>
    thresholdPx?: number
  },
): {
  swipeTranslatePx: Ref<number>
  onSwipeTouchStart: (e: TouchEvent) => void
  onSwipeTouchMove: (e: TouchEvent) => void
  onSwipeTouchEnd: (e: TouchEvent) => void
  onSwipeTouchCancel: () => void
} {
  const swipeTranslatePx = ref(0)
  let touchStartX = 0
  let touchStartY = 0
  let tracking = false
  let horizontalSwipe = false

  function resetShift(): void {
    swipeTranslatePx.value = 0
  }

  function onSwipeTouchStart(e: TouchEvent): void {
    if (!toValue(options?.enabled ?? true)) return
    if (e.touches.length !== 1) return
    tracking = true
    horizontalSwipe = false
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }

  function onSwipeTouchMove(e: TouchEvent): void {
    if (!tracking || e.touches.length !== 1) return
    const dx = e.touches[0].clientX - touchStartX
    const dy = e.touches[0].clientY - touchStartY
    if (Math.abs(dx) > Math.abs(dy) * HORIZONTAL_DOMINANCE && Math.abs(dx) > 12) {
      horizontalSwipe = true
      e.preventDefault()
      const sign = dx >= 0 ? 1 : -1
      const mag = Math.min(Math.abs(dx), MAX_VISUAL_SHIFT_PX)
      swipeTranslatePx.value = sign * mag * 0.42
    }
  }

  function onSwipeTouchEnd(e: TouchEvent): void {
    if (!tracking) return
    tracking = false
    const dx = e.changedTouches[0].clientX - touchStartX
    resetShift()
    if (!horizontalSwipe) return
    horizontalSwipe = false
    const threshold = options?.thresholdPx ?? DEFAULT_THRESHOLD_PX
    if (Math.abs(dx) >= threshold) {
      onConfirmReply()
    }
  }

  function onSwipeTouchCancel(): void {
    tracking = false
    horizontalSwipe = false
    resetShift()
  }

  return {
    swipeTranslatePx,
    onSwipeTouchStart,
    onSwipeTouchMove,
    onSwipeTouchEnd,
    onSwipeTouchCancel,
  }
}
