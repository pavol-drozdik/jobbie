export type AdminUserListItem = {
  id: string
  email: string | null
  display_name: string | null
  company_name: string | null
  app_role: string | null
  account_status: string | null
  created_at: string
}

export type AdminUserDetail = AdminUserListItem & {
  credits: number
  last_sign_in_at: string | null
}
