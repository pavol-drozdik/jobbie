import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ApplicationsController } from './applications.controller';

@Module({
  imports: [AuthModule],
  controllers: [ApplicationsController],
})
export class ApplicationsModule {}
