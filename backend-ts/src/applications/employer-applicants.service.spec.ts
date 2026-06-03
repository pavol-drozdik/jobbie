import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EmployerApplicantsService } from './employer-applicants.service';

function makeService(overrides: {
  rpcResult?: unknown;
  rpcError?: { message: string };
  job?: Record<string, unknown> | null;
  application?: Record<string, unknown> | null;
  autoMessageExisting?: { message_id: string; delivery_status: string } | null;
}) {
  const rpc = jest.fn().mockResolvedValue({
    data: overrides.rpcResult ?? {
      id: 'app-1',
      status: 'reviewing',
      old_status: 'pending',
      unchanged: false,
    },
    error: overrides.rpcError ?? null,
  });

  const fromMock = (table: string) => {
    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.in = jest.fn().mockReturnValue(chain);
    chain.order = jest.fn().mockReturnValue(chain);
    chain.range = jest.fn().mockReturnValue(chain);
    chain.maybeSingle = jest.fn().mockImplementation(async () => {
      if (table === 'job_offers') {
        return { data: overrides.job ?? null, error: null };
      }
      if (table === 'applications') {
        return { data: overrides.application ?? null, error: null };
      }
      if (table === 'application_auto_messages') {
        return { data: overrides.autoMessageExisting ?? null, error: null };
      }
      return { data: null, error: null };
    });
    chain.single = jest.fn().mockImplementation(async () => {
      if (table === 'job_offers') {
        return { data: overrides.job ?? null, error: null };
      }
      if (table === 'applications') {
        return { data: overrides.application ?? null, error: null };
      }
      return { data: null, error: null };
    });
    chain.upsert = jest.fn().mockResolvedValue({ error: null });
    chain.update = jest.fn().mockReturnValue(chain);
    chain.is = jest.fn().mockReturnValue(chain);
    return chain;
  };

  const client = {
    from: jest.fn().mockImplementation(fromMock),
    rpc,
  };

  const service = new EmployerApplicantsService(
    { getClient: () => client } as never,
    { recordAuditEvent: jest.fn() } as never,
    { createForUser: jest.fn(), wantsChannel: jest.fn().mockResolvedValue(false) } as never,
    { insertOutgoingMessage: jest.fn() } as never,
    { getRoomParticipants: jest.fn(), emitMessageToRoom: jest.fn() } as never,
    { notifyRecipientOfNewMessage: jest.fn() } as never,
    { sendHtmlEmail: jest.fn().mockResolvedValue(false) } as never,
    {
      getAggregateByUserId: jest.fn(),
      getEmployerAggregateByCvId: jest.fn(),
    } as never,
    { buildInvitedListPdf: jest.fn() } as never,
    { buildApplicantsExcel: jest.fn() } as never,
    { renderCvPdf: jest.fn() } as never,
    {
      hasPlusOrProAccess: jest.fn().mockResolvedValue(true),
      assertPlusOrProAccess: jest.fn().mockResolvedValue(undefined),
    } as never,
  );

  return { service, rpc, client };
}

const ownedJob = {
  id: 'job-1',
  company_id: 'co-1',
  title: 'Dev',
  is_deleted: false,
  contact_email: null,
  contact_phone: null,
  show_phone_publicly: true,
  company_name: 'ACME',
};

const ownedApp = {
  id: 'app-1',
  job_id: 'job-1',
  individual_id: 'user-1',
  status: 'pending',
  is_deleted: false,
  created_at: new Date().toISOString(),
};

