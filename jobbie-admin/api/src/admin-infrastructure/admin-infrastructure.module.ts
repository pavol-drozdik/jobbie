import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { AdminInfrastructureController } from './admin-infrastructure.controller';
import { AdminInfrastructureService } from './admin-infrastructure.service';
import { VpsBackendOperationsService } from './vps-backend-operations.service';
import { VpsHttpMetricsService } from './vps-http-metrics.service';
import { VpsMetricsHistoryService } from './vps-metrics-history.service';
import { VpsRemoteHistoryService } from './vps-remote-history.service';
import { VpsSshMetricsService } from './vps-ssh-metrics.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminInfrastructureController],
  providers: [
    AdminInfrastructureService,
    VpsHttpMetricsService,
    VpsMetricsHistoryService,
    VpsRemoteHistoryService,
    VpsSshMetricsService,
    VpsBackendOperationsService,
    AuditService,
  ],
})
export class AdminInfrastructureModule {}
