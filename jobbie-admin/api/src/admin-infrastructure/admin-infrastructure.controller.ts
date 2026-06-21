import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { RequireAdminScopes } from '../auth/admin-scope.decorator';
import { AdminInfrastructureService } from './admin-infrastructure.service';
import type { AdminInfrastructureDto } from './admin-infrastructure.dto';

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
}
