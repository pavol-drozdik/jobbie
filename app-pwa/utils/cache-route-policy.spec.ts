import { describe, expect, it } from 'vitest'
import { pathRequiresPrivateNoStore } from './cache-route-policy'

describe('pathRequiresPrivateNoStore', () => {
  it('requires no-store on auth and account routes', () => {
    expect(pathRequiresPrivateNoStore('/auth/login')).toBe(true)
    expect(pathRequiresPrivateNoStore('/nastavenia/profil')).toBe(true)
    expect(pathRequiresPrivateNoStore('/zivotopisy')).toBe(true)
    expect(pathRequiresPrivateNoStore('/chat/room-1')).toBe(true)
  })

  it('allows public marketing and job catalog pages to cache', () => {
    expect(pathRequiresPrivateNoStore('/')).toBe(false)
    expect(pathRequiresPrivateNoStore('/pracovne-ponuky')).toBe(false)
    expect(pathRequiresPrivateNoStore('/ponuka/abc')).toBe(false)
    expect(pathRequiresPrivateNoStore('/blog/post')).toBe(false)
  })

  it('allows public profile slug pages to cache', () => {
    expect(pathRequiresPrivateNoStore('/profil/jan-novak')).toBe(false)
    expect(pathRequiresPrivateNoStore('/profil')).toBe(true)
  })

  it('skips hashed static assets', () => {
    expect(pathRequiresPrivateNoStore('/_nuxt/abc.js')).toBe(false)
  })
})
