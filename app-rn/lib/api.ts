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
  // #region agent log
  fetch('http://127.0.0.1:7490/ingest/953e80a6-dd3a-405d-9917-1610bb939dfd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'346cbd'},body:JSON.stringify({sessionId:'346cbd',location:'api.ts:entry',message:'api call',data:{path,baseUrl:BASE_URL},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
  // #endregion
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

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    // #region agent log
    const err = e instanceof Error ? e : new Error(String(e));
    fetch('http://127.0.0.1:7490/ingest/953e80a6-dd3a-405d-9917-1610bb939dfd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'346cbd'},body:JSON.stringify({sessionId:'346cbd',location:'api.ts:fetch-catch',message:'fetch threw',data:{path,name:err.name,message:err.message},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw e;
  }
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
