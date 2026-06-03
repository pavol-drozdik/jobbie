import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { CspReportController } from './csp-report.controller';

@Module({
  controllers: [MetricsController, CspReportController],
})
export class MetricsModule {}
