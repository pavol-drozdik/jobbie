import { CREDITS_PER_AD_MONTH } from '../billing/billing.config';

export { CREDITS_PER_AD_MONTH };



export {
  JOB_CATEGORY_SLUGS as COMPANY_AD_CATEGORIES,
  type JobCategorySlug as CompanyAdCategory,
} from '../common/job-categories.constants';



export const COMPANY_AD_PROFILE_TYPES = [

  'company',

  'sole_trader',

  'freelancer',

] as const;



export type CompanyAdProfileType = (typeof COMPANY_AD_PROFILE_TYPES)[number];



export const COMPANY_AD_PRICE_TYPES = [

  'hourly',

  'per_sqm',

  'per_project',

  'per_unit',

  'negotiable',

  'hidden',

] as const;



export type CompanyAdPriceType = (typeof COMPANY_AD_PRICE_TYPES)[number];



export const COMPANY_AD_PRICE_TYPES_REQUIRING_AMOUNT = [

  'hourly',

  'per_sqm',

  'per_project',

  'per_unit',

] as const;



export const COMPANY_AD_AVAILABILITY = [

  'immediate',

  '7d',

  '14d',

  '30d',

  'by_agreement',

  'busy',

] as const;



export type CompanyAdAvailability = (typeof COMPANY_AD_AVAILABILITY)[number];



export const COMPANY_AD_SERVICE_AREAS = [

  'local_city',

  'region',

  'slovakia',

  'online',

  'custom',

] as const;



export type CompanyAdServiceArea = (typeof COMPANY_AD_SERVICE_AREAS)[number];



export const COMPANY_AD_CONTACT_METHODS = [

  'platform',

  'phone',

  'email',

  'website',

] as const;



export type CompanyAdContactMethod = (typeof COMPANY_AD_CONTACT_METHODS)[number];



export const COMPANY_AD_EMPLOYEE_COUNTS = [

  '1',

  '2-5',

  '6-10',

  '11-50',

  '51-200',

  '200+',

] as const;



export type CompanyAdEmployeeCount = (typeof COMPANY_AD_EMPLOYEE_COUNTS)[number];



export const COMPANY_AD_STATUSES = [

  'draft',

  'active',

  'paused',

  'archived',

  'expired',

] as const;



export type CompanyAdStatus = (typeof COMPANY_AD_STATUSES)[number];



export const COMPANY_AD_TITLE_MAX_LENGTH = 120;

export const COMPANY_AD_TAGLINE_MAX_LENGTH = 140;

export const COMPANY_AD_BODY_MAX_LENGTH = 8000;


