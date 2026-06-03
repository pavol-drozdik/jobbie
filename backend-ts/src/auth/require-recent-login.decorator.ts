import { SetMetadata } from '@nestjs/common';

export const REQUIRE_RECENT_LOGIN_KEY = 'requireRecentLogin';

export const RequireRecentLogin = () =>
  SetMetadata(REQUIRE_RECENT_LOGIN_KEY, true);
