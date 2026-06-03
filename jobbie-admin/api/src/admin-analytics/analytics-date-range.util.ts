import { BadRequestException } from '@nestjs/common';

const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

export function parseAnalyticsDateRange(
  fromIso?: string,
  toIso?: string,
): { fromIso: string; toIso: string } {
  const now = new Date();
  const to = toIso?.trim() ? new Date(toIso.trim()) : now;
  if (Number.isNaN(to.getTime())) {
    throw new BadRequestException('Invalid "to" date.');
  }
  const toCapped = to.getTime() > now.getTime() ? now : to;

  const from = fromIso?.trim()
    ? new Date(fromIso.trim())
    : new Date(toCapped.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime())) {
    throw new BadRequestException('Invalid "from" date.');
  }

  if (from.getTime() > toCapped.getTime()) {
    throw new BadRequestException('"from" must be before "to".');
  }

  if (toCapped.getTime() - from.getTime() > MAX_RANGE_MS) {
    throw new BadRequestException('Date range must not exceed 366 days.');
  }

  return {
    fromIso: from.toISOString(),
    toIso: toCapped.toISOString(),
  };
}

/** YYYY-MM-DD for Google APIs */
export function toGoogleDate(iso: string): string {
  return iso.slice(0, 10);
}
