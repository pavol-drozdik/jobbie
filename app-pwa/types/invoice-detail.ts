export type InvoiceDetailLine = {
  description: string
  quantity: number | null
  amount: number
  currency: string
}

export type InvoiceDetailSupplier = {
  name: string
  address: string | null
  ico: string | null
  dic: string | null
  vat: string | null
  configured: boolean
}

export type InvoiceDetail = {
  id: string
  number: string | null
  status: string | null
  created: number
  due_date: number | null
  issued_at: number
  delivery_at: number
  variable_symbol: string | null
  constant_symbol: string
  payment_method_label: string
  currency: string
  subtotal: number
  tax: number
  total: number
  amount_due: number
  amount_paid: number
  lines: InvoiceDetailLine[]
  customer: {
    name: string | null
    email: string | null
    address: string | null
    custom_fields: Array<{ name: string; value: string }>
  }
  supplier: InvoiceDetailSupplier
  footer: string
  invoice_pdf: string | null
  can_pay: boolean
  payment_intent_client_secret: string | null
}
