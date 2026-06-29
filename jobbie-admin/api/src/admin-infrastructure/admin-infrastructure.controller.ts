import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { RequireAdminScopes } from '../auth/admin-scope.decorator';
import { AdminInfrastructureService } from './admin-infrastructure.service';
import type {
  AdminInfrastructureDto,
  InfraMetricsRangeDto,
  VpsMetricsHistoryDto,
} from './admin-infrastructure.dto';

@Controller('admin/infrastructure')
@UseGuards(JwksAuthGuard, AppRoleGuard)
@RequireAppRoles('admin')
@RequireAdminScopes('overview')
export class AdminInfrastructureController {
  constructor(
    private readonly infrastructure: AdminInfrastructureService,
  ) {}

  @Get()
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  async getInfrastructure(): Promise<AdminInfrastructureDto> {
    return this.infrastructure.getInfrastructure();
  }

  @Get(':envId/history')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  getMetricsHistory(
    @Param('envId') envId: string,
    @Query('range') rangeRaw?: string,
  ): VpsMetricsHistoryDto {
    if (envId !== 'staging' && envId !== 'production') {
      throw new BadRequestException('envId must be staging or production');
    }
    const range = parseMetricsRange(rangeRaw);
    return this.infrastructure.getMetricsHistory(envId, range);
  }
}

const METRICS_RANGES = new Set<InfraMetricsRangeDto>(['1h', '24h', '2w', '1m']);

function parseMetricsRange(raw?: string): InfraMetricsRangeDto {
  const range = (raw?.trim() || '24h') as InfraMetricsRangeDto;
  if (!METRICS_RANGES.has(range)) {
    throw new BadRequestException('range must be one of: 1h, 24h, 2w, 1m');
  }
  return range;
}
