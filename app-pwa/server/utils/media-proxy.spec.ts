import { describe, expect, it } from 'vitest'
import { isAllowedMediaProxyUrl } from './media-proxy'

describe('isAllowedMediaProxyUrl', () => {
  it('allows public job-photos URLs', () => {
    expect(
      isAllowedMediaProxyUrl(
        'https://abc.supabase.co/storage/v1/object/public/job-photos/user/cover/x.jpg',
      ),
    ).toBe(true)
  })

  it('allows public profile-avatars URLs', () => {
    expect(
      isAllowedMediaProxyUrl(
        'https://abc.supabase.co/storage/v1/object/public/profile-avatars/user/avatar.jpg',
      ),
    ).toBe(true)
  })

  it('rejects private buckets', () => {
    expect(
      isAllowedMediaProxyUrl(
        'https://abc.supabase.co/storage/v1/object/public/chat-media/room/file.jpg',
      ),
    ).toBe(false)
  })

  it('rejects non-supabase hosts', () => {
    expect(isAllowedMediaProxyUrl('https://evil.example/photo.jpg')).toBe(false)
  })

  it('rejects http', () => {
    expect(
      isAllowedMediaProxyUrl(
        'http://abc.supabase.co/storage/v1/object/public/job-photos/x.jpg',
      ),
    ).toBe(false)
  })
})
