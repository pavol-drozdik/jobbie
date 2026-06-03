/** Shared env gate for Bull queue registration (read after `dotenv/config` in AppModule). */
export function isRedisUrlConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}