describe('EmployerApplicantsService', () => {
  it('forbids access to another company job', async () => {
    const { service } = makeService({
      job: {
        id: 'job-1',
        company_id: 'other-co',
        title: 'Test',
        is_deleted: false,
      },
    });
    await expect(service.assertJobOwnedBy('job-1', 'my-co')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws when job not found', async () => {
    const { service } = makeService({ job: null });
    await expect(service.assertJobOwnedBy('job-1', 'my-co')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('forbids note on application for another company job', async () => {
    const { service } = makeService({
      job: { ...ownedJob, company_id: 'other-co' },
      application: ownedApp,
    });
    await expect(service.upsertNote('app-1', 'co-1', 'secret')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('updates status via RPC for owned application', async () => {
    const { service, rpc } = makeService({
      job: ownedJob,
      application: ownedApp,
      rpcResult: {
        id: 'app-1',
        status: 'accepted',
        old_status: 'pending',
        unchanged: false,
      },
    });

    const result = await service.setApplicationStatus('app-1', 'co-1', 'accepted', {
      send_auto_reply: false,
    });
    expect(result.status).toBe('accepted');
    expect(rpc).toHaveBeenCalledWith(
      'employer_set_application_status',
      expect.objectContaining({
        p_new_status: 'accepted',
        p_actor_id: 'co-1',
      }),
    );
  });

  it('does not query auto-reply log when send_auto_reply is false', async () => {
    const { service, client } = makeService({
      job: ownedJob,
      application: ownedApp,
    });

    await service.setApplicationStatus('app-1', 'co-1', 'rejected', {
      send_auto_reply: false,
    });

    const autoCalls = client.from.mock.calls.filter(
      (c: string[]) => c[0] === 'application_auto_messages',
    );
    expect(autoCalls.length).toBe(0);
  });

  it('uses company defaults when per-job reply row is inert', async () => {
    const { service, client } = makeService({ job: ownedJob });
    jest.spyOn(service as never, 'getCompanyReplyDefaults' as never).mockResolvedValue({
      company_id: 'co-1',
      rejection_auto_reply_enabled: true,
      rejection_subject: 'Subj',
      rejection_template: 'Company rejection',
      interview_auto_reply_enabled: false,
      interview_subject: '',
      interview_template: '',
    } as never);
    const baseFrom = client.from.getMockImplementation()!;
    client.from.mockImplementation((table: string) => {
      if (table === 'job_applicant_reply_settings') {
        const chain: Record<string, jest.Mock> = {};
        chain.select = jest.fn().mockReturnValue(chain);
        chain.eq = jest.fn().mockReturnValue(chain);
        chain.maybeSingle = jest.fn().mockResolvedValue({
          data: {
            rejection_auto_reply_enabled: false,
            rejection_template: '',
            interview_auto_reply_enabled: false,
            interview_template: '',
          },
          error: null,
        });
        return chain;
      }
      return baseFrom(table);
    });
    const settings = await service.getReplySettings('job-1', 'co-1');
    expect(settings.rejection_auto_reply_enabled).toBe(true);
    expect(settings.rejection_template).toBe('Company rejection');
    expect(settings.uses_company_defaults).toBe(true);
  });

  it('skips duplicate auto-reply when already sent', async () => {
    const { service, client } = makeService({
      job: ownedJob,
      application: ownedApp,
      autoMessageExisting: { message_id: 'msg-1', delivery_status: 'sent' },
    });

    jest.spyOn(service as never, 'getJobReplySettingsRow' as never).mockResolvedValue({
      rejection_auto_reply_enabled: true,
      rejection_subject: 'Subj',
      rejection_template: 'Body {{candidateName}}',
      interview_auto_reply_enabled: false,
      interview_subject: '',
      interview_template: '',
      uses_company_defaults: false,
    } as never);

    await service.setApplicationStatus('app-1', 'co-1', 'rejected', {
      send_auto_reply: true,
      force_resend: false,
    });

    const upsertCalls = client.from.mock.calls.filter(
      (c: string[]) => c[0] === 'application_auto_messages',
    );
    expect(upsertCalls.length).toBeLessThanOrEqual(1);
  });

  it('upserts internal note for owned application', async () => {
    const { service, client } = makeService({
      job: ownedJob,
      application: ownedApp,
    });

    const result = await service.upsertNote('app-1', 'co-1', '  Poznámka HR  ');
    expect(result.note).toBe('Poznámka HR');
    expect(client.from).toHaveBeenCalledWith('application_notes');
  });

  it('bulk status updates each application id', async () => {
    const { service } = makeService({
      job: ownedJob,
      application: ownedApp,
    });
    const spy = jest
      .spyOn(service, 'setApplicationStatus')
      .mockResolvedValue({ id: 'app-1', status: 'accepted' });

    const result = await service.bulkSetApplicationStatus('co-1', {
      application_ids: ['app-1', 'app-2'],
      status: 'accepted',
      send_auto_reply: false,
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(result.updated).toBe(2);
    expect(result.failed).toEqual([]);
    spy.mockRestore();
  });

  it('getPrintList uses all applicants when no status filter', async () => {
    const { service } = makeService({ job: ownedJob });
    const listSpy = jest.spyOn(service, 'listApplicants').mockResolvedValue({
      items: [
        {
          application_id: 'app-1',
          individual_id: 'user-1',
          status: 'interview_invited',
          applied_at: new Date().toISOString(),
          full_name: 'Jan Novák',
          email: null,
          phone: null,
          location: 'Bratislava',
          has_cv: true,
          uses_profile_cv: true,
          cv_id: 'cv-1',
          chat_room_id: null,
          message_preview: null,
          has_note: false,
          note_preview: null,
          photo_url: null,
          desired_position: null,
          experience_years: null,
          availability: null,
          salary_display: null,
          top_skills: [],
          languages: [],
          documents: [],
        },
      ],
      total: 1,
      offset: 0,
      limit: 500,
      status_counts: {
        pending: 0,
        reviewing: 0,
        interview_invited: 1,
        rejected: 0,
        accepted: 0,
        withdrawn: 0,
        total: 1,
      },
    });

    const print = await service.getPrintList('job-1', 'co-1');
    expect(listSpy).toHaveBeenCalledWith(
      'job-1',
      'co-1',
      expect.objectContaining({ status: 'all' }),
    );
    expect(print.items).toHaveLength(1);
    expect(print.items[0]?.full_name).toBe('Jan Novák');
    listSpy.mockRestore();
  });

  it('getPrintList filters by application ids when provided', async () => {
    const { service } = makeService({ job: ownedJob });
    jest.spyOn(service, 'listApplicants').mockResolvedValue({
      items: [
        {
          application_id: 'app-1',
          individual_id: 'u1',
          status: 'interview_invited',
          applied_at: new Date().toISOString(),
          full_name: 'A',
          email: null,
          phone: null,
          location: null,
          has_cv: false,
          uses_profile_cv: false,
          cv_id: null,
          chat_room_id: null,
          message_preview: null,
          has_note: false,
          note_preview: null,
          photo_url: null,
          desired_position: null,
          experience_years: null,
          availability: null,
          salary_display: null,
          top_skills: [],
          languages: [],
          documents: [],
        },
        {
          application_id: 'app-2',
          individual_id: 'u2',
          status: 'interview_invited',
          applied_at: new Date().toISOString(),
          full_name: 'B',
          email: null,
          phone: null,
          location: null,
          has_cv: false,
          uses_profile_cv: false,
          cv_id: null,
          chat_room_id: null,
          message_preview: null,
          has_note: false,
          note_preview: null,
          photo_url: null,
          desired_position: null,
          experience_years: null,
          availability: null,
          salary_display: null,
          top_skills: [],
          languages: [],
          documents: [],
        },
      ],
      total: 2,
      offset: 0,
      limit: 500,
      status_counts: {
        pending: 0,
        reviewing: 0,
        interview_invited: 2,
        rejected: 0,
        accepted: 0,
        withdrawn: 0,
        total: 2,
      },
    });

    const print = await service.getPrintList('job-1', 'co-1', {}, ['app-2']);
    expect(print.items).toHaveLength(1);
    expect(print.items[0]?.application_id).toBe('app-2');
  });

  it('getPrintList passes status filter to listApplicants', async () => {
    const { service } = makeService({ job: ownedJob });
    const listSpy = jest.spyOn(service, 'listApplicants').mockResolvedValue({
      items: [],
      total: 0,
      offset: 0,
      limit: 100,
      status_counts: {
        pending: 0,
        reviewing: 0,
        interview_invited: 0,
        rejected: 0,
        accepted: 0,
        withdrawn: 0,
        total: 0,
      },
    });

    await service.getPrintList('job-1', 'co-1', { status: 'rejected' });
    expect(listSpy).toHaveBeenCalledWith(
      'job-1',
      'co-1',
      expect.objectContaining({ status: 'rejected' }),
    );
    listSpy.mockRestore();
  });
});
