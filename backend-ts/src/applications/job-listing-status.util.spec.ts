import { deriveJobListingStatus, matchesJobListingFilter } from './job-listing-status.util';

describe('job-listing-status.util', () => {
  it('derives draft', () => {
    expect(
      deriveJobListingStatus({ is_draft: true, is_active: false, expires_at: null }),
    ).toBe('draft');
  });

  it('derives published', () => {
    expect(
      deriveJobListingStatus({ is_draft: false, is_active: true, expires_at: null }),
    ).toBe('published');
  });

  it('derives expired', () => {
    expect(
      deriveJobListingStatus({
        is_draft: false,
        is_active: true,
        expires_at: new Date(Date.now() - 86400000).toISOString(),
      }),
    ).toBe('expired');
  });

  it('filters archived as paused', () => {
    const job = { is_draft: false, is_active: false, expires_at: null };
    expect(matchesJobListingFilter(job, 'archived')).toBe(true);
    expect(matchesJobListingFilter(job, 'published')).toBe(false);
  });
});
