import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from './public.decorator';
import { AdminAuthLoginDto } from './admin-auth-login.dto';
import { AdminAuthLoginService } from './admin-auth-login.service';

@Controller('auth')
export class AdminAuthLoginController {
  constructor(private readonly loginService: AdminAuthLoginService) {}

  /** Localhost-only password login via service role (no CAPTCHA). */
  @Public()
  @Post('login')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  login(@Body() dto: AdminAuthLoginDto) {
    return this.loginService.signIn(dto.email, dto.password);
  }
}
