import { describe, expect, it } from 'vitest'
import {
  baseCoverScale,
  clampPanOffset,
  clampScale,
  computeCropSourceRect,
  defaultCropStateForBitmap,
  maxPanOffset,
} from './square-image-crop'

describe('square-image-crop', () => {
  it('clampScale keeps zoom within bounds', () => {
    expect(clampScale(0.5)).toBe(1)
    expect(clampScale(2)).toBe(2)
    expect(clampScale(9)).toBe(3)
  })

  it('baseCoverScale covers the viewport', () => {
    expect(baseCoverScale(800, 600, 400)).toBeCloseTo(400 / 600, 5)
    expect(baseCoverScale(200, 800, 400)).toBe(2)
  })

  it('defaultCropStateForBitmap centers at scale 1', () => {
    expect(defaultCropStateForBitmap(1200, 800, 400)).toEqual({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    })
  })

  it('computeCropSourceRect is square and inside image for centered landscape', () => {
    const rect = computeCropSourceRect(1200, 800, 400, { scale: 1, offsetX: 0, offsetY: 0 })
    expect(rect.sw).toBeCloseTo(rect.sh, 5)
    expect(rect.sx).toBeGreaterThanOrEqual(0)
    expect(rect.sy).toBeGreaterThanOrEqual(0)
    expect(rect.sx + rect.sw).toBeLessThanOrEqual(1200)
    expect(rect.sy + rect.sh).toBeLessThanOrEqual(800)
  })

  it('maxPanOffset grows when zooming in', () => {
    const atOne = maxPanOffset(1200, 800, 400, 1)
    const atTwo = maxPanOffset(1200, 800, 400, 2)
    expect(atTwo.maxX).toBeGreaterThan(atOne.maxX)
    expect(atTwo.maxY).toBeGreaterThan(atOne.maxY)
  })

  it('clampPanOffset limits drag beyond edges', () => {
    const clamped = clampPanOffset(1200, 800, 400, 1, 500, -500)
    const { maxX, maxY } = maxPanOffset(1200, 800, 400, 1)
    expect(clamped.offsetX).toBe(maxX)
    expect(clamped.offsetY).toBe(-maxY)
  })
})
