import { normalizeJobPhotos } from './normalize-job-photos.util';

describe('normalizeJobPhotos', () => {
  it('returns string array as-is', () => {
    expect(normalizeJobPhotos(['https://a.test/1.jpg', ''])).toEqual([
      'https://a.test/1.jpg',
    ]);
  });

  it('extracts URLs from legacy object map', () => {
    expect(
      normalizeJobPhotos({
        '0': 'https://a.test/cover.jpg',
        '1': 'https://a.test/extra.jpg',
      }),
    ).toEqual(['https://a.test/cover.jpg', 'https://a.test/extra.jpg']);
  });
});
