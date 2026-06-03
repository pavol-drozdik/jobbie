import * as fs from 'fs';
import * as path from 'path';

const REQUIRED_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
] as const;

/**
 * Fail fast with actionable logs when api/.env is missing or incomplete.
 */
export function validateAdminApiEnv(): void {
  const envPath = process.env.DOTENV_CONFIG_PATH?.trim() || '.env';
  const resolved = path.isAbsolute(envPath)
    ? envPath
    : path.resolve(process.cwd(), envPath);

  if (!fs.existsSync(resolved)) {
    console.error('[admin-api] Environment file not found.');
    console.error(`[admin-api]   Expected: ${resolved}`);
    console.error(
      '[admin-api]   Copy api/.env.example to api/.env and fill Supabase credentials (see jobbie-admin/README.md).',
    );
    process.exit(1);
  }

  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    console.error('[admin-api] Missing required environment variables:');
    for (const key of missing) {
      console.error(`[admin-api]   - ${key}`);
    }
    console.error(`[admin-api]   Edit: ${resolved}`);
    console.error(
      '[admin-api]   Use the same values as backend-ts/.env (SUPABASE_URL, service role, JWT secret).',
    );
    process.exit(1);
  }
}
