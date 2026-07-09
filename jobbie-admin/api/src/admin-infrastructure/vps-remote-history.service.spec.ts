import {
  parseInfraHistoryJsonl,
  type StoredPoint,
} from './vps-metrics-history.service';

describe('VpsRemoteHistoryService JSONL helpers', () => {
  it('filters points by parsing timestamps from JSONL', () => {
    const text = [
      '{"t":"2026-07-01T12:00:00.000Z","load_1":0.1,"load_pct":2.5,"mem_pct":10}',
      '{"t":"2026-07-08T12:00:00.000Z","load_1":0.2,"load_pct":5,"mem_pct":20}',
      '{"t":"2026-07-09T12:00:00.000Z","load_1":0.4,"load_pct":10,"mem_pct":25}',
    ].join('\n');
    const all = parseInfraHistoryJsonl(text);
    const since = new Date('2026-07-08T00:00:00.000Z').getTime();
    const inRange = all.filter((p) => new Date(p.t).getTime() >= since);
    expect(inRange).toHaveLength(2);
    expect(inRange[0].load_pct).toBe(5);
    expect(inRange[1].load_pct).toBe(10);
  });

  it('returns empty array for empty or whitespace-only input', () => {
    expect(parseInfraHistoryJsonl('')).toEqual([]);
    expect(parseInfraHistoryJsonl('\n\n')).toEqual([]);
  });

  it('sanitizes out-of-range percentages from remote JSONL', () => {
    const text =
      '{"t":"2026-07-09T12:00:00.000Z","load_1":2,"load_pct":150,"mem_pct":-5}';
    const [point] = parseInfraHistoryJsonl(text) as StoredPoint[];
    expect(point.load_pct).toBe(100);
    expect(point.mem_pct).toBe(0);
  });
});
