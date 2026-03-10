import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JobsModule } from '../jobs/jobs.module';
import { ApplicationsController } from './applications.controller';

@Module({
  imports: [AuthModule, JobsModule],
  controllers: [ApplicationsController],
})
export class ApplicationsModule {}
