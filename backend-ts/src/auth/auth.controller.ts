import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwksAuthGuard } from './jwks-auth.guard';
import { CurrentUserDecorator } from './current-user.decorator';
import { CurrentUser } from './auth.types';

@Controller('auth')
@UseGuards(JwksAuthGuard)
export class AuthController {
  @Get('me')
  me(@CurrentUserDecorator() user: CurrentUser) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      looking_for_work: user.looking_for_work,
      offering_work: user.offering_work,
    };
  }
}
