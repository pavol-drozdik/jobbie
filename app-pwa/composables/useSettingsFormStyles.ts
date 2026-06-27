import {
  formFieldLabelClass,
  formFieldRowClass,
  formTextareaClass,
  formTextInputClass,
  formTextInputDangerClass,
} from '~/utils/form-field-ui'

/** Shared marketing-style form classes for settings screens. */
export function useSettingsFormStyles() {
  const labelClass = formFieldLabelClass

  const inputClass = formTextInputClass

  const textareaClass = formTextareaClass

  const fieldWrapClass = formFieldRowClass

  const dangerInputClass = formTextInputDangerClass

  const primaryButtonClass =
    'inline-flex h-[52px] w-full shrink-0 items-center justify-center gap-2 rounded-full border-0 bg-marketing-green px-[26px] font-dmSans text-[17px] font-bold text-white transition-opacity hover:opacity-[0.88] disabled:opacity-50 sm:w-auto'

  const secondaryButtonClass =
    'inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-full border-[1.5px] border-[#e5e7eb] bg-marketing-surface px-[26px] font-dmSans text-[17px] font-semibold text-black/60 transition-colors hover:border-marketing-green hover:text-marketing-green disabled:opacity-50'

  const outlineFileButtonClass =
    'inline-flex min-h-[44px] is-clickable items-center justify-center rounded-full border-[1.5px] border-[#e5e7eb] bg-marketing-surface px-4 py-2 font-dmSans text-[15px] font-semibold text-black/80 transition-colors hover:border-marketing-green hover:text-marketing-green disabled:is-disabled-cursor disabled:opacity-50'

  const textLinkButtonClass =
    'inline-flex min-h-[44px] is-clickable items-center justify-center rounded-full border-[1.5px] border-transparent bg-transparent px-3 py-2 font-dmSans text-[15px] font-semibold text-black/55 underline decoration-black/25 underline-offset-2 hover:text-red-700 hover:decoration-red-700/60'

  const settingsCardClass =
    'rounded-[20px] bg-white px-6 py-7 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] sm:px-8'

  return {
    labelClass,
    inputClass,
    textareaClass,
    fieldWrapClass,
    dangerInputClass,
    primaryButtonClass,
    secondaryButtonClass,
    outlineFileButtonClass,
    textLinkButtonClass,
    settingsCardClass,
  }
}
