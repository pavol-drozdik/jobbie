import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { ContractWithdrawalDto } from './contract-withdrawal.dto';
import { ContractWithdrawalsService } from './contract-withdrawals.service';

/**
 * Public consumer contract withdrawal form (no JWT). Rate-limited to reduce abuse.
 */
@Controller('contract-withdrawals')
@Public()
export class ContractWithdrawalsController {
  constructor(private readonly withdrawals: ContractWithdrawalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(@Body() body: ContractWithdrawalDto): Promise<{ ok: true }> {
    return this.withdrawals.submit(body);
  }
}
