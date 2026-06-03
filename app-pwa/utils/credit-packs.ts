/** Credit pack row from GET /api/payments/credit-packs */
export type CreditPackRow = {
  price_id?: string | null
  credits: number
  unit_amount: number
  currency: string
  slug?: string
  name_sk?: string
  badge?: string | null
}

export function isPurchasableCreditPack(
  pack: CreditPackRow,
): pack is CreditPackRow & { price_id: string } {
  return typeof pack.price_id === 'string' && pack.price_id.trim().startsWith('price_')
}

export function filterPurchasableCreditPacks<T extends CreditPackRow>(packs: T[]): Array<T & { price_id: string }> {
  return packs.filter(isPurchasableCreditPack)
}
