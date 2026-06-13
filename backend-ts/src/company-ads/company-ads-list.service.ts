import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  attachShowTopBadgeToAds,
  sortByTopBadgeFirst,
} from '../billing/listing-badge-enrichment.util';
import { ListingTopPromotionService } from '../billing/listing-top-promotion.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { CompanyAdListItemDto } from './company-ads.dto';
import {
  type AdRow,
  type OwnerListRow,
  toListItemDto,
} from './company-ads.mapper';
import type { CompanyAdViewerContext } from './public-response.mapper';

export const COMPANY_AD_LIST_SELECT =
  'id, owner_id, thumbnail_url, title, category, status, starts_at, ends_at, created_at, updated_at, profile_type, tagline, region, city, price_type, price_min, price_max, price_negotiable, availability, works_weekends, evening_hours, emergency_service, preferred_contact_method, show_phone_publicly, show_email_publicly, contact_email, contact_phone, website, services, service_areas';

export type CompanyAdListQuery = {
  category?: string;
  q?: string;
  location?: string;
  region?: string;
  city?: string;
  services?: string;
  availability?: string;
  priceType?: string;
  priceMin?: string;
  profileType?: string;
  weekend?: string;
  emergency?: string;
  online?: string;
  limit: number;
  offset: number;
};

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

