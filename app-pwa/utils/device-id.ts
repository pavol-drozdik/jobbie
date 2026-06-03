const DEVICE_STORAGE_KEY = 'jobbie_device_id';

export function getOrCreateDeviceId(): string {
  if (!import.meta.client) {
    return '';
  }
  try {
    let id = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}
