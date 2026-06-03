import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Route does not require a Bearer JWT (marketing, webhooks, auth lockout, etc.). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
