/**
 * Simple relative time in Slovak (e.g. "pred 2 hod.", "včera").
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return 'práve teraz';
  const min = Math.floor(sec / 60);
  if (min < 60) return `pred ${min} min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `pred ${h} hod.`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'včera';
  if (days < 7) return `pred ${days} dňami`;
  if (days < 30) return `pred ${Math.floor(days / 7)} týždňami`;
  if (days < 365) return `pred ${Math.floor(days / 30)} mesiacmi`;
  return `pred ${Math.floor(days / 365)} rokmi`;
}

export function getJobTypeLabel(jobType: string | null | undefined): string {
  if (!jobType) return '';
  const map: Record<string, string> = {
    full_time: 'Plný úväzok',
    part_time: 'Skrátený úväzok',
    brigada: 'Brigáda',
  };
  return map[jobType] ?? jobType;
}