@Injectable()
export class CompanyAdsListService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly topPromotion: ListingTopPromotionService,
  ) {}

  private async enrichAdsTopBadge(
    ads: CompanyAdListItemDto[],
  ): Promise<CompanyAdListItemDto[]> {
    if (ads.length === 0) {
      return ads;
    }
    const topAdIds = await this.topPromotion.getActiveTopCompanyAdIds(
      ads.map((a) => a.id),
    );
    const enriched = attachShowTopBadgeToAds(ads, topAdIds);
    return sortByTopBadgeFirst(enriched);
  }

  private listFetchCap(offset: number, limit: number): number {
    return Math.min(200, Math.max(80, offset + limit * 3));
  }

  private async sortAdRowsTopFirst(rows: AdRow[]): Promise<AdRow[]> {
    if (rows.length <= 1) {
      return rows;
    }
    const topAdIds = await this.topPromotion.getActiveTopCompanyAdIds(
      rows.map((r) => String(r.id ?? '')),
    );
    const withBadge = rows.map((r) => ({
      ...r,
      show_top_badge: topAdIds.has(String(r.id ?? '')),
    }));
    return sortByTopBadgeFirst(withBadge) as AdRow[];
  }

  async list(
    params: CompanyAdListQuery,
    viewer: CompanyAdViewerContext | null,
  ): Promise<CompanyAdListItemDto[]> {
    const now = new Date().toISOString();
    const base = () =>
      this.supabase
        .getReadClient()
        .from('company_ads')
        .select(COMPANY_AD_LIST_SELECT, { count: 'exact' })
        .eq('status', 'active')
        .gt('ends_at', now);

    let query = this.applyFilters(base(), params);

    if (params.location?.trim()) {
      const ownerIds = await this.ownerIdsMatchingLocation(params.location.trim());
      const needle = escapeIlike(params.location.trim());
      const locOr = `city.ilike.%${needle}%,region.ilike.%${needle}%`;
      if (ownerIds.length > 0) {
        query = query.or(`${locOr},owner_id.in.(${ownerIds.join(',')})`);
      } else {
        query = query.or(locOr);
      }
    }

    query = query.order('created_at', { ascending: false });

    const fetchCap = this.listFetchCap(params.offset, params.limit);
    const { data: rows, error } = await query.limit(fetchCap);

    if (error) {
      throw new ForbiddenException(error.message);
    }

    let list = (rows ?? []) as AdRow[];
    list = await this.sortAdRowsTopFirst(list);
    list = list.slice(params.offset, params.offset + params.limit);
    const ownerIds = [...new Set(list.map((r) => String(r.owner_id)))];
    const ownersMap = await this.loadOwnersMap(ownerIds);

    const dtos = list.map((r) =>
      toListItemDto(r, ownersMap.get(String(r.owner_id)), viewer),
    );
    return this.enrichAdsTopBadge(dtos);
  }

  /** Owner hub: all statuses for the authenticated provider. */
  async listMine(
    ownerId: string,
    limit: number,
    offset: number,
  ): Promise<CompanyAdListItemDto[]> {
    const viewer: CompanyAdViewerContext = { userId: ownerId, isAdmin: false };
    const { data: rows, error } = await this.supabase
      .getClient()
      .from('company_ads')
      .select(COMPANY_AD_LIST_SELECT)
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new ForbiddenException(error.message);
    }

    const list = (rows ?? []) as AdRow[];
    const ownersMap = await this.loadOwnersMap([ownerId]);
    const owner = ownersMap.get(ownerId);
    const dtos = list.map((r) => toListItemDto(r, owner, viewer));
    return this.enrichAdsTopBadge(dtos);
  }

  private applyFilters(query: any, params: CompanyAdListQuery): any {
    let q = query;

    if (params.category && params.category !== 'all') {
      const parts = params.category
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (parts.length === 1) {
        q = q.eq('category', parts[0]!);
      } else if (parts.length > 1) {
        q = q.in('category', parts);
      }
    }

    if (params.region?.trim()) {
      q = q.ilike('region', `%${escapeIlike(params.region.trim())}%`);
    }
    if (params.city?.trim()) {
      q = q.ilike('city', `%${escapeIlike(params.city.trim())}%`);
    }
    if (params.availability?.trim()) {
      q = q.eq('availability', params.availability.trim());
    }
    if (params.priceType?.trim()) {
      q = q.eq('price_type', params.priceType.trim());
    }
    if (params.profileType?.trim()) {
      q = q.eq('profile_type', params.profileType.trim());
    }
    if (params.weekend === 'true' || params.weekend === '1') {
      q = q.eq('works_weekends', true);
    }
    if (params.emergency === 'true' || params.emergency === '1') {
      q = q.eq('emergency_service', true);
    }
    if (params.online === 'true' || params.online === '1') {
      q = q.contains('service_areas', ['online']);
    }

    if (params.priceMin?.trim()) {
      const min = Number(params.priceMin);
      if (Number.isFinite(min)) {
        q = q.or(`price_min.gte.${min},price_negotiable.eq.true`);
      }
    }

    if (params.services?.trim()) {
      const wanted = params.services
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (wanted.length > 0) {
        q = q.overlaps('services', wanted);
      }
    }

    if (params.q?.trim()) {
      const needle = escapeIlike(params.q.trim());
      q = q.or(
        `title.ilike.%${needle}%,tagline.ilike.%${needle}%,city.ilike.%${needle}%,region.ilike.%${needle}%`,
      );
    }

    return q;
  }

  private async ownerIdsMatchingLocation(location: string): Promise<string[]> {
    const needle = `%${escapeIlike(location)}%`;
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id')
      .eq('is_deleted', false)
      .ilike('location', needle)
      .limit(200);

    if (error || !data?.length) {
      return [];
    }
    return data.map((r) => String((r as { id: string }).id));
  }

  async loadOwnersMap(ownerIds: string[]): Promise<Map<string, OwnerListRow>> {
    const map = new Map<string, OwnerListRow>();
    if (ownerIds.length === 0) {
      return map;
    }
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select(
        'id, role, location, company_name, display_name, first_name, last_name, logo_url, avatar_url, registry_verified_at',
      )
      .in('id', ownerIds)
      .eq('is_deleted', false);

    if (error || !data?.length) {
      return map;
    }
    for (const row of data as OwnerListRow[]) {
      map.set(String(row.id), row);
    }
    return map;
  }
}
