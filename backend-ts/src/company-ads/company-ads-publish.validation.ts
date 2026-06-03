import { BadRequestException } from '@nestjs/common';
import { normalizeSkIco } from '../registry/sk-rpo-ico.util';
import {
  COMPANY_AD_PRICE_TYPES_REQUIRING_AMOUNT,
  COMPANY_AD_TITLE_MAX_LENGTH,
} from './company-ads.constants';
import { parseOptionalMoneyAmount } from '../common/money-amount.util';

export type CompanyAdPublishShape = {
  title?: string | null;
  body?: string | null;
  category?: string | null;
  profile_type?: string | null;
  services?: string[] | null;
  region?: string | null;
  city?: string | null;
  service_areas?: string[] | null;
  price_type?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  price_negotiable?: boolean | null;
  preferred_contact_method?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  founded_year?: number | null;
  ico?: string | null;
};

function mergePublishShape(
  existing: CompanyAdPublishShape,
  partial: CompanyAdPublishShape,
): CompanyAdPublishShape {
  return {
    title: partial.title !== undefined ? partial.title : existing.title,
    body: partial.body !== undefined ? partial.body : existing.body,
    category: partial.category !== undefined ? partial.category : existing.category,
    profile_type:
      partial.profile_type !== undefined ? partial.profile_type : existing.profile_type,
    services: partial.services !== undefined ? partial.services : existing.services,
    region: partial.region !== undefined ? partial.region : existing.region,
    city: partial.city !== undefined ? partial.city : existing.city,
    service_areas:
      partial.service_areas !== undefined ? partial.service_areas : existing.service_areas,
    price_type: partial.price_type !== undefined ? partial.price_type : existing.price_type,
    price_min: partial.price_min !== undefined ? partial.price_min : existing.price_min,
    price_max: partial.price_max !== undefined ? partial.price_max : existing.price_max,
    price_negotiable:
      partial.price_negotiable !== undefined
        ? partial.price_negotiable
        : existing.price_negotiable,
    preferred_contact_method:
      partial.preferred_contact_method !== undefined
        ? partial.preferred_contact_method
        : existing.preferred_contact_method,
    contact_email:
      partial.contact_email !== undefined ? partial.contact_email : existing.contact_email,
    contact_phone:
      partial.contact_phone !== undefined ? partial.contact_phone : existing.contact_phone,
    website: partial.website !== undefined ? partial.website : existing.website,
    founded_year:
      partial.founded_year !== undefined ? partial.founded_year : existing.founded_year,
    ico: partial.ico !== undefined ? partial.ico : existing.ico,
  };
}

function isOnlineOnly(serviceAreas: string[] | null | undefined): boolean {
  return Array.isArray(serviceAreas) && serviceAreas.includes('online');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseOptionalNumber(value: unknown): number | null {
  return parseOptionalMoneyAmount(value);
}

/**
 * Validates merged ad state before publish. Throws BadRequestException with Slovak message.
 * NOTE: Draft PATCH may skip this; publish/create-with-publish always calls it.
 */
export function validateCompanyAdForPublish(
  existing: CompanyAdPublishShape,
  partial: CompanyAdPublishShape = {},
): void {
  const ad = mergePublishShape(existing, partial);

  const title = String(ad.title ?? '').trim();
  if (!title) {
    throw new BadRequestException('Názov je povinný.');
  }
  if (title.length > COMPANY_AD_TITLE_MAX_LENGTH) {
    throw new BadRequestException(
      `Názov môže mať najviac ${COMPANY_AD_TITLE_MAX_LENGTH} znakov.`,
    );
  }

  const body = String(ad.body ?? '').trim();
  if (!body) {
    throw new BadRequestException('Popis je povinný.');
  }

  if (!String(ad.category ?? '').trim()) {
    throw new BadRequestException('Kategória je povinná.');
  }

  if (!isOnlineOnly(ad.service_areas)) {
    if (!String(ad.region ?? '').trim()) {
      throw new BadRequestException('Kraj je povinný (alebo zvoľte online služby).');
    }
    if (!String(ad.city ?? '').trim()) {
      throw new BadRequestException('Mesto je povinné (alebo zvoľte online služby).');
    }
  }

  const priceType = ad.price_type ?? 'negotiable';
  const priceNegotiable = ad.price_negotiable === true;
  const priceMin = parseOptionalNumber(ad.price_min);
  const priceMax = parseOptionalNumber(ad.price_max);

  if (priceMin != null && priceMin < 0) {
    throw new BadRequestException('Cena od musí byť kladná.');
  }
  if (priceMax != null && priceMax < 0) {
    throw new BadRequestException('Cena do musí byť kladná.');
  }
  if (priceMin != null && priceMax != null && priceMax < priceMin) {
    throw new BadRequestException('Cena do musí byť väčšia alebo rovná cene od.');
  }

  const requiresAmount =
    (COMPANY_AD_PRICE_TYPES_REQUIRING_AMOUNT as readonly string[]).includes(priceType) &&
    !priceNegotiable;

  if (requiresAmount && priceMin == null) {
    throw new BadRequestException('Zadajte cenu od alebo zvoľte cenu dohodou.');
  }

  const contactMethod = ad.preferred_contact_method ?? 'platform';
  const email = String(ad.contact_email ?? '').trim();
  const phone = String(ad.contact_phone ?? '').trim();
  const website = String(ad.website ?? '').trim();

  if (contactMethod === 'email') {
    if (!email) {
      throw new BadRequestException('E-mail je povinný pri preferovanom kontakte e-mailom.');
    }
    if (!isValidEmail(email)) {
      throw new BadRequestException('Neplatný formát e-mailu.');
    }
  }
  if (contactMethod === 'phone' && !phone) {
    throw new BadRequestException('Telefón je povinný pri preferovanom telefonickom kontakte.');
  }
  if (contactMethod === 'website') {
    if (!website) {
      throw new BadRequestException('Webstránka je povinná pri preferovanom kontakte cez web.');
    }
    if (!isValidUrl(website)) {
      throw new BadRequestException('Neplatná URL webstránky.');
    }
  }
  if (email && !isValidEmail(email)) {
    throw new BadRequestException('Neplatný formát e-mailu.');
  }
  if (website && !isValidUrl(website)) {
    throw new BadRequestException('Neplatná URL webstránky.');
  }

  const icoRaw = String(ad.ico ?? '').trim();
  if (icoRaw) {
    const ico = normalizeSkIco(icoRaw);
    if (ico.length !== 8) {
      throw new BadRequestException('IČO musí mať 8 číslic.');
    }
  }

  const foundedYear = ad.founded_year;
  if (foundedYear != null) {
    const y = Number(foundedYear);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(y) || y < 1800 || y > currentYear) {
      throw new BadRequestException('Rok založenia nie je platný.');
    }
  }
}

export function publishCostCredits(durationMonths: number | undefined): number {
  const months = resolvePublishMonths(durationMonths);
  return 3 * months;
}

export function resolvePublishMonths(durationMonths: number | undefined): number {
  if (durationMonths == null || Number.isNaN(durationMonths)) {
    return 1;
  }
  return Math.min(12, Math.max(1, Math.floor(durationMonths)));
}

