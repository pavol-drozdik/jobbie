import type { Invoice, Subscription } from './stripe-types';
import { SubscriptionCreditsService } from './subscription-credits.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { StripeService } from './stripe.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreditsService } from '../billing/credits.service';

describe('SubscriptionCreditsService', () => {
  const createNotificationMock = jest.fn().mockResolvedValue(undefined);
  const recordAuditMock = jest.fn().mockResolvedValue(undefined);

  function createService(opts: {
    subRow?: { plan_id: string } | null;
    planRow?: { slug: string; monthly_credits: number } | null;
    freePeriodGrantExists?: boolean;
    paidInvoiceGrantExists?: boolean;
    insertGrantError?: { code: string } | null;
    retrieveSubscriptionWithLatestInvoice?: jest.Mock;
  }): SubscriptionCreditsService {
    let ledgerGrantExists = opts.freePeriodGrantExists ?? false;
    const supabase = {
      getClient: () => ({
        from: (table: string) => {
          if (table === 'user_subscriptions') {
            return {
              select: () => ({
                eq: (col: string) => {
                  if (col === 'user_id') {
                    return {
                      eq: () => ({
                        maybeSingle: async () => ({ data: opts.subRow ?? null }),
                      }),
                      maybeSingle: async () => ({ data: opts.subRow ?? null }),
                    };
                  }
                  return {
                    eq: () => ({
                      maybeSingle: async () => ({ data: opts.subRow ?? null }),
                    }),
                  };
                },
              }),
            };
          }
          if (table === 'subscription_plans') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: opts.planRow ?? null }),
                }),
              }),
            };
          }
          if (table === 'credit_ledger') {
            const maybeSingleResult = async () => ({
              data:
                ledgerGrantExists || opts.paidInvoiceGrantExists
                  ? { id: 'ledger-1' }
                  : null,
            });
            const afterGt = { maybeSingle: maybeSingleResult };
            const afterThirdEq = { gt: () => afterGt };
            const afterSecondEq = {
              eq: () => afterThirdEq,
              gt: () => afterGt,
            };
            const afterFirstEq = { eq: () => afterSecondEq };
            return {
              select: () => ({
                eq: () => afterFirstEq,
              }),
            };
          }
          if (table === 'subscription_period_credit_grants') {
            return {
              insert: async () => ({
                error: opts.insertGrantError ?? null,
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          };
        },
      }),
    } as unknown as SupabaseService;

    const stripeService = {
      retrieveSubscriptionWithLatestInvoice:
        opts.retrieveSubscriptionWithLatestInvoice ??
        jest.fn().mockResolvedValue(null),
    } as unknown as StripeService;

    const credits = {
      grant: jest.fn().mockImplementation(async () => {
        ledgerGrantExists = true;
      }),
    } as unknown as CreditsService;

    return new SubscriptionCreditsService(
      supabase,
      { recordAuditEvent: recordAuditMock } as unknown as AuditService,
      stripeService,
      { createForUser: createNotificationMock } as unknown as NotificationsService,
      credits,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function getGrantMock(service: SubscriptionCreditsService): jest.Mock {
    return (service as unknown as { credits: { grant: jest.Mock } }).credits
      .grant;
  }

  describe('ensureFreePlanCreditsForCurrentMonth', () => {
    it('skips users not on zadarmo plan', async () => {
      const service = createService({
        subRow: { plan_id: 'plan-paid' },
        planRow: { slug: 'start', monthly_credits: 10 },
      });
      const result = await service.ensureFreePlanCreditsForCurrentMonth('user-1');
      expect(result).toEqual({ applied: false });
      expect(getGrantMock(service)).not.toHaveBeenCalled();
    });

    it('grants credits for active zadarmo subscribers', async () => {
      const service = createService({
        subRow: { plan_id: 'plan-free' },
        planRow: { slug: 'zadarmo', monthly_credits: 5 },
        freePeriodGrantExists: false,
      });
      const result = await service.ensureFreePlanCreditsForCurrentMonth('user-1');
      expect(result.applied).toBe(true);
      expect(getGrantMock(service)).toHaveBeenCalledWith(
        'user-1',
        5,
        expect.objectContaining({ source: 'free_grant' }),
      );
    });

    it('is idempotent when grant already exists', async () => {
      const service = createService({
        subRow: { plan_id: 'plan-free' },
        planRow: { slug: 'zadarmo', monthly_credits: 5 },
        freePeriodGrantExists: true,
      });
      const result = await service.ensureFreePlanCreditsForCurrentMonth('user-1');
      expect(result).toEqual({ applied: true });
      expect(getGrantMock(service)).not.toHaveBeenCalled();
    });
  });

  describe('ensureCreditsFromStripeSubscription', () => {
    it('grants from latest paid subscription_create invoice', async () => {
      const invoice = {
        id: 'in_123',
        status: 'paid',
        billing_reason: 'subscription_create',
        metadata: { user_id: 'user-1', plan_id: 'plan-start' },
        parent: {
          subscription_details: { subscription: 'sub_123' },
        },
      } as unknown as Invoice;
      const sub = {
        id: 'sub_123',
        metadata: { user_id: 'user-1', plan_id: 'plan-start' },
        latest_invoice: invoice,
      } as unknown as Subscription;

      const retrieveMock = jest.fn().mockResolvedValue(sub);
      const service = createService({
        subRow: { plan_id: 'plan-start' },
        planRow: { slug: 'start', monthly_credits: 10 },
        retrieveSubscriptionWithLatestInvoice: retrieveMock,
      });

      const grantSpy = jest
        .spyOn(service, 'grantFromPaidSubscriptionInvoice')
        .mockResolvedValue({ applied: true });

      const result = await service.ensureCreditsFromStripeSubscription('sub_123');
      expect(result).toEqual({ applied: true });
      expect(retrieveMock).toHaveBeenCalledWith('sub_123');
      expect(grantSpy).toHaveBeenCalledWith(invoice);
    });

    it('polls until latest invoice is paid', async () => {
      const openInvoice = {
        id: 'in_open',
        status: 'open',
        billing_reason: 'subscription_create',
      } as unknown as Invoice;
      const paidInvoice = {
        id: 'in_paid',
        status: 'paid',
        billing_reason: 'subscription_create',
        metadata: { user_id: 'user-1', plan_id: 'plan-start' },
        parent: {
          subscription_details: { subscription: 'sub_123' },
        },
      } as unknown as Invoice;

      const retrieveMock = jest
        .fn()
        .mockResolvedValueOnce({
          id: 'sub_123',
          latest_invoice: openInvoice,
        })
        .mockResolvedValueOnce({
          id: 'sub_123',
          latest_invoice: paidInvoice,
        });

      const service = createService({
        retrieveSubscriptionWithLatestInvoice: retrieveMock,
      });
      const grantSpy = jest
        .spyOn(service, 'grantFromPaidSubscriptionInvoice')
        .mockResolvedValue({ applied: true });

      const result = await service.ensureCreditsFromStripeSubscription('sub_123');
      expect(result).toEqual({ applied: true });
      expect(retrieveMock).toHaveBeenCalledTimes(2);
      expect(grantSpy).toHaveBeenCalledWith(paidInvoice);
    });
  });
});
