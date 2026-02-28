import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.service';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [StripeService],
})
export class PaymentsModule {}
