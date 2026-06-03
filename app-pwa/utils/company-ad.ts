export type CompanyAdStatus = 'draft' | 'active' | 'paused' | 'archived' | 'expired'

export type CompanyAdGalleryItem = {
  url: string
  caption?: string | null
}

export type CompanyAd = {
  id: string
  owner_id: string
  thumbnail_url: string | null
  title: string
  body: string
  category: string
  status: CompanyAdStatus
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
  profile_type: string
  tagline: string | null
  region: string | null
  city: string | null
  street_address: string | null
  postal_code: string | null
  show_exact_address: boolean
  price_type: string | null
  price_min: number | null
  price_max: number | null
  price_negotiable: boolean
  price_note: string | null
  availability: string | null
  works_weekends: boolean
  evening_hours: boolean
  emergency_service: boolean
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  preferred_contact_method: string
  show_phone_publicly: boolean
  show_email_publicly: boolean
  ico: string | null
  dic: string | null
  ic_dph: string | null
  founded_year: number | null
  employee_count: string | null
  duration_months: number | null
  services: string[]
  specializations: string[]
  certifications: string[]
  service_areas: string[]
  custom_service_areas: string[]
  gallery_items: CompanyAdGalleryItem[]
  owner_location?: string | null
  owner_display_name?: string | null
  owner_company_name?: string | null
  owner_logo_url?: string | null
  owner_avatar_url?: string | null
  owner_registry_verified?: boolean
  owner_role?: string | null
  show_top_badge?: boolean
}

/** Row from GET /api/company-ads (public list with owner snapshot; body omitted). */
export type CompanyAdListItem = Omit<CompanyAd, 'body'> & {
  body?: string
  owner_location: string | null
  owner_display_name: string | null
  owner_company_name: string | null
  owner_logo_url: string | null
  owner_avatar_url: string | null
  owner_registry_verified: boolean
}

export type CompanyAdFormPayload = {
  title: string
  body: string
  category: string
  thumbnail_url: string | null
  profile_type: string
  tagline: string | null
  region: string | null
  city: string | null
  street_address: string | null
  postal_code: string | null
  show_exact_address: boolean
  price_type: string | null
  price_min: number | null
  price_max: number | null
  price_negotiable: boolean
  price_note: string | null
  availability: string | null
  works_weekends: boolean
  evening_hours: boolean
  emergency_service: boolean
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  preferred_contact_method: string
  show_phone_publicly: boolean
  show_email_publicly: boolean
  ico: string | null
  dic: string | null
  ic_dph: string | null
  founded_year: number | null
  employee_count: string | null
  services: string[]
  specializations: string[]
  certifications: string[]
  service_areas: string[]
  custom_service_areas: string[]
  gallery_items: CompanyAdGalleryItem[]
}

export function emptyCompanyAdFormState(): CompanyAdFormPayload {
  return {
    title: '',
    body: '',
    category: 'stavba',
    thumbnail_url: null,
    profile_type: 'company',
    tagline: null,
    region: null,
    city: null,
    street_address: null,
    postal_code: null,
    show_exact_address: false,
    price_type: 'negotiable',
    price_min: null,
    price_max: null,
    price_negotiable: false,
    price_note: null,
    availability: null,
    works_weekends: false,
    evening_hours: false,
    emergency_service: false,
    contact_person: null,
    contact_email: null,
    contact_phone: null,
    website: null,
    preferred_contact_method: 'platform',
    show_phone_publicly: false,
    show_email_publicly: false,
    ico: null,
    dic: null,
    ic_dph: null,
    founded_year: null,
    employee_count: null,
    services: [],
    specializations: [],
    certifications: [],
    service_areas: [],
    custom_service_areas: [],
    gallery_items: [],
  }
}

export function companyAdToFormState(ad: CompanyAd): CompanyAdFormPayload {
  return {
    title: ad.title,
    body: ad.body,
    category: ad.category,
    thumbnail_url: ad.thumbnail_url,
    profile_type: ad.profile_type ?? 'company',
    tagline: ad.tagline,
    region: ad.region,
    city: ad.city,
    street_address: ad.street_address,
    postal_code: ad.postal_code,
    show_exact_address: ad.show_exact_address,
    price_type: ad.price_type ?? 'negotiable',
    price_min: ad.price_min,
    price_max: ad.price_max,
    price_negotiable: ad.price_negotiable,
    price_note: ad.price_note,
    availability: ad.availability,
    works_weekends: ad.works_weekends,
    evening_hours: ad.evening_hours,
    emergency_service: ad.emergency_service,
    contact_person: ad.contact_person,
    contact_email: ad.contact_email,
    contact_phone: ad.contact_phone,
    website: ad.website,
    preferred_contact_method: ad.preferred_contact_method ?? 'platform',
    show_phone_publicly: ad.show_phone_publicly,
    show_email_publicly: ad.show_email_publicly,
    ico: ad.ico,
    dic: ad.dic,
    ic_dph: ad.ic_dph,
    founded_year: ad.founded_year,
    employee_count: ad.employee_count,
    services: [...(ad.services ?? [])],
    specializations: [...(ad.specializations ?? [])],
    certifications: [...(ad.certifications ?? [])],
    service_areas: [...(ad.service_areas ?? [])],
    custom_service_areas: [...(ad.custom_service_areas ?? [])],
    gallery_items: [...(ad.gallery_items ?? [])],
  }
}
