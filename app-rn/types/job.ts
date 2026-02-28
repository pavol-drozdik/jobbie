/** Job shape from backend (base44-style, Supabase job_offers). */
export type Job = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  contract_type: string | null;
  requirements: string | null;
  salary: string | null;
  job_type: string | null;
  expires_at: string | null;
  is_draft: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category: string | null;
  is_urgent: boolean;
  is_featured: boolean;
  compensation_type: string | null;
  compensation_amount: number | null;
  workers_needed: number;
  application_deadline: string | null;
  completion_deadline: string | null;
  employer_email: string | null;
  employer_name: string | null;
  photos: string[];
  applications_count: number;
};

export const CATEGORIES = [
  'construction',
  'moving',
  'cleaning',
  'babysitting',
  'gardening',
  'delivery',
  'warehouse',
  'events',
  'painting',
  'other',
] as const;

export const JOB_TYPES = [
  { value: 'full_time', label: 'Plný úväzok' },
  { value: 'part_time', label: 'Skrátený úväzok' },
  { value: 'brigada', label: 'Brigáda' },
] as const;

export const COMPENSATION_TYPES = [
  { value: 'hourly', label: 'Hodinová sadzba' },
  { value: 'fixed', label: 'Fixná cena' },
  { value: 'on_request', label: 'Cena dohodou' },
  { value: 'auction', label: 'Aukcia' },
] as const;

export function getCompensationLabel(
  type: string | null | undefined,
  amount: number | null | undefined
): string {
  if (type === 'hourly' && amount != null) return `${amount} €/hod`;
  if (type === 'fixed' && amount != null) return `${amount} €`;
  if (type === 'on_request') return 'Cena dohodou';
  if (type === 'auction') return 'Aukcia';
  return amount != null ? `${amount} €` : 'Dohodou';
}
