import {
  attachShowTopBadgeToJobs,
  sortByTopBadgeFirst,
} from './listing-badge-enrichment.util';

describe('listing-badge-enrichment', () => {
  describe('attachShowTopBadgeToJobs', () => {
    it('sets show_top_badge from active top promotion ids', () => {
      const jobs = [
        { id: 'j1', company_id: 'c1' },
        { id: 'j2', company_id: 'c2' },
      ];
      const enriched = attachShowTopBadgeToJobs(jobs, new Set(['j2']));
      expect(enriched[0]?.show_top_badge).toBe(false);
      expect(enriched[1]?.show_top_badge).toBe(true);
    });
  });

  describe('sortByTopBadgeFirst', () => {
    it('places show_top_badge items first', () => {
      const items = [
        { id: '1', show_top_badge: false },
        { id: '2', show_top_badge: true },
        { id: '3', show_top_badge: false },
        { id: '4', show_top_badge: true },
      ];
      expect(sortByTopBadgeFirst(items).map((i) => i.id)).toEqual([
        '2',
        '4',
        '1',
        '3',
      ]);
    });
  });
});
