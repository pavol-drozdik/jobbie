import { S } from '~/utils/strings'
import {
  type ApplicationStatus,
  type EmployerSettableStatus,
} from '~/utils/applicant-status'

const AUTO_REPLY_STATUSES: EmployerSettableStatus[] = ['interview_invited', 'rejected']

export const APPLICANT_BULK_STATUS_LIMIT = 50

export function limitApplicantBulkIds(ids: string[]): {
  ids: string[]
  truncated: boolean
} {
  const unique = [...new Set(ids)].filter(Boolean)
  if (unique.length <= APPLICANT_BULK_STATUS_LIMIT) {
    return { ids: unique, truncated: false }
  }
  return { ids: unique.slice(0, APPLICANT_BULK_STATUS_LIMIT), truncated: true }
}

function previewLine(text: string, maxLen = 120): string {
  const one = text.replace(/\s+/g, ' ').trim()
  if (one.length <= maxLen) return one
  return `${one.slice(0, maxLen - 1)}…`
}

export function useApplicantStatusAction(jobId: Ref<string> | ComputedRef<string>) {
  const { fetchReplySettings, patchStatus, bulkPatchStatus, feedback, error } =
    useEmployerApplicants()
  const { hasPlusOrProAccess, load: loadBilling, loaded: billingLoaded } =
    useBillingAccount()

  const autoReplyOpen = ref(false)
  const autoReplyTitle = ref('')
  const autoReplyMessage = ref('')
  const autoReplyPreview = ref('')
  const pendingAction = ref<{
    ids: string[]
    status: EmployerSettableStatus
    forceResend?: boolean
  } | null>(null)

  const resolvedJobId = computed(() => unref(jobId))

  function autoReplyTitleFor(status: EmployerSettableStatus, count: number): string {
    if (count > 1) {
      return S.applicantsBulkAutoReply.replace('{count}', String(count))
    }
    if (status === 'interview_invited') return S.applicantsAutoReplyConfirmInterview
    if (status === 'rejected') return S.applicantsAutoReplyConfirmReject
    return S.applicantsChangeStatus
  }

  async function executeStatusChange(
    ids: string[],
    status: EmployerSettableStatus,
    sendAutoReply: boolean,
    forceResend?: boolean,
  ): Promise<boolean> {
    if (!ids.length) return false
    if (ids.length === 1) {
      return patchStatus(ids[0]!, status, {
        send_auto_reply: sendAutoReply,
        force_resend: forceResend,
      })
    }
    const res = await bulkPatchStatus(ids, status, { send_auto_reply: sendAutoReply })
    if (!res) return false
    if (res.failed.length > 0) {
      error.value = S.applicantsBulkPartialFailure.replace(
        '{count}',
        String(res.failed.length),
      )
      return res.updated > 0
    }
    return true
  }

  /** `confirm` = dialog opened; `done` = status change finished (check page reload). */
  async function requestStatusChange(
    ids: string[],
    status: EmployerSettableStatus,
    opts?: { forceResend?: boolean },
  ): Promise<'confirm' | 'done'> {
    const { ids: limited, truncated } = limitApplicantBulkIds(ids)
    if (!limited.length) return 'done'

    if (AUTO_REPLY_STATUSES.includes(status)) {
      if (!billingLoaded.value) {
        await loadBilling()
      }
      if (!hasPlusOrProAccess.value) {
        await executeStatusChange(limited, status, false)
        feedback.value =
          truncated ? S.applicantsBulkLimitWarning : S.applicantsAutoReplyPlusProOnly
        return 'done'
      }
      const settings = await fetchReplySettings(resolvedJobId.value)
      if (!settings) {
        error.value = S.applicantsReplySettingsLoadFailed
        await executeStatusChange(limited, status, false)
        return 'done'
      }
      if (settings.auto_replies_available === false) {
        await executeStatusChange(limited, status, false)
        feedback.value =
          truncated ? S.applicantsBulkLimitWarning : S.applicantsAutoReplyPlusProOnly
        return 'done'
      }
      const enabled =
        status === 'interview_invited'
          ? settings.interview_auto_reply_enabled
          : settings.rejection_auto_reply_enabled
      const template =
        status === 'interview_invited'
          ? settings?.interview_template
          : settings?.rejection_template
      if (!enabled && !opts?.forceResend) {
        await executeStatusChange(limited, status, false)
        feedback.value =
          truncated ? S.applicantsBulkLimitWarning : S.applicantsAutoReplyDisabledHint
        return 'done'
      }
      pendingAction.value = {
        ids: limited,
        status,
        forceResend: opts?.forceResend,
      }
      autoReplyTitle.value = autoReplyTitleFor(status, limited.length)
      autoReplyMessage.value = opts?.forceResend ? S.applicantsAutoReplyResendHint : ''
      autoReplyPreview.value =
        template?.trim() ?
          `${S.applicantsAutoReplyPreviewPrefix} ${previewLine(template)}`
        : ''
      autoReplyOpen.value = true
      return 'confirm'
    }

    await executeStatusChange(limited, status, false)
    if (truncated) feedback.value = S.applicantsBulkLimitWarning
    return 'done'
  }

  function closeAutoReply(): void {
    autoReplyOpen.value = false
    pendingAction.value = null
    autoReplyPreview.value = ''
  }

  async function confirmAutoReply(send: boolean): Promise<{
    ok: boolean
    ids: string[]
    status?: EmployerSettableStatus
  }> {
    const action = pendingAction.value
    autoReplyOpen.value = false
    pendingAction.value = null
    autoReplyPreview.value = ''
    if (!action) return { ok: false, ids: [] }
    const ok = await executeStatusChange(
      action.ids,
      action.status,
      send,
      action.forceResend,
    )
    return { ok, ids: action.ids, status: action.status }
  }

  function needsAutoReplyConfirm(status: ApplicationStatus | string): boolean {
    return AUTO_REPLY_STATUSES.includes(status as EmployerSettableStatus)
  }

  return {
    autoReplyOpen,
    autoReplyTitle,
    autoReplyMessage,
    autoReplyPreview,
    pendingAction,
    requestStatusChange,
    confirmAutoReply,
    closeAutoReply,
    needsAutoReplyConfirm,
  }
}
