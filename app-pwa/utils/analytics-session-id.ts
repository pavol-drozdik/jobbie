const STORAGE_KEY = 'jobbie_analytics_sid';

/**
 * Rotating daily browser analytics session id for first-party telemetry batches.
 */
export function getOrCreateAnalyticsSessionId(): string {
  if (!import.meta.client || typeof localStorage === 'undefined') {
    return '';
  }
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string; day?: string };
      if (parsed.day === today && typeof parsed.id === 'string' && parsed.id.length > 0) {
        return parsed.id;
      }
    }
  } catch {
    // ignore corrupted storage
  }
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, day: today }));
  } catch {
    return id;
  }
  return id;
}
