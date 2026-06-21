import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { AdminInfrastructureController } from './admin-infrastructure.controller';
import { AdminInfrastructureService } from './admin-infrastructure.service';
import { VpsHttpMetricsService } from './vps-http-metrics.service';
import { VpsSshMetricsService } from './vps-ssh-metrics.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminInfrastructureController],
  providers: [
    AdminInfrastructureService,
    VpsHttpMetricsService,
    VpsSshMetricsService,
  ],
})
export class AdminInfrastructureModule {}
