/**
 * Theme 1:1 with base44: indigo primary, gray/slate, amber accent.
 * Tailwind equivalents: indigo-600 #4f46e5, indigo-700 #4338ca, violet-800 #5b21b6,
 * gray-50 #f9fafb, gray-100 #f3f4f6, gray-400 #9ca3af, gray-500 #6b7280, gray-700 #374151, gray-900 #111827,
 * indigo-100 #e0e7ff, amber-400 #fbbf24, amber-500 #f59e0b.
 */
export const colors = {
  // Primary (indigo) – base44
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryForeground: '#ffffff',
  primaryLight: '#eef2ff',   // indigo-50
  primaryMuted: '#e0e7ff',   // indigo-100

  // Backgrounds
  background: '#ffffff',
  backgroundGradientStart: '#f8fafc',   // slate-50
  backgroundGradientMid: '#ffffff',
  backgroundGradientEnd: 'rgba(238, 242, 255, 0.3)',
  backgroundFindWork: '#f9fafb',         // gray-50
  card: '#ffffff',
  cardBorder: '#f3f4f6',     // gray-100 base44
  cardBorderHover: '#e0e7ff',

  // Hero (base44: from-indigo-600 via-indigo-700 to-violet-800)
  heroStart: '#4f46e5',
  heroMid: '#4338ca',
  heroEnd: '#5b21b6',
  heroText: '#ffffff',
  heroTextMuted: '#e0e7ff',  // text-indigo-100

  // Accent (base44 amber buttons)
  accent: '#f59e0b',
  accent400: '#fbbf24',      // from-amber-400
  accentForeground: '#ffffff',
  accentButtonText: '#111827', // text-gray-900 on amber

  // Destructive / urgent (base44 red-500)
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',

  // Gray scale (base44)
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray700: '#374151',
  gray900: '#111827',

  // Muted / secondary
  muted: '#f3f4f6',
  mutedForeground: '#6b7280',
  secondary: '#f3f4f6',
  secondaryForeground: '#111827',

  border: '#e2e8f0',
  input: '#e2e8f0',
  ring: '#6366f1',

  foreground: '#111827',
  foregroundMuted: '#6b7280',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  titleLarge: { fontSize: 22, fontWeight: '700' as const },
  title: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16 },
  bodySmall: { fontSize: 14 },
  caption: { fontSize: 12 },
  captionSmall: { fontSize: 10 },
} as const;
