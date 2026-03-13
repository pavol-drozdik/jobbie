const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export type ApiOptions = {
  token?: string | null;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: object;
  query?: Record<string, string>;
};

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<{ data?: T; status: number; ok: boolean; body: string }> {
  const { token, method = 'GET', body, query } = options;
  const url = new URL(path.startsWith('http') ? path : BASE_URL + path);
  if (query) {
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: T | undefined;
  try {
    if (text) data = JSON.parse(text) as T;
  } catch {
    // ignore
  }
  return {
    data,
    status: res.status,
    ok: res.ok,
    body: text,
  };
}

export function getApiBaseUrl(): string {
  return BASE_URL;
}
