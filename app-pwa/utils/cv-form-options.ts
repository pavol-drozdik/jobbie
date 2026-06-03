/** Shared dropdown options for CV builder and employer CV database filters. */

export const CV_BUILDER_SKILL_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Vyberte úroveň' },
  { value: 'Začiatočník', label: 'Začiatočník' },
  { value: 'Mierne pokročilý', label: 'Mierne pokročilý' },
  { value: 'Pokročilý', label: 'Pokročilý' },
  { value: 'Expert', label: 'Expert' },
]

const CV_LANG_LEVELS = [
  { label: 'Začiatočník (A1)', value: 'A1' },
  { label: 'Začiatočník (A2)', value: 'A2' },
  { label: 'Mierne pokročilý (B1)', value: 'B1' },
  { label: 'Pokročilý (B2)', value: 'B2' },
  { label: 'Expert (C1)', value: 'C1' },
  { label: 'Expert (C2)', value: 'C2' },
] as const

export const CV_BUILDER_LANGUAGE_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Vyberte úroveň' },
  ...CV_LANG_LEVELS.map((l) => ({ value: l.value, label: l.label })),
]
