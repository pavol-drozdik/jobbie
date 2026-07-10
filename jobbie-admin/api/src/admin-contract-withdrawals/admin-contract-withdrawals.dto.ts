import { IsIn } from 'class-validator';

export const CONTRACT_WITHDRAWAL_STATUSES = [
  'pending',
  'approved',
  'rejected',
] as const;

export type ContractWithdrawalStatus =
  (typeof CONTRACT_WITHDRAWAL_STATUSES)[number];

export type ContractWithdrawalItemDto = {
  id: string;
  status: ContractWithdrawalStatus;
  name: string;
  email: string;
  product: 'subscription' | 'credits';
  invoice_number: string;
  purchase_date: string;
  reason: string | null;
  reason_other: string | null;
  submitted_at: string;
  status_updated_at: string | null;
  status_updated_by: string | null;
};

export type ContractWithdrawalListDto = {
  items: ContractWithdrawalItemDto[];
  next_cursor: string | null;
};

export class UpdateContractWithdrawalStatusDto {
  @IsIn([...CONTRACT_WITHDRAWAL_STATUSES])
  status!: ContractWithdrawalStatus;
}
