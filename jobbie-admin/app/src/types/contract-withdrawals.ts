export type ContractWithdrawalStatus = 'pending' | 'approved' | 'rejected'

export type ContractWithdrawalProduct = 'subscription' | 'credits'

export type ContractWithdrawalReason =
  | 'changed_mind'
  | 'no_longer_needed'
  | 'other'

export type ContractWithdrawalItem = {
  id: string
  status: ContractWithdrawalStatus
  name: string
  email: string
  product: ContractWithdrawalProduct
  invoice_number: string
  purchase_date: string
  reason: ContractWithdrawalReason | null
  reason_other: string | null
  submitted_at: string
  status_updated_at: string | null
  status_updated_by: string | null
}

export type ContractWithdrawalListResponse = {
  items: ContractWithdrawalItem[]
  next_cursor: string | null
}
