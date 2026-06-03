import {
  isCompanyAdLiveForTop,
  isJobListingLiveForTop,
} from './listing-live.util';

describe('listing-live.util', () => {
  describe('isJobListingLiveForTop', () => {
    it('accepts published active jobs', () => {
      expect(isJobListingLiveForTop({ is_draft: false, is_active: true })).toBe(
        true,
      );
    });

    it('treats null is_draft as published', () => {
      expect(isJobListingLiveForTop({ is_draft: null, is_active: true })).toBe(
        true,
      );
    });

    it('rejects drafts and inactive listings', () => {
      expect(isJobListingLiveForTop({ is_draft: true, is_active: true })).toBe(
        false,
      );
      expect(isJobListingLiveForTop({ is_draft: false, is_active: false })).toBe(
        false,
      );
    });
  });

  describe('isCompanyAdLiveForTop', () => {
    it('requires active status', () => {
      expect(isCompanyAdLiveForTop('active')).toBe(true);
      expect(isCompanyAdLiveForTop('draft')).toBe(false);
    });
  });
});
