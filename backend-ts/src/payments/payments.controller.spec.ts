import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionCreditsService } from './subscription-credits.service';
import { SubscriptionTrialService } from '../billing/subscription-trial.service';
import { CurrentUser, UserRole } from '../auth/auth.types';

function makeController(fromMock: jest.Mock): PaymentsController {
  return new PaymentsController(
    { getClient: () => ({ from: fromMock }) } as unknown as SupabaseService,
    { createCheckoutSession: jest.fn() } as unknown as StripeService,
    { get: jest.fn() } as unknown as ConfigService,
    { recordAuditEvent: jest.fn() } as unknown as AuditService,
    { createForUser: jest.fn() } as unknown as NotificationsService,
    {} as SubscriptionCreditsService,
    {
      markSubscriptionTrialUsed: jest.fn(),
    } as unknown as SubscriptionTrialService,
  );
}

const userA: CurrentUser = {
  id: 'user-a',
  email: 'a@test.com',
  role: UserRole.company,
  appRole: 'employer',
  permissionScopes: [],
  accountStatus: 'active',
  aal: 'aal1',
};

describe('PaymentsController legacy job checkout', () => {
  let fromMock: jest.Mock;

  beforeEach(() => {
    fromMock = jest.fn();
  });

  it('rejects checkout for a job owned by another company', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'job-1',
          company_id: 'user-b',
          is_draft: true,
          is_active: false,
        },
        error: null,
      }),
    };
    fromMock.mockReturnValue(chain);
    const controller = makeController(fromMock);
    await expect(
      controller.createCheckoutSession(userA, {
        job_id: 'job-1',
        success_url: 'https://app.test/ok',
        cancel_url: 'https://app.test/cancel',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects checkout when job is missing', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'nf' } }),
    };
    fromMock.mockReturnValue(chain);
    const controller = makeController(fromMock);
    await expect(
      controller.createCheckoutSession(userA, {
        job_id: 'missing',
        success_url: 'https://app.test/ok',
        cancel_url: 'https://app.test/cancel',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

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
