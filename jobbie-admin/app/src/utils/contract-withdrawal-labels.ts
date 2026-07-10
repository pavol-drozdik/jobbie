import type {
  ContractWithdrawalProduct,
  ContractWithdrawalReason,
  ContractWithdrawalStatus,
} from '../types/contract-withdrawals'

const PRODUCT_LABELS: Record<ContractWithdrawalProduct, string> = {
  subscription: 'Predplatné',
  credits: 'Kredity',
}

const REASON_LABELS: Record<ContractWithdrawalReason, string> = {
  changed_mind: 'Rozmyslel/a som si nákup',
  no_longer_needed: 'Službu už nepotrebujem',
  other: 'Iné',
}

const STATUS_LABELS: Record<ContractWithdrawalStatus, string> = {
  pending: 'Čaká na vybavenie',
  approved: 'Schválené',
  rejected: 'Zamietnuté',
}

export const contractWithdrawalStatusOptions: Array<{
  label: string
  value: ContractWithdrawalStatus
}> = [
  { label: STATUS_LABELS.pending, value: 'pending' },
  { label: STATUS_LABELS.approved, value: 'approved' },
  { label: STATUS_LABELS.rejected, value: 'rejected' },
]

export const contractWithdrawalStatusFilterOptions = [
  { label: 'Všetky', value: '' },
  ...contractWithdrawalStatusOptions,
]

export function contractWithdrawalProductLabel(
  product: ContractWithdrawalProduct,
): string {
  return PRODUCT_LABELS[product] ?? product
}

export function contractWithdrawalReasonLabel(
  reason: ContractWithdrawalReason | null,
  reasonOther: string | null,
): string {
  if (!reason) return '—'
  const base = REASON_LABELS[reason] ?? reason
  if (reason === 'other' && reasonOther?.trim()) {
    return `${base} — ${reasonOther.trim()}`
  }
  return base
}

export function contractWithdrawalStatusLabel(
  status: ContractWithdrawalStatus,
): string {
  return STATUS_LABELS[status] ?? status
}
