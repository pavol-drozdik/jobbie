import { SetMetadata } from '@nestjs/common';

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';

/** Attach user when token is valid; allow anonymous access otherwise. */
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
