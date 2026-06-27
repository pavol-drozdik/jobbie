/**
 * Shared marketing / catalog layout class tokens.
 * Centralizes long Tailwind strings used across auth, catalog, and chat shells.
 */

/** Left green panel on auth split layouts (desktop). */
export const authMarketingPanelClass =
  'auth-marketing-panel relative hidden w-full flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,#15803d_0%,#22c55e_100%)] px-11 py-10 text-white before:pointer-events-none before:absolute before:-right-[100px] before:-top-20 before:size-[320px] before:rounded-full before:bg-white/[0.07] after:pointer-events-none after:absolute after:-left-[60px] after:bottom-10 after:size-[200px] after:rounded-full after:bg-white/[0.07] min-[701px]:flex min-[701px]:w-[42%] min-[701px]:px-11 min-[701px]:py-10'

/** Register wizard variant (38% width on md+). */
export const authMarketingPanelRegisterClass =
  'auth-marketing-panel relative hidden w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#15803d] to-[#22c55e] px-11 py-10 before:pointer-events-none before:absolute before:right-[-100px] before:top-[-80px] before:size-[320px] before:rounded-full before:bg-white/[0.07] after:pointer-events-none after:absolute after:bottom-10 after:left-[-60px] after:size-[200px] after:rounded-full after:bg-white/[0.07] md:flex md:min-h-[640px] md:w-[38%] md:min-w-[38%] md:max-w-[38%]'

/** Green gradient banner above catalog filters. */
export const catalogFilterHeroClass =
  'catalog-filter-hero mb-[50px] mt-[30px] w-full max-w-[1400px] rounded-card bg-[linear-gradient(155deg,rgb(21,128,61)_0%,rgb(34,197,94)_100%)] p-6 shadow-hero marketing:p-[50px]'

/** Chat list page outer shell. */
export const chatPageRootClass =
  'chat-page-root mt-[30px] flex min-h-0 flex-col bg-marketing-mint px-0 pb-3 pt-0 max-[700px]:min-h-0 max-[700px]:flex-none max-[700px]:px-[10px] min-[701px]:-mx-3 min-[701px]:mt-0 min-[701px]:flex-1 min-[701px]:min-h-[calc(100dvh-5.5rem)]'

/** Chat room card container (list + detail). */
export const chatShellCardClass =
  'chat-shell-card relative flex w-full min-h-0 flex-col overflow-hidden bg-white shadow-card max-[700px]:mt-0 max-[700px]:h-[calc(100dvh-0.625rem-3.5rem-max(0.25rem,env(safe-area-inset-top,0px)))] max-[700px]:max-h-[calc(100dvh-0.625rem-3.5rem-max(0.25rem,env(safe-area-inset-top,0px)))] max-[700px]:shrink-0 max-[700px]:flex-none max-[700px]:rounded-card min-[701px]:mx-auto min-[701px]:mt-[30px] min-[701px]:flex-1 min-[701px]:max-h-[calc(100dvh-6rem)] min-[701px]:max-w-[1400px] min-[701px]:min-h-[calc(100dvh-6rem)] min-[701px]:flex-row min-[701px]:rounded-card'
