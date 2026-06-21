export const BLOG_CATEGORIES = [
  'tipy',
  'kariera',
  'brigady',
  'firmy',
  'novinky',
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];
