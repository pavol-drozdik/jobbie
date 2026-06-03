import { Module, forwardRef } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AuditRetentionService } from './audit-retention.service';
import { HttpLoggingInterceptor } from './http-logging.interceptor';
import { ContentReportsController } from './content-reports.controller';
import { ContentReportsService } from './content-reports.service';
import { ClientTelemetryController } from './client-telemetry.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [
    ContentReportsController,
    ClientTelemetryController,
  ],
  providers: [
    AuditService,
    AuditRetentionService,
    ContentReportsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}
