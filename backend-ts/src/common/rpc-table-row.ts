/** Supabase RPC returning `RETURNS TABLE` may be a row array or a single object. */
export function firstRpcTableRow<T extends Record<string, unknown>>(
  data: T | T[] | null | undefined,
): T | null {
  if (data == null) {
    return null;
  }
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }
  if (typeof data === 'object') {
    return data;
  }
  return null;
}
