import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminContractWithdrawalsController } from './admin-contract-withdrawals.controller';
import { AdminContractWithdrawalsService } from './admin-contract-withdrawals.service';

@Module({
  imports: [AdminAuthModule, SupabaseModule],
  controllers: [AdminContractWithdrawalsController],
  providers: [AdminContractWithdrawalsService, AuditService],
})
export class AdminContractWithdrawalsModule {}
