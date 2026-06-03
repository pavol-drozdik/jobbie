/** Pill actions on applicant cards — match `AppFormDropdown` toolbar (`h-11`, `text-sm`). */
export const APPLICANT_CARD_ACTION_BASE =
  'inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-full border border-black/12 bg-marketing-soft px-4 font-dmSans text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green'

export const APPLICANT_CARD_ACTION_NEUTRAL = `${APPLICANT_CARD_ACTION_BASE} text-black/80 hover:bg-white`

export const APPLICANT_CARD_ACTION_ACCENT = `${APPLICANT_CARD_ACTION_BASE} text-marketing-green no-underline hover:bg-white`

export const APPLICANT_CARD_ACTION_DANGER = `${APPLICANT_CARD_ACTION_BASE} text-red-700 hover:bg-red-50`

/** Root class for applicant status dropdown (see `main.css` `.applicant-status-dropdown`). */
export const APPLICANT_STATUS_DROPDOWN_CLASS = 'applicant-status-dropdown'
