import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { PaymentsModule } from '../payments/payments.module';
import { PlansController } from './plans.controller';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    forwardRef(() => BillingModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [PlansController],
})
export class PlansModule {}
