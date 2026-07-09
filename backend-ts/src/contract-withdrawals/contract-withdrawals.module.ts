import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { ContractWithdrawalsController } from './contract-withdrawals.controller';
import { ContractWithdrawalsService } from './contract-withdrawals.service';

@Module({
  imports: [AuditModule, EmailModule],
  controllers: [ContractWithdrawalsController],
  providers: [ContractWithdrawalsService],
})
export class ContractWithdrawalsModule {}
