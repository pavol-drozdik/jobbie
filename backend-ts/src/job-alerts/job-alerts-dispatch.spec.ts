import { EMAIL_BRAND } from '../email/transactional-email.template';
import { JobAlertsService } from './job-alerts.service';
import { shouldDispatchJobAlert } from './job-alerts-matching.util';

const APP_ORIGIN = 'https://app.test';
const API_ORIGIN = 'https://api.test';
const USER_ID = 'user-1';
const ALERT_ID = 'alert-1';

type AlertRowInput = {
  id?: string;
  user_id?: string;
  name?: string;
  frequency?: string;
  last_dispatch_at?: string | null;
  created_at?: string;
  categories?: string[];
  category?: string | null;
  keywords?: string;
  location?: string;
  employment_types?: string[];
  criteria_hash?: string;
};

function baseAlertRow(overrides: AlertRowInput = {}): Record<string, unknown> {
  return {
    id: ALERT_ID,
    user_id: USER_ID,
    name: 'Stavba alert',
    keywords: '',
    location: '',
    radius_km: null,
    category: 'stavba',
    categories: ['stavba'],
    employment_types: [],
    salary_type: 'monthly',
    salary_min: null,
    salary_max: null,
    work_mode: null,
    work_modes: [],
    work_from_home: false,
    education_levels: [],
    benefits: [],
    suitable_for: [],
    driver_licenses: [],
    work_shift_modes: [],
    language_filters: [],
    pc_skill_filters: [],
    start_types: [],
    start_date_from: null,
    newsletter: false,
    frequency: 'weekly',
    is_active: true,
    criteria_hash: 'hash',
    last_dispatch_at: null,
    created_at: '2026-06-01T08:00:00.000Z',
    updated_at: '2026-06-01T08:00:00.000Z',
    ...overrides,
  };
}

