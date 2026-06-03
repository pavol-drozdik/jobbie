export const BUCKET_BLOG_COVERS = 'blog-covers';
export const BUCKET_BLOG_CONTENT = 'blog-content';

export type BlogStoragePurpose = 'blog_cover' | 'blog_content';

export const BLOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** @deprecated Use BLOG_IMAGE_MAX_BYTES */
export const BLOG_COVER_MAX_BYTES = BLOG_IMAGE_MAX_BYTES;

export const BLOG_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
/** @deprecated Use BLOG_IMAGE_MIMES */
export const BLOG_COVER_MIMES = BLOG_IMAGE_MIMES;

export function bucketForBlogPurpose(purpose: BlogStoragePurpose): string {
  return purpose === 'blog_content' ? BUCKET_BLOG_CONTENT : BUCKET_BLOG_COVERS;
}
