import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SkRpoLookupService } from '../registry/sk-rpo-lookup.service';
import type { SkCompanySearchResult } from '../registry/sk-rpo-search.util';
import { TypesenseService } from '../search/typesense.service';
import { firstRpcTableRow } from '../common/rpc-table-row';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  SkCompanyResponseDto,
  SkCvSkillResponseDto,
  SkMunicipalityResponseDto,
  SkSchoolLevelDto,
  SkSchoolResponseDto,
} from './locations.dto';

type MunicipalityRpcRow = {
  id: number;
  name: string;
  kraj: string;
  okres: string;
};

type CvSkillRpcRow = {
  id: number;
  name: string;
};

type CompanyRpcRow = {
  id: number;
  rpo_id: number;
  name: string;
  ico: string | null;
  municipality: string | null;
};

const COMPANY_MEMORY_TTL_MS = 15 * 60 * 1000;
const COMPANY_MEMORY_MAX_KEYS = 300;
const SCHOOL_MEMORY_TTL_MS = 15 * 60 * 1000;
const SCHOOL_MEMORY_MAX_KEYS = 300;

type CompanyMemoryEntry = { exp: number; data: SkCompanyResponseDto[] };
type SchoolMemoryEntry = { exp: number; data: SkSchoolResponseDto[] };