function makeDispatchService(opts: {
  matchIds?: string[];
  sentJobIds?: string[];
  sendOk?: boolean;
  sentInsertError?: Error | null;
  jobRows?: Array<Record<string, unknown>>;
}) {
  const lastDispatchPatches: string[] = [];
  const sentJobInserts: Array<{ alert_id: string; job_id: string }> = [];
  const sendHtmlEmail = jest.fn(
    async (_args: { to: string; subject: string; html: string }) =>
      opts.sendOk !== false,
  );

  const matchPublicJobIdsForDispatch = jest.fn(
    async () => opts.matchIds ?? [],
  );

  const supabase = {
    getClient: () => ({
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    notification_preferences: {},
                    is_deleted: false,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'job_email_alert_sent_jobs') {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: (opts.sentJobIds ?? []).map((job_id) => ({ job_id })),
                  error: null,
                }),
            }),
            insert: (rows: Array<{ alert_id: string; job_id: string }>) => {
              sentJobInserts.push(...rows);
              if (opts.sentInsertError) {
                return Promise.resolve({ error: opts.sentInsertError });
              }
              return Promise.resolve({ error: null });
            },
          };
        }
        if (table === 'job_email_alerts') {
          return {
            update: (patch: { last_dispatch_at?: string }) => {
              if (patch.last_dispatch_at) {
                lastDispatchPatches.push(patch.last_dispatch_at);
              }
              return {
                eq: () => ({
                  eq: async () => ({ error: null }),
                }),
              };
            },
          };
        }
        if (table === 'job_offers') {
          return {
            select: () => ({
              in: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: async () => ({
                      data: opts.jobRows ?? [],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      },
      auth: {
        admin: {
          getUserById: async () => ({
            data: {
              user: {
                email: 'user@example.com',
                email_confirmed_at: '2026-01-01T00:00:00.000Z',
              },
            },
            error: null,
          }),
        },
      },
    }),
  };

  const jobAlertsMatching = { matchPublicJobIdsForDispatch };
  const email = { sendHtmlEmail, isConfigured: () => true };
  const config = {
    get: (key: string) => {
      if (key === 'PUBLIC_API_URL') {
        return API_ORIGIN;
      }
      if (key === 'PUBLIC_APP_URL' || key === 'PUBLIC_APP_ORIGIN') {
        return APP_ORIGIN;
      }
      return undefined;
    },
  };
  const preferenceTokens = {
    signJobAlertPause: () => 'pause-token',
    signUnsubscribe: () => 'unsub-token',
  };
  const typesense = { isEnabled: () => true };

  const svc = new JobAlertsService(
    supabase as never,
    typesense as never,
    jobAlertsMatching as never,
    email as never,
    config as never,
    preferenceTokens as never,
    { record: async () => undefined } as never,
  );

  return {
    svc,
    sendHtmlEmail,
    matchPublicJobIdsForDispatch,
    lastDispatchPatches,
    sentJobInserts,
  };
}

function jobRow(id: string, title: string): Record<string, unknown> {
  return {
    id,
    title,
    location: 'Bratislava',
    location_address: null,
    salary: null,
    compensation_type: 'monthly',
    compensation_amount: 1200,
    company_id: null,
  };
}

describe('JobAlertsService digest dispatch', () => {
  const runAtMs = new Date('2026-06-08T12:00:00.000Z').getTime();

  it('sends one digest with all fresh matching jobs and updates last_dispatch_at', async () => {
    const { svc, sendHtmlEmail, lastDispatchPatches, sentJobInserts } =
      makeDispatchService({
        matchIds: ['job-a', 'job-b'],
        jobRows: [jobRow('job-a', 'Stavba A'), jobRow('job-b', 'Stavba B')],
      });
    await svc.dispatchSingleAlertForTest(baseAlertRow() as never, runAtMs);
    expect(sendHtmlEmail).toHaveBeenCalledTimes(1);
    const html = sendHtmlEmail.mock.calls[0]![0].html;
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('JOBBIE');
    expect(html).toContain(EMAIL_BRAND.green);
    expect(html).toContain(EMAIL_BRAND.soft);
    expect(html).toContain('/app/jobs/job-a');
    expect(html).toContain('/app/jobs/job-b');
    expect(html).toContain('Stavba A');
    expect(html).toContain('Stavba B');
    expect(html).toContain('Všetky zodpovedajúce ponuky');
    expect(html).toContain(`${API_ORIGIN}/api/public/job-alerts/pause`);
    expect(html).toContain(`${APP_ORIGIN}/unsubscribe/`);
    expect(html).toContain(`${APP_ORIGIN}/ponuky-na-email`);
    expect(html).toContain('Pozastaviť toto upozornenie');
    expect(html).toContain('role="presentation"');
    expect(lastDispatchPatches).toHaveLength(1);
    expect(sentJobInserts).toEqual([
      { alert_id: ALERT_ID, job_id: 'job-a' },
      { alert_id: ALERT_ID, job_id: 'job-b' },
    ]);
  });

  it('does not send or update watermark when there are no matches', async () => {
    const { svc, sendHtmlEmail, lastDispatchPatches } = makeDispatchService({
      matchIds: [],
    });
    await svc.dispatchSingleAlertForTest(baseAlertRow() as never, runAtMs);
    expect(sendHtmlEmail).not.toHaveBeenCalled();
    expect(lastDispatchPatches).toHaveLength(0);
  });

  it('does not send when all matches were already sent', async () => {
    const { svc, sendHtmlEmail, lastDispatchPatches } = makeDispatchService({
      matchIds: ['job-a', 'job-b'],
      sentJobIds: ['job-a', 'job-b'],
      jobRows: [jobRow('job-a', 'A'), jobRow('job-b', 'B')],
    });
    await svc.dispatchSingleAlertForTest(
      baseAlertRow({
        last_dispatch_at: '2026-06-01T12:00:00.000Z',
      }) as never,
      runAtMs,
    );
    expect(sendHtmlEmail).not.toHaveBeenCalled();
    expect(lastDispatchPatches).toHaveLength(0);
  });

  it('sends only jobs not in sent_jobs on the next period', async () => {
    const { svc, sendHtmlEmail } = makeDispatchService({
      matchIds: ['job-a', 'job-b', 'job-c'],
      sentJobIds: ['job-a', 'job-b'],
      jobRows: [jobRow('job-c', 'New C')],
    });
    await svc.dispatchSingleAlertForTest(
      baseAlertRow({
        last_dispatch_at: '2026-06-01T12:00:00.000Z',
      }) as never,
      runAtMs,
    );
    expect(sendHtmlEmail).toHaveBeenCalledTimes(1);
    const html = sendHtmlEmail.mock.calls[0]![0].html;
    expect(html).toContain('New C');
    expect(html).not.toContain('Old A');
    expect(html).not.toContain('Old B');
  });

  it('does not update watermark when SMTP send fails', async () => {
    const { svc, lastDispatchPatches, sentJobInserts } = makeDispatchService({
      matchIds: ['job-a'],
      sendOk: false,
      jobRows: [jobRow('job-a', 'A')],
    });
    await svc.dispatchSingleAlertForTest(baseAlertRow() as never, runAtMs);
    expect(lastDispatchPatches).toHaveLength(0);
    expect(sentJobInserts).toHaveLength(0);
  });

  it('does not update watermark when sent_jobs insert fails after send', async () => {
    const { svc, sendHtmlEmail, lastDispatchPatches } = makeDispatchService({
      matchIds: ['job-a'],
      jobRows: [jobRow('job-a', 'A')],
      sentInsertError: new Error('insert failed'),
    });
    await svc.dispatchSingleAlertForTest(baseAlertRow() as never, runAtMs);
    expect(sendHtmlEmail).toHaveBeenCalledTimes(1);
    expect(lastDispatchPatches).toHaveLength(0);
  });

  it('includes more than 10 jobs in a single digest', async () => {
    const ids = Array.from({ length: 12 }, (_, i) => `job-${i}`);
    const rows = ids.map((id, i) => jobRow(id, `Title ${i}`));
    const { svc, sendHtmlEmail } = makeDispatchService({
      matchIds: ids,
      jobRows: rows,
    });
    await svc.dispatchSingleAlertForTest(baseAlertRow() as never, runAtMs);
    expect(sendHtmlEmail).toHaveBeenCalledTimes(1);
    const html = sendHtmlEmail.mock.calls[0]![0].html;
    for (const id of ids) {
      expect(html).toContain(`/app/jobs/${id}`);
    }
  });

  it('passes createdAfter and createdBefore to matching', async () => {
    const { svc, matchPublicJobIdsForDispatch } = makeDispatchService({
      matchIds: [],
    });
    await svc.dispatchSingleAlertForTest(
      baseAlertRow({
        last_dispatch_at: '2026-06-01T12:00:00.000Z',
        created_at: '2026-05-20T08:00:00.000Z',
      }) as never,
      runAtMs,
    );
    expect(matchPublicJobIdsForDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ['stavba'] }),
      {
        createdAfterTs: Math.floor(
          new Date('2026-06-01T12:00:00.000Z').getTime() / 1000,
        ) - 120,
        createdBeforeTs: Math.floor(runAtMs / 1000),
      },
    );
  });
});

describe('weekly digest schedule gate', () => {
  it('blocks a second run within 7 days after successful dispatch', () => {
    const last = '2026-06-08T12:00:00.000Z';
    const withinWeek = new Date('2026-06-10T12:00:00.000Z').getTime();
    expect(shouldDispatchJobAlert('weekly', last, withinWeek)).toBe(false);
  });
});
