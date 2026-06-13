import {
  coverPhotosForJobList,
  jobPhotoThumbPublicUrl,
  jobPhotoThumbStoragePath,
} from './job-photo-url.util';

describe('job-photo-url.util', () => {
  it('derives thumb storage path', () => {
    expect(jobPhotoThumbStoragePath('user/cover/abc.jpg')).toBe(
      'user/cover/abc_thumb.jpg',
    );
  });

  it('derives thumb public URL', () => {
    expect(
      jobPhotoThumbPublicUrl(
        'https://x.supabase.co/storage/v1/object/public/job-photos/u/cover/a.jpg',
      ),
    ).toBe(
      'https://x.supabase.co/storage/v1/object/public/job-photos/u/cover/a_thumb.jpg',
    );
  });

  it('returns cover thumb only for list', () => {
    expect(
      coverPhotosForJobList([
        'https://x.supabase.co/storage/v1/object/public/job-photos/u/cover/a.jpg',
        'https://x.supabase.co/storage/v1/object/public/job-photos/u/extra/b.jpg',
      ]),
    ).toEqual([
      'https://x.supabase.co/storage/v1/object/public/job-photos/u/cover/a_thumb.jpg',
    ]);
  });
});
