import { JWT } from 'google-auth-library';

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
];

let cachedAuth: JWT | null = null;

export function isGoogleAnalyticsConfigured(): boolean {
  return Boolean(
    process.env.GA4_PROPERTY_ID?.trim() && process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim(),
  );
}

export function isGscConfigured(): boolean {
  return Boolean(
    process.env.GSC_SITE_URL?.trim() && process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim(),
  );
}

function parseServiceAccountJson(): {
  client_email: string;
  private_key: string;
} | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      client_email?: string;
      private_key?: string;
    };
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  } catch {
    return null;
  }
}

export function getGoogleAuthClient(): JWT {
  if (cachedAuth) return cachedAuth;
  const credentials = parseServiceAccountJson();
  if (!credentials) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing or invalid JSON.');
  }
  cachedAuth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: SCOPES,
  });
  return cachedAuth;
}
