import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { RequireAdminScopes } from '../auth/admin-scope.decorator';
import { RequireRecentLogin } from '../auth/require-recent-login.decorator';
import { RequireSuperAdmin } from '../auth/require-super-admin.decorator';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import { AdminInfrastructureService } from './admin-infrastructure.service';
import type {
  AdminInfrastructureDto,
  InfraMetricsRangeDto,
  VpsBackendsSummaryDto,
  VpsMetricsHistoryDto,
} from './admin-infrastructure.dto';

@Controller('admin/infrastructure')
@UseGuards(JwksAuthGuard, AppRoleGuard, SuperAdminGuard)
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

  @Get(':envId/backends')
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  async getBackendsSummary(
    @Param('envId') envId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<VpsBackendsSummaryDto> {
    return this.infrastructure.getBackendsSummary(parseEnvId(envId), user);
  }

  @Post(':envId/backends/scale-up')
  @RequireSuperAdmin()
  @RequireRecentLogin()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async scaleBackendUp(
    @Param('envId') envId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<VpsBackendsSummaryDto> {
    return this.infrastructure.scaleBackendUp(parseEnvId(envId), user);
  }

  @Post(':envId/backends/scale-down')
  @RequireSuperAdmin()
  @RequireRecentLogin()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async scaleBackendDown(
    @Param('envId') envId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<VpsBackendsSummaryDto> {
    return this.infrastructure.scaleBackendDown(parseEnvId(envId), user);
  }

  @Post(':envId/backends/:containerName/restart')
  @RequireSuperAdmin()
  @RequireRecentLogin()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async restartBackendInstance(
    @Param('envId') envId: string,
    @Param('containerName') containerName: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<VpsBackendsSummaryDto> {
    return this.infrastructure.restartBackendInstance(
      parseEnvId(envId),
      containerName,
      user,
    );
  }

  @Get(':envId/history')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async getMetricsHistory(
    @Param('envId') envId: string,
    @Query('range') rangeRaw?: string,
  ): Promise<VpsMetricsHistoryDto> {
    const range = parseMetricsRange(rangeRaw);
    return this.infrastructure.getMetricsHistory(parseEnvId(envId), range);
  }
}

const METRICS_RANGES = new Set<InfraMetricsRangeDto>(['1h', '24h', '2w', '1m']);

function parseEnvId(envId: string): 'staging' | 'production' {
  if (envId !== 'staging' && envId !== 'production') {
    throw new BadRequestException('envId must be staging or production');
  }
  return envId;
}

function parseMetricsRange(raw?: string): InfraMetricsRangeDto {
  const range = (raw?.trim() || '24h') as InfraMetricsRangeDto;
  if (!METRICS_RANGES.has(range)) {
    throw new BadRequestException('range must be one of: 1h, 24h, 2w, 1m');
  }
  return range;
}
