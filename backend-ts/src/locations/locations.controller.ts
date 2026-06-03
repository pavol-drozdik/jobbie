import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { CatalogCacheService } from '../redis/catalog-cache.service';
import { EnsureSkCvSkillDto } from './ensure-sk-cv-skill.dto';
import { EnsureSkMunicipalityDto } from './ensure-sk-municipality.dto';
import type {
  SkCompanyResponseDto,
  SkCvSkillResponseDto,
  SkMunicipalityResponseDto,
  SkSchoolLevelDto,
  SkSchoolResponseDto,
} from './locations.dto';
import { LocationsService } from './locations.service';

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

@Controller('locations')
export class LocationsController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly catalogCache: CatalogCacheService,
    private readonly locations: LocationsService,
  ) {}

  @Get('sk-municipalities')
  @UseGuards(JwksAuthGuard)
  async searchSkMunicipalities(
    @Query('query') query?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<SkMunicipalityResponseDto[]> {
    const q = (query ?? '').trim();
    if (q.length < 2) {
      return [];
    }
    const parsed = Number.parseInt(String(limitRaw ?? '50'), 10);
    const pLimit = Number.isFinite(parsed)
      ? Math.min(80, Math.max(1, parsed))
      : 50;
    const cacheKey = `catalog:sk-municipalities:${q.toLowerCase()}:${pLimit}`;
    return this.catalogCache.getOrSet(
      cacheKey,
      async () => {
        const { data, error } = await this.supabase.getReadClient().rpc(
          'search_sk_municipalities',
          { p_query: q, p_limit: pLimit },
        );
        if (error) {
          throw new ForbiddenException(error.message);
        }
        const rows = (data ?? []) as MunicipalityRpcRow[];
        return rows.map((r) => ({
          id: Number(r.id),
          name: String(r.name ?? ''),
          kraj: String(r.kraj ?? ''),
          okres: String(r.okres ?? ''),
        }));
      },
      3600,
    );
  }

  @Get('sk-cv-skills')
  @UseGuards(JwksAuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async searchSkCvSkills(
    @Query('query') query?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<SkCvSkillResponseDto[]> {
    const q = (query ?? '').trim();
    if (q.length < 2) {
      return [];
    }
    const parsed = Number.parseInt(String(limitRaw ?? '50'), 10);
    const pLimit = Number.isFinite(parsed)
      ? Math.min(80, Math.max(1, parsed))
      : 50;
    const cacheKey = `catalog:sk-cv-skills:${q.toLowerCase()}:${pLimit}`;
    return this.catalogCache.getOrSet(
      cacheKey,
      async () => {
        const { data, error } = await this.supabase.getReadClient().rpc(
          'search_sk_cv_skills',
          { p_query: q, p_limit: pLimit },
        );
        if (error) {
          throw new ForbiddenException(error.message);
        }
        const rows = (data ?? []) as CvSkillRpcRow[];
        return rows.map((r) => ({
          id: Number(r.id),
          name: String(r.name ?? ''),
        }));
      },
      3600,
    );
  }

  @Get('sk-companies')
  @UseGuards(JwksAuthGuard)
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  async searchSkCompanies(
    @Query('query') query?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<SkCompanyResponseDto[]> {
    const q = (query ?? '').trim();
    if (q.length < 3) {
      return [];
    }
    const parsed = Number.parseInt(String(limitRaw ?? '50'), 10);
    const pLimit = Number.isFinite(parsed)
      ? Math.min(80, Math.max(1, parsed))
      : 50;
    return this.locations.searchSkCompanies(q, pLimit);
  }

  @Get('sk-schools')
  @UseGuards(JwksAuthGuard)
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  async searchSkSchools(
    @Query('query') query?: string,
    @Query('level') levelRaw?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<SkSchoolResponseDto[]> {
    const level = (levelRaw ?? '').trim() as SkSchoolLevelDto;
    if (level !== 'secondary' && level !== 'university') {
      throw new BadRequestException('Neplatný parameter level.');
    }
    const q = (query ?? '').trim();
    if (q.length < 3) {
      return [];
    }
    const parsed = Number.parseInt(String(limitRaw ?? '50'), 10);
    const pLimit = Number.isFinite(parsed)
      ? Math.min(80, Math.max(1, parsed))
      : 50;
    return this.locations.searchSkSchools(q, level, pLimit);
  }

  @Post('sk-municipalities')
  @UseGuards(JwksAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async ensureSkMunicipality(
    @Body() body: EnsureSkMunicipalityDto,
  ): Promise<SkMunicipalityResponseDto> {
    return this.locations.ensureSkMunicipality(body.name);
  }

  @Post('sk-cv-skills')
  @UseGuards(JwksAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async ensureSkCvSkill(
    @Body() body: EnsureSkCvSkillDto,
  ): Promise<SkCvSkillResponseDto> {
    return this.locations.ensureSkCvSkill(body.name);
  }
}
