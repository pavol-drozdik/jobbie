import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithTimeout } from '../common/fetch-with-timeout';
import {
  normalizeSkIco,
  parseRpoSearchResponseIndicatesActiveSubject,
} from './sk-rpo-ico.util';
import {
  parseRpoCompanySearchResponse,
  type SkCompanySearchResult,
} from './sk-rpo-search.util';

@Injectable()
export class SkRpoLookupService {
  private readonly logger = new Logger(SkRpoLookupService.name);

  constructor(private readonly config: ConfigService) {}

  private getBaseUrl(): string {
    const raw = this.config.get<string>('RPO_API_BASE_URL')?.trim();
    const base = raw && raw.length > 0 ? raw : 'https://api.statistics.sk/rpo/v1';
    return base.replace(/\/$/, '');
  }

  /**
   * Returns true when RPO lists at least one active subject for this IČO (8 digits).
   * On network/parse errors returns false (do not grant badge).
   */
  async isIcoActiveInRpo(rawIco: string | null | undefined): Promise<boolean> {
    const ico = normalizeSkIco(rawIco);
    if (ico.length !== 8) return false;
    const url = new URL(`${this.getBaseUrl()}/search`);
    url.searchParams.set('identifier', ico);
    url.searchParams.set('onlyActive', 'true');
    try {
      const res = await fetchWithTimeout(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeoutMs: 10_000,
        metricsTarget: 'rpo',
      });
      if (!res.ok) {
        this.logger.warn(`RPO search non-OK for ${ico}: ${res.status} ${res.statusText}`);
        return false;
      }
      const json: unknown = await res.json();
      return parseRpoSearchResponseIndicatesActiveSubject(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`RPO search failed for ${ico}: ${msg}`);
      return false;
    }
  }

  /**
   * Fulltext search over RPO (unified register: ORSR, živnostenský register / ZRSR, …).
   * Returns [] on network/parse errors.
   */
  async searchCompaniesByFullName(
    rawQuery: string,
    limit = 50,
  ): Promise<SkCompanySearchResult[]> {
    const q = rawQuery.trim();
    if (q.length < 2) return [];
    const url = new URL(`${this.getBaseUrl()}/search`);
    url.searchParams.set('fullName', q);
    url.searchParams.set('onlyActive', 'true');
    try {
      const res = await fetchWithTimeout(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeoutMs: 10_000,
        metricsTarget: 'rpo',
      });
      if (!res.ok) {
        this.logger.warn(
          `RPO fullName search non-OK for "${q}": ${res.status} ${res.statusText}`,
        );
        return [];
      }
      const json: unknown = await res.json();
      return parseRpoCompanySearchResponse(json, limit);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`RPO fullName search failed for "${q}": ${msg}`);
      return [];
    }
  }
}