type SchoolRpcRow = {
  id: number;
  name: string;
  level: string;
  country: string;
  municipality: string | null;
};

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);
  private readonly companySearchMemory = new Map<string, CompanyMemoryEntry>();
  private readonly schoolSearchMemory = new Map<string, SchoolMemoryEntry>();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly skRpoLookup: SkRpoLookupService,
    private readonly typesense: TypesenseService,
  ) {}

  async ensureSkCvSkill(name: string): Promise<SkCvSkillResponseDto> {
    const trimmed = name.trim();
    const { data, error } = await this.supabase.getClient().rpc('ensure_sk_cv_skill', {
      p_name: trimmed,
    });
    if (error) {
      const msg = error.message ?? '';
      if (
        msg.includes('cv_skill_name_too_short') ||
        msg.includes('cv_skill_name_too_long')
      ) {
        throw new BadRequestException('Neplatný názov znalosti.');
      }
      throw new InternalServerErrorException(msg || 'ensure_sk_cv_skill failed');
    }
    const row = firstRpcTableRow(data as CvSkillRpcRow | CvSkillRpcRow[] | null);
    if (!row) {
      this.logger.warn(
        `ensure_sk_cv_skill returned no row for name=${JSON.stringify(trimmed)}`,
      );
      throw new InternalServerErrorException('ensure_sk_cv_skill returned no row');
    }
    return {
      id: Number(row.id),
      name: String(row.name ?? trimmed),
    };
  }

  async ensureSkMunicipality(name: string): Promise<SkMunicipalityResponseDto> {
    const trimmed = name.trim();
    const { data, error } = await this.supabase.getClient().rpc(
      'ensure_sk_municipality',
      { p_name: trimmed },
    );
    if (error) {
      const msg = error.message ?? '';
      if (
        msg.includes('municipality_name_too_short') ||
        msg.includes('municipality_name_too_long')
      ) {
        throw new BadRequestException('Neplatný názov obce.');
      }
      throw new InternalServerErrorException(msg || 'ensure_sk_municipality failed');
    }
    const row = firstRpcTableRow(
      data as MunicipalityRpcRow | MunicipalityRpcRow[] | null,
    );
    if (!row) {
      throw new InternalServerErrorException('ensure_sk_municipality returned no row');
    }
    return {
      id: Number(row.id),
      name: String(row.name ?? trimmed),
      kraj: String(row.kraj ?? ''),
      okres: String(row.okres ?? ''),
    };
  }

  /**
   * Fast local search with RPO write-through when the cache has fewer hits than requested.
   * In-process memory cache avoids repeat DB/RPO work without Redis.
   */
  async searchSkCompanies(query: string, limit: number): Promise<SkCompanyResponseDto[]> {
    const q = query.trim();
    if (q.length < 3) {
      return [];
    }
    const pLimit = Math.min(80, Math.max(1, limit));
    const memKey = `${q.toLocaleLowerCase('sk-SK')}:${pLimit}`;
    const cached = this.companySearchMemory.get(memKey);
    if (cached && cached.exp > Date.now()) {
      return cached.data;
    }

    let rows = await this.searchSkCompaniesDb(q, pLimit);
    if (rows.length < pLimit) {
      const fromRpo = await this.skRpoLookup.searchCompaniesByFullName(q, pLimit);
      if (fromRpo.length > 0) {
        await this.upsertSkCompaniesFromRpo(fromRpo);
        rows = await this.searchSkCompaniesDb(q, pLimit);
      }
    }

    this.rememberCompanySearch(memKey, rows);
    return rows;
  }

  private async searchSkCompaniesDb(
    query: string,
    limit: number,
  ): Promise<SkCompanyResponseDto[]> {
    const { data, error } = await this.supabase.getReadClient().rpc(
      'search_sk_companies',
      { p_query: query, p_limit: limit },
    );
    if (error) {
      this.logger.warn(`search_sk_companies failed: ${error.message}`);
      return [];
    }
    const rows = (data ?? []) as CompanyRpcRow[];
    return rows.map((r) => ({
      id: Number(r.rpo_id),
      name: String(r.name ?? ''),
      ico: r.ico ? String(r.ico) : null,
      municipality: r.municipality ? String(r.municipality) : null,
    }));
  }

  private async upsertSkCompaniesFromRpo(rows: SkCompanySearchResult[]): Promise<void> {
    const payload = rows.map((r) => ({
      rpo_id: r.id,
      name: r.name,
      ico: r.ico,
      municipality: r.municipality,
    }));
    const { error } = await this.supabase.getClient().rpc('upsert_sk_companies_batch', {
      p_rows: payload,
    });
    if (error) {
      this.logger.warn(`upsert_sk_companies_batch failed: ${error.message}`);
    }
  }

  private rememberCompanySearch(key: string, data: SkCompanyResponseDto[]): void {
    if (this.companySearchMemory.size >= COMPANY_MEMORY_MAX_KEYS) {
      const first = this.companySearchMemory.keys().next().value;
      if (first) this.companySearchMemory.delete(first);
    }
    this.companySearchMemory.set(key, {
      exp: Date.now() + COMPANY_MEMORY_TTL_MS,
      data,
    });
  }

  async searchSkSchools(
    query: string,
    level: SkSchoolLevelDto,
    limit: number,
  ): Promise<SkSchoolResponseDto[]> {
    const q = query.trim();
    if (q.length < 3) {
      return [];
    }
    const pLimit = Math.min(80, Math.max(1, limit));
    const memKey = `${level}:${q.toLocaleLowerCase('sk-SK')}:${pLimit}`;
    const cached = this.schoolSearchMemory.get(memKey);
    if (cached && cached.exp > Date.now()) {
      return cached.data;
    }

    const fromTypesense = await this.typesense.searchSkSchools(q, level, pLimit);
    if (fromTypesense !== null) {
      this.rememberSchoolSearch(memKey, fromTypesense);
      return fromTypesense;
    }

    const rows = await this.searchSkSchoolsDb(q, level, pLimit);
    this.rememberSchoolSearch(memKey, rows);
    return rows;
  }

  private async searchSkSchoolsDb(
    query: string,
    level: SkSchoolLevelDto,
    limit: number,
  ): Promise<SkSchoolResponseDto[]> {
    const { data, error } = await this.supabase.getReadClient().rpc(
      'search_sk_education_institutions',
      { p_query: query, p_level: level, p_limit: limit },
    );
    if (error) {
      this.logger.warn(`search_sk_education_institutions failed: ${error.message}`);
      return [];
    }
    const rows = (data ?? []) as SchoolRpcRow[];
    return rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name ?? ''),
      level: r.level === 'secondary' ? 'secondary' : 'university',
      country: r.country === 'CZ' ? 'CZ' : 'SK',
      municipality: r.municipality ? String(r.municipality) : null,
    }));
  }

  private rememberSchoolSearch(key: string, data: SkSchoolResponseDto[]): void {
    if (this.schoolSearchMemory.size >= SCHOOL_MEMORY_MAX_KEYS) {
      const first = this.schoolSearchMemory.keys().next().value;
      if (first) this.schoolSearchMemory.delete(first);
    }
    this.schoolSearchMemory.set(key, {
      exp: Date.now() + SCHOOL_MEMORY_TTL_MS,
      data,
    });
  }
}
