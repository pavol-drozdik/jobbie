import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionCreditsService } from './subscription-credits.service';
import { SubscriptionTrialService } from '../billing/subscription-trial.service';
import { BadRequestException } from '@nestjs/common';
import type { CurrentUser } from '../auth/auth.types';

function makeController(
  fromMock: jest.Mock,
  deps?: {
    stripe?: Partial<StripeService>;
    subscriptionCredits?: Partial<SubscriptionCreditsService>;
  },
): PaymentsController {
  return new PaymentsController(
    { getClient: () => ({ from: fromMock }) } as unknown as SupabaseService,
    deps?.stripe as StripeService,
    { get: jest.fn() } as unknown as ConfigService,
    { recordAuditEvent: jest.fn() } as unknown as AuditService,
    { createForUser: jest.fn() } as unknown as NotificationsService,
    (deps?.subscriptionCredits ?? {}) as SubscriptionCreditsService,
    {
      markSubscriptionTrialUsed: jest.fn(),
    } as unknown as SubscriptionTrialService,
  );
}

describe('PaymentsController.activateJobFromStripeMetadata', () => {
  it('scopes activation to company_id metadata', async () => {
    const eqCompany = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { company_id: 'owner-1', title: 'Dev' },
          error: null,
        }),
      }),
    });
    const eqJob = jest.fn().mockReturnValue({ eq: eqCompany });
    const fromMock = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({ eq: eqJob }),
    });
    const controller = makeController(fromMock);
    const result = await (
      controller as unknown as {
        activateJobFromStripeMetadata: (
          m: Record<string, string>,
        ) => Promise<{ jobId: string } | null>;
      }
    ).activateJobFromStripeMetadata({
      job_id: 'job-1',
      company_id: 'owner-1',
    });
    expect(result?.jobId).toBe('job-1');
    expect(eqCompany).toHaveBeenCalledWith('company_id', 'owner-1');
  });

  it('does not activate when owner metadata is missing', async () => {
    const fromMock = jest.fn();
    const controller = makeController(fromMock);
    const result = await (
      controller as unknown as {
        activateJobFromStripeMetadata: (
          m: Record<string, string>,
        ) => Promise<unknown>;
      }
    ).activateJobFromStripeMetadata({ job_id: 'job-1' });
    expect(result).toBeNull();
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe('PaymentsController subscription credit ensure', () => {
  const user = { id: 'user-1' } as CurrentUser;

  it('confirm-subscription calls ensureCreditsFromStripeSubscription after sync', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { stripe_subscription_id: 'sub_123' },
    });
    const fromMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ maybeSingle }),
      }),
    });
    const ensureCredits = jest
      .fn()
      .mockResolvedValue({ applied: true });
    const controller = makeController(fromMock, {
      stripe: {
        applyCheckoutBillingDetails: jest.fn().mockResolvedValue(undefined),
        syncSubscriptionFromPaymentIntent: jest
          .fn()
          .mockResolvedValue({ applied: true, reason: 'ok' }),
      },
      subscriptionCredits: {
        ensureCreditsFromStripeSubscription: ensureCredits,
      },
    });

    const result = await controller.confirmSubscriptionPurchase(user, {
      payment_intent_id: 'pi_test',
    });
    expect(result).toEqual({ ok: true });
    expect(ensureCredits).toHaveBeenCalledWith('sub_123');
  });

  it('activate-free-plan calls ensureFreePlanCreditsForCurrentMonth', async () => {
    const fromMock = jest.fn();
    const ensureFree = jest.fn().mockResolvedValue({ applied: true });
    const controller = makeController(fromMock, {
      stripe: {
        activateFreeSubscriptionPlan: jest.fn().mockResolvedValue(undefined),
      },
      subscriptionCredits: {
        ensureFreePlanCreditsForCurrentMonth: ensureFree,
      },
    });

    const result = await controller.activateFreePlan(user, {
      plan_id: 'plan-free',
    });
    expect(result).toEqual({ ok: true });
    expect(ensureFree).toHaveBeenCalledWith('user-1');
  });

  it('confirm-subscription still succeeds when credit grant is pending', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { stripe_subscription_id: 'sub_123' },
    });
    const fromMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ maybeSingle }),
      }),
    });
    const controller = makeController(fromMock, {
      stripe: {
        syncSubscriptionFromSetupIntent: jest
          .fn()
          .mockResolvedValue({ applied: true, reason: 'ok' }),
      },
      subscriptionCredits: {
        ensureCreditsFromStripeSubscription: jest
          .fn()
          .mockResolvedValue({ applied: false }),
      },
    });

    const result = await controller.confirmSubscriptionPurchase(user, {
      setup_intent_id: 'seti_test',
    });
    expect(result).toEqual({ ok: true });
  });

  it('confirm-subscription throws when sync fails', async () => {
    const fromMock = jest.fn();
    const controller = makeController(fromMock, {
      stripe: {
        syncSubscriptionFromPaymentIntent: jest
          .fn()
          .mockResolvedValue({ applied: false, reason: 'not_succeeded' }),
      },
    });

    await expect(
      controller.confirmSubscriptionPurchase(user, {
        payment_intent_id: 'pi_test',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
