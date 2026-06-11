import { SeoFeedService } from './seo-feed.service';
import { stripHtmlForFeed, truncateFeedSummary } from './seo-feed-text.util';

describe('seo-feed-text.util', () => {
  it('strips HTML and truncates summary', () => {
    expect(stripHtmlForFeed('<p>Letná <b>brigáda</b></p>')).toBe('Letná brigáda');
    const long = 'a'.repeat(400);
    expect(truncateFeedSummary(long).length).toBeLessThanOrEqual(320);
  });
});

describe('SeoFeedService', () => {
  const jobRow = {
    id: 'job-1',
    title: 'Kosenie trávy',
    description: '<p>Sezónna brigáda v záhrade.</p>',
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-02T10:00:00.000Z',
    photos: ['https://cdn.example/photo.jpg'],
  };

  const adRow = {
    id: 'ad-1',
    title: 'Kosenie a údržba záhrady',
    tagline: 'Bratislava a okolie',
    body: null,
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: null,
    thumbnail_url: 'https://cdn.example/ad.jpg',
  };

  function makeService(rows: {
    jobs?: unknown[];
    ads?: unknown[];
  }): SeoFeedService {
    const chain = (table: string) => {
      const result =
        table === 'job_offers'
          ? { data: rows.jobs ?? [] }
          : { data: rows.ads ?? [] };
      const builder = {
        select: () => builder,
        eq: () => builder,
        or: () => builder,
        not: () => builder,
        order: () => builder,
        limit: () => Promise.resolve(result),
      };
      return builder;
    };
    const supabase = {
      getClient: () => ({
        from: (table: string) => chain(table),
      }),
    };
    return new SeoFeedService(supabase as never);
  }

  it('maps job feed items with summary and image', async () => {
    const svc = makeService({ jobs: [jobRow] });
    const { items } = await svc.listJobFeedItems(10);
    expect(items).toHaveLength(1);
    expect(items[0]?.summary).toBe('Sezónna brigáda v záhrade.');
    expect(items[0]?.url_path).toBe('/ponuka/job-1');
    expect(items[0]?.image_url).toBe('https://cdn.example/photo.jpg');
  });

  it('maps ad feed items', async () => {
    const svc = makeService({ ads: [adRow] });
    const { items } = await svc.listAdFeedItems(10);
    expect(items[0]?.url_path).toBe('/profesionali/ad-1');
    expect(items[0]?.summary).toContain('Bratislava');
  });
});
