export const BLOG_CATEGORIES = [
  'tipy',
  'kariera',
  'brigady',
  'firmy',
  'novinky',
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_CATEGORY_LABELS: Record<BlogCategory, string> = {
  tipy: 'Tipy',
  kariera: 'Kariéra',
  brigady: 'Brigády',
  firmy: 'Firmy',
  novinky: 'Novinky',
};
