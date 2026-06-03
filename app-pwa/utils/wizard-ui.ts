/** Shared form control styling for multi-step wizards (CV builder, job email alerts). */

import {
  formFieldLabelClass,
  formFieldRowClass,
  formTextInputClass,
} from '~/utils/form-field-ui'

export const wizardPillBase =
  'h-[54px] rounded-full border-0 px-5 text-lg font-black'

export function wizardPillClass(selected: boolean): string {
  return selected
    ? 'bg-marketing-green text-white'
    : 'bg-marketing-soft text-black/[0.58] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]'
}

export const wizardFieldLabelClass = formFieldLabelClass

export const wizardFieldRowClass = formFieldRowClass

export const wizardTextInputClass = formTextInputClass

export const wizardSectionCardClass =
  'scroll-mt-28 rounded-[20px] border border-black/[0.06] bg-white p-[26px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)]'

export const wizardSectionHeaderBlockClass = 'mb-5'
