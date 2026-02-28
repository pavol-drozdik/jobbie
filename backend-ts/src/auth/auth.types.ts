export enum UserRole {
  company = 'company',
  individual = 'individual',
}

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
}
