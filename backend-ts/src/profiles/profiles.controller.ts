import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  Logger,
  ParseUUIDPipe,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { OptionalAuth } from '../auth/optional-auth.decorator';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import type { MySubscriptionResponseDto } from '../plans/plans.dto';
import {
  ProfileResponseDto,
  ProfileUpdateDto,
  ProfileDetailResponseDto,
  PublicProfileDto,
  OwnerProfileExtrasDto,
  ProfileReviewCreateDto,
  ProfileReviewItemDto,
  NotificationPreferencesClientShape,
  ProfileOpenChatBodyDto,
  ProfileOpenChatResponseDto,
} from './profiles.dto';
import { ProfileOpenChatService } from './profile-open-chat.service';
import { JwtVerifyService } from '../auth/jwt-verify.service';
import {
  mergeNotificationPreferences,
  serializeNotificationPreferencesForClient,
} from '../notifications/notification-prefs-merge.util';
import { SearchIndexingService } from '../search/search-indexing.service';
import { StripeService } from '../payments/stripe.service';
import { SubscriptionCreditsService } from '../payments/subscription-credits.service';
import { SkRpoLookupService } from '../registry/sk-rpo-lookup.service';
import { NewsletterService } from '../newsletter/newsletter.service';
import { ConsentEventsService } from '../consent/consent-events.service';
import { DataExportService } from '../data-export/data-export.service';
import { normalizeSkIco } from '../registry/sk-rpo-ico.util';
import {
  displayNameFromProfileRow as displayNameFromProfileRowUtil,
} from './profile-display.util';
import { AccountPermanentDeletionService } from './account-permanent-deletion.service';

const PROFILE_COLUMNS_LEGACY =
  'id,role,app_role,extra_permission_scopes,phone_e164,phone_verified_at,display_name,company_name,first_name,last_name,registered_office,' +
  'tax_id,vat_id,avatar_url,bio,education,skills,job_interests,location,' +
  'description,sector,experience,registration_number,website,logo_url,credits,' +
  'customer_role,worker_role,provider_role,created_at,notification_preferences,' +
  'chat_identity_public_key,chat_identity_key_updated_at,registry_verified_at';

const PROFILE_COLUMNS_PRIVACY =
  'public_profile_enabled,public_show_phone,public_show_address,public_allow_platform_contact,public_show_in_company_search,marketing_processing_consent,billing_details';

const PROFILE_COLUMNS = `${PROFILE_COLUMNS_LEGACY},public_show_account_email,${PROFILE_COLUMNS_PRIVACY}`;

function isProfileSelectMissingOptionalColumnError(err: {
  message?: string;
  code?: string;
}): boolean {
  const m = String(err?.message ?? '').toLowerCase();
  if (m.includes('public_show_account_email')) {
    return true;
  }
  if (m.includes('registry_verified_at')) {
    return true;
  }
  if (m.includes('public_profile_enabled') || m.includes('billing_details')) {
    return true;
  }
  if (m.includes('column') && m.includes('does not exist')) {
    return true;
  }
  if (m.includes('schema cache')) {
    return true;
  }
  return err?.code === '42703';
}

const PATCH_WHITELIST = new Set([
  'role',
  'display_name',
  'company_name',
  'first_name',
  'last_name',
  'registered_office',
  'tax_id',
  'vat_id',
  'avatar_url',
  'bio',
  'education',
  'skills',
  'job_interests',
  'location',
  'description',
  'sector',
  'experience',
  'registration_number',
  'website',
  'logo_url',
  'customer_role',
  'worker_role',
  'provider_role',
  'notification_preferences',
  'chat_identity_public_key',
  'phone_e164',
  'public_show_account_email',
  'public_profile_enabled',
  'public_show_phone',
  'public_show_address',
  'public_allow_platform_contact',
  'public_show_in_company_search',
  'marketing_processing_consent',
  'billing_details',
]);


type ProfileRow = Record<string, unknown>;

function rowToProfileResponse(row: ProfileRow): ProfileResponseDto {
  const extra = row.extra_permission_scopes;
  return {
    id: String(row.id),
    role: String(row.role),
    app_role: String(row.app_role ?? 'user'),
    extra_permission_scopes: Array.isArray(extra)
      ? extra.map((s) => String(s))
      : [],
    phone_e164: (row.phone_e164 as string | null) ?? null,
    phone_verified_at: (row.phone_verified_at as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
    company_name: (row.company_name as string | null) ?? null,
    first_name: (row.first_name as string | null) ?? null,
    last_name: (row.last_name as string | null) ?? null,
    registered_office: (row.registered_office as string | null) ?? null,
    tax_id: (row.tax_id as string | null) ?? null,
    vat_id: (row.vat_id as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    education: (row.education as string | null) ?? null,
    skills: (row.skills as string | null) ?? null,
    job_interests: (row.job_interests as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    sector: (row.sector as string | null) ?? null,
    experience: (row.experience as string | null) ?? null,
    registration_number: (row.registration_number as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    logo_url: (row.logo_url as string | null) ?? null,
    credits: Number(row.credits) || 0,
    customer_role: Boolean(row.customer_role),
    worker_role: Boolean(row.worker_role),
    provider_role: Boolean(row.provider_role),
    created_at: (row.created_at as string | null) ?? null,
    notification_preferences: serializeNotificationPreferencesForClient(
      row.notification_preferences,
    ),
    chat_identity_public_key:
      row.chat_identity_public_key != null
        ? String(row.chat_identity_public_key)
        : null,
    chat_identity_key_updated_at:
      row.chat_identity_key_updated_at != null
        ? String(row.chat_identity_key_updated_at)
        : null,
    public_show_account_email: Boolean(row.public_show_account_email),
    public_profile_enabled: row.public_profile_enabled !== false,
    public_show_phone: Boolean(row.public_show_phone),
    public_show_address: row.public_show_address !== false,
    public_allow_platform_contact: row.public_allow_platform_contact !== false,
    public_show_in_company_search: row.public_show_in_company_search !== false,
    marketing_processing_consent: Boolean(row.marketing_processing_consent),
    billing_details:
      row.billing_details && typeof row.billing_details === 'object'
        ? (row.billing_details as Record<string, unknown>)
        : {},
    registry_verified: row.registry_verified_at != null && String(row.registry_verified_at).length > 0,
  };
}

@Controller('profiles')
export class ProfilesController {
  private readonly logger = new Logger(ProfilesController.name);

  constructor(
    private supabase: SupabaseService,
    private searchIndexing: SearchIndexingService,
    private stripeService: StripeService,
    private subscriptionCredits: SubscriptionCreditsService,
    private audit: AuditService,
    private skRpoLookup: SkRpoLookupService,
    private newsletter: NewsletterService,
    private consentEvents: ConsentEventsService,
    private dataExport: DataExportService,
    private profileOpenChat: ProfileOpenChatService,
    private jwtVerify: JwtVerifyService,
    private accountPermanentDeletion: AccountPermanentDeletionService,
  ) {}

  @Get('me')
  @UseGuards(JwksAuthGuard)
  async getMe(@CurrentUserDecorator() user: CurrentUser): Promise<ProfileResponseDto> {
    void this.subscriptionCredits
      .ensureFreePlanCreditsForCurrentMonth(user.id)
      .catch((err) => {
        this.logger.warn(
          `ensureFreePlanCreditsForCurrentMonth failed for ${user.id}: ${String(err)}`,
        );
      });
    const row = await this.loadProfileRowById(user.id);
    if (row) return rowToProfileResponse(row);
    this.logger.warn(`Profile select failed for user ${user.id}, attempting insert`);
    const { error: insertError } = await this.supabase
      .getClient()
      .from('profiles')
      .insert({
        id: user.id,
        role: user.role,
        app_role: user.appRole,
        credits: 0,
      });
    if (!insertError) {
      void this.searchIndexing.indexProfileById(user.id);
      const created = await this.loadProfileRowById(user.id);
      if (created) {
        return rowToProfileResponse(created as unknown as ProfileRow);
      }
    }
    const retry = await this.loadProfileRowById(user.id);
    if (retry) return rowToProfileResponse(retry);
    throw new NotFoundException(
      `Profil nebol nájdený. (user id: ${user.id})`,
    );
  }

  // GDPR Art. 15 — ZIP via DataExportService; extend payload when adding PII columns.
  // Auth: GlobalAuthGuard (BFF cookies + Bearer). Do not add JwksAuthGuard — export uses cookie fetch.
  @Get('me/export')
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  async exportMe(
    @CurrentUserDecorator() user: CurrentUser,
    @Res() res: Response,
  ): Promise<void> {
    const zip = await this.dataExport.buildExportZip(user.id);
    await this.audit.recordAuditEvent({
      actorUserId: user.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'data.export.requested',
      subjectType: 'profile',
      subjectId: user.id,
      payload: { bytes: zip.length },
    });
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="jobbie-export-${stamp}.zip"`,
    );
    res.send(zip);
  }

  // SECURITY: cancels billing, hides listings, hard-deletes auth.users (GDPR erasure).
  @Post('me/delete')
  async deleteMe(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<{ deleted: boolean }> {
    return this.accountPermanentDeletion.permanentlyDeleteAccount(user.id, {
      actorUserId: user.id,
      eventType: 'account.deleted',
    });
  }

  @Patch('me')
  @UseGuards(JwksAuthGuard)
  async patchMe(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ProfileUpdateDto,
    @Req() req: Request,
  ): Promise<ProfileResponseDto> {
    const payload = body as Record<string, unknown>;
    const keys = Object.keys(payload).filter(
      (k) =>
        payload[k] !== undefined &&
        k !== 'credits' &&
        PATCH_WHITELIST.has(k),
    );
    if (keys.length === 0) {
      const row = await this.loadProfileRowById(user.id);
      if (!row) {
        throw new NotFoundException(
          `Profil nebol nájdený. (user id: ${user.id})`,
        );
      }
      return rowToProfileResponse(row);
    }
    const beforeRow = await this.loadProfileRowById(user.id);
    if (!beforeRow) {
      throw new NotFoundException(
        `Profil nebol nájdený. (user id: ${user.id})`,
      );
    }
    const wantsRoleUpdate =
      keys.includes('customer_role') ||
      keys.includes('worker_role') ||
      keys.includes('provider_role');
    if (keys.includes('role')) {
      const nextAccountType = String(payload.role ?? '').trim();
      if (nextAccountType !== 'individual' && nextAccountType !== 'company') {
        throw new BadRequestException('Neplatný typ účtu.');
      }
      payload.role = nextAccountType;
    }
    if (wantsRoleUpdate) {
      const nextCustomer =
        payload.customer_role !== undefined
          ? Boolean(payload.customer_role)
          : beforeRow.customer_role === true;
      const nextWorker =
        payload.worker_role !== undefined
          ? Boolean(payload.worker_role)
          : beforeRow.worker_role === true;
      const nextProvider =
        payload.provider_role !== undefined
          ? Boolean(payload.provider_role)
          : beforeRow.provider_role === true;
      if (!nextCustomer && !nextWorker && !nextProvider) {
        throw new BadRequestException('Vyberte aspoň jednu rolu.');
      }
    }
    const update: Record<string, unknown> = {};
    for (const k of keys) {
      if (k === 'notification_preferences') {
        update.notification_preferences = mergeNotificationPreferences(
          beforeRow.notification_preferences,
          body.notification_preferences ?? payload.notification_preferences,
        );
        continue;
      }
      if (k === 'billing_details') {
        const prev =
          beforeRow.billing_details &&
          typeof beforeRow.billing_details === 'object'
            ? { ...(beforeRow.billing_details as Record<string, unknown>) }
            : {};
        const partial = payload.billing_details;
        update.billing_details =
          partial && typeof partial === 'object'
            ? { ...prev, ...(partial as Record<string, unknown>) }
            : prev;
        continue;
      }
      update[k] = payload[k];
    }
    if (keys.includes('chat_identity_public_key')) {
      update.chat_identity_key_updated_at = new Date().toISOString();
    }
    if (keys.includes('registration_number')) {
      const oldN = normalizeSkIco(
        beforeRow.registration_number as string | null | undefined,
      );
      const rawNew = payload.registration_number;
      const newN = normalizeSkIco(
        rawNew === null || rawNew === undefined ? '' : String(rawNew),
      );
      if (oldN !== newN) {
        update.registry_verified_at = null;
      }
    }
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .update(update)
      .eq('id', user.id)
      .select(PROFILE_COLUMNS)
      .single();
    if (error || !data) {
      this.logger.warn(
        `Profile update failed for user ${user.id}: code=${(error as { code?: string })?.code} message=${(error as { message?: string })?.message}`,
      );
      const fallback = await this.loadProfileRowById(user.id);
      if (fallback) return rowToProfileResponse(fallback);
      throw new NotFoundException(
        `Profil nebol nájdený. (user id: ${user.id})`,
      );
    }
    let finalRow = data as unknown as ProfileRow;
    if (keys.includes('role') && String(beforeRow.role) !== String(finalRow.role)) {
      this.jwtVerify.invalidateProfileCache(user.id);
    }
    const activityFlagKeys = ['customer_role', 'worker_role', 'provider_role'] as const;
    if (
      activityFlagKeys.some(
        (k) =>
          keys.includes(k) &&
          Boolean(beforeRow[k]) !== Boolean((finalRow as ProfileRow)[k]),
      )
    ) {
      this.jwtVerify.invalidateProfileCache(user.id);
    }
    if (String(beforeRow.role) === 'company' && keys.includes('registration_number')) {
      const oldN = normalizeSkIco(
        String(beforeRow.registration_number ?? ''),
      );
      const newN = normalizeSkIco(
        String(finalRow.registration_number ?? ''),
      );
      if (oldN !== newN && newN.length === 8) {
        const verified = await this.skRpoLookup.isIcoActiveInRpo(newN);
        if (verified) {
          const { data: stamped, error: stampErr } = await this.supabase
            .getClient()
            .from('profiles')
            .update({ registry_verified_at: new Date().toISOString() })
            .eq('id', user.id)
            .select(PROFILE_COLUMNS)
            .single();
          if (!stampErr && stamped) {
            finalRow = stamped as ProfileRow;
          } else if (stampErr) {
            this.logger.warn(
              `registry_verified_at stamp failed: ${(stampErr as { message?: string }).message}`,
            );
          }
        }
      }
    }
    if (keys.includes('marketing_processing_consent')) {
      const granted = Boolean(payload.marketing_processing_consent);
      await this.consentEvents.record(
        user.id,
        'marketing_profile',
        granted,
        'profile_settings',
      );
      if (!granted) {
        await this.newsletter.withdrawMarketingForUser(user.id);
      }
    }
    const response = rowToProfileResponse(finalRow);
    const diffs = this.buildProfileFieldDiffs(
      beforeRow,
      update,
      keys,
    );
    const headerUa = req.headers['user-agent'];
    const ua = typeof headerUa === 'string' ? headerUa : null;
    const auditId = await this.audit.recordAuditEvent({
      actorUserId: user.id,
      actorIp: this.clientIp(req),
      actorUserAgent: ua,
      sessionId: null,
      deviceId: null,
      eventType: 'profile.updated',
      subjectType: 'profile',
      subjectId: user.id,
      payload: { fields: keys },
    });
    await this.audit.recordProfileFieldChanges({
      profileId: user.id,
      changes: diffs,
      auditEventId: auditId,
    });
    void this.searchIndexing.indexProfileById(user.id);
    return response;
  }

  private clientIp(req: Request): string | null {
    const xff = req.headers['x-forwarded-for'];
    const raw = Array.isArray(xff) ? xff[0] : xff;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.split(',')[0]?.trim() ?? null;
    }
    const a = req.socket?.remoteAddress;
    return a ?? null;
  }

  private buildProfileFieldDiffs(
    before: ProfileRow,
    update: Record<string, unknown>,
    keys: string[],
  ): Array<{
    fieldName: string;
    oldValue: string | null;
    newValue: string | null;
  }> {
    const serialize = (v: unknown): string | null => {
      if (v === undefined || v === null) {
        return null;
      }
      if (typeof v === 'object') {
        return JSON.stringify(v);
      }
      return String(v);
    };
    const out: Array<{
      fieldName: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];
    const beforeRec = before as Record<string, unknown>;
    for (const k of keys) {
      if (k === 'notification_preferences') {
        const oldV = serialize(
          serializeNotificationPreferencesForClient(
            before.notification_preferences,
          ),
        );
        const newV = serialize(update.notification_preferences);
        if (oldV !== newV) {
          out.push({
            fieldName: k,
            oldValue: oldV,
            newValue: newV,
          });
        }
        continue;
      }
      const oldV = serialize(beforeRec[k]);
      const newV = serialize(update[k]);
      if (oldV !== newV) {
        out.push({ fieldName: k, oldValue: oldV, newValue: newV });
      }
    }
    return out;
  }

  @Get(':id/reviews')
  @OptionalAuth()
  async listReviews(
    @Param('id', ParseUUIDPipe) profileId: string,
    @Query('limit') limitRaw = '20',
    @Query('offset') offsetRaw = '0',
  ): Promise<ProfileReviewItemDto[]> {
    const limit = Math.min(Math.max(Number(limitRaw) || 20, 1), 50);
    const offset = Math.max(Number(offsetRaw) || 0, 0);
    const row = await this.loadProfileRowById(profileId);
    if (!row) {
      throw new NotFoundException('Profil nebol nájdený');
    }
    const { data: reviews, error } = await this.supabase
      .getClient()
      .from('profile_reviews')
      .select('id, rating, comment, created_at, reviewer_id')
      .eq('reviewee_id', profileId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) {
      this.logger.warn(`listReviews: ${(error as { message?: string }).message}`);
      return [];
    }
    if (!reviews?.length) {
      return [];
    }
    const reviewerIds = [
      ...new Set((reviews as { reviewer_id: string }[]).map((r) => r.reviewer_id)),
    ];
    const reviewerById = await this.loadReviewerProfileRowsByIds(reviewerIds);
    const rows = reviews as {
      id: string;
      rating: number;
      comment: string | null;
      created_at: string;
      reviewer_id: string;
    }[];
    return Promise.all(
      rows.map((r) =>
        this.toProfileReviewItemDtoAsync(
          r,
          reviewerById.get(r.reviewer_id) ?? null,
        ),
      ),
    );
  }

  @Post(':id/reviews')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwksAuthGuard)
  async createReview(
    @Param('id', ParseUUIDPipe) profileId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ProfileReviewCreateDto,
  ): Promise<ProfileReviewItemDto> {
    if (profileId === user.id) {
      throw new BadRequestException({
        code: 'REVIEW_SELF',
        message: 'Nemôžete ohodnotiť sám seba.',
      });
    }
    const reviewee = await this.loadProfileRowById(profileId);
    if (!reviewee) {
      throw new NotFoundException('Profil nebol nájdený');
    }
    this.assertRevieweeAcceptsReviews(reviewee, user.id);
    const reviewer = await this.loadProfileRowById(user.id);
    if (!reviewer) {
      throw new BadRequestException({
        code: 'REVIEWER_PROFILE_MISSING',
        message: 'Pred hodnotením dokončite svoj profil.',
      });
    }
    const rating = Math.round(Number(body.rating));
    const commentRaw = body.comment;
    const comment =
      typeof commentRaw === 'string' && commentRaw.trim().length > 0
        ? commentRaw.trim().slice(0, 2000)
        : null;
    const { data, error } = await this.supabase
      .getClient()
      .from('profile_reviews')
      .insert({
        reviewee_id: profileId,
        reviewer_id: user.id,
        rating,
        comment,
      })
      .select('id, rating, comment, created_at, reviewer_id')
      .single();
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        throw new ConflictException({
          code: 'REVIEW_ALREADY_EXISTS',
          message: 'Tento profil ste už ohodnotili.',
        });
      }
      this.logger.warn(
        `createReview insert failed: code=${code} message=${(error as { message?: string }).message}`,
      );
      throw new BadRequestException({
        code: 'REVIEW_INSERT_FAILED',
        message: 'Hodnotenie sa nepodarilo uložiť.',
      });
    }
    if (!data) {
      throw new BadRequestException({
        code: 'REVIEW_INSERT_FAILED',
        message: 'Hodnotenie sa nepodarilo uložiť.',
      });
    }
    const inserted = data as {
      id: string;
      rating: number;
      comment: string | null;
      created_at: string;
      reviewer_id: string;
    };
    return this.toProfileReviewItemDtoAsync(inserted, reviewer);
  }

  @Patch(':id/reviews')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwksAuthGuard)
  async updateMyReview(
    @Param('id', ParseUUIDPipe) profileId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ProfileReviewCreateDto,
  ): Promise<ProfileReviewItemDto> {
    if (profileId === user.id) {
      throw new BadRequestException({
        code: 'REVIEW_SELF',
        message: 'Nemôžete upravovať hodnotenie sám seba.',
      });
    }
    const reviewee = await this.loadProfileRowById(profileId);
    if (!reviewee) {
      throw new NotFoundException('Profil nebol nájdený');
    }
    this.assertRevieweeAcceptsReviews(reviewee, user.id);
    const reviewer = await this.loadProfileRowById(user.id);
    if (!reviewer) {
      throw new BadRequestException({
        code: 'REVIEWER_PROFILE_MISSING',
        message: 'Pred úpravou dokončite svoj profil.',
      });
    }
    const rating = Math.round(Number(body.rating));
    const commentRaw = body.comment;
    const comment =
      typeof commentRaw === 'string' && commentRaw.trim().length > 0
        ? commentRaw.trim().slice(0, 2000)
        : null;
    const { data: existing, error: findErr } = await this.supabase
      .getClient()
      .from('profile_reviews')
      .select('id')
      .eq('reviewee_id', profileId)
      .eq('reviewer_id', user.id)
      .maybeSingle();
    if (findErr) {
      this.logger.warn(`updateMyReview select: ${findErr.message}`);
      throw new BadRequestException({
        code: 'REVIEW_LOOKUP_FAILED',
        message: 'Hodnotenie sa nepodarilo načítať.',
      });
    }
    if (!existing) {
      throw new NotFoundException('Nemáte uložené hodnotenie tohto profilu.');
    }
    const reviewId = (existing as { id: string }).id;
    const { data, error } = await this.supabase
      .getClient()
      .from('profile_reviews')
      .update({ rating, comment })
      .eq('id', reviewId)
      .select('id, rating, comment, created_at, reviewer_id')
      .single();
    if (error || !data) {
      this.logger.warn(
        `updateMyReview failed: ${(error as { message?: string })?.message ?? 'no row'}`,
      );
      throw new BadRequestException({
        code: 'REVIEW_UPDATE_FAILED',
        message: 'Hodnotenie sa nepodarilo uložiť.',
      });
    }
    const row = data as {
      id: string;
      rating: number;
      comment: string | null;
      created_at: string;
      reviewer_id: string;
    };
    return this.toProfileReviewItemDtoAsync(row, reviewer);
  }

  @Delete(':id/reviews')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwksAuthGuard)
  async deleteMyReview(
    @Param('id', ParseUUIDPipe) profileId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<{ deleted: true }> {
    if (profileId === user.id) {
      throw new BadRequestException({
        code: 'REVIEW_SELF',
        message: 'Nemôžete zmazať hodnotenie sám seba.',
      });
    }
    const reviewee = await this.loadProfileRowById(profileId);
    if (!reviewee) {
      throw new NotFoundException('Profil nebol nájdený');
    }
    this.assertRevieweeAcceptsReviews(reviewee, user.id);
    const { data, error } = await this.supabase
      .getClient()
      .from('profile_reviews')
      .delete()
      .eq('reviewee_id', profileId)
      .eq('reviewer_id', user.id)
      .select('id');
    if (error) {
      this.logger.warn(`deleteMyReview: ${error.message}`);
      throw new BadRequestException({
        code: 'REVIEW_DELETE_FAILED',
        message: 'Hodnotenie sa nepodarilo zmazať.',
      });
    }
    const removed = Array.isArray(data) ? data.length : 0;
    if (removed === 0) {
      throw new NotFoundException('Nemáte uložené hodnotenie tohto profilu.');
    }
    return { deleted: true };
  }

  @Post(':id/open-chat')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(JwksAuthGuard)
  async openChat(
    @Param('id', ParseUUIDPipe) profileId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ProfileOpenChatBodyDto,
  ): Promise<ProfileOpenChatResponseDto> {
    return this.profileOpenChat.openChat(user.id, profileId, body);
  }

  @Get(':id')
  @OptionalAuth()
  async getPublicProfile(
    @Param('id', ParseUUIDPipe) profileId: string,
    @CurrentUserDecorator() user: CurrentUser | null,
  ): Promise<ProfileDetailResponseDto> {
    const row = await this.loadProfileRowById(profileId);
    if (!row) {
      throw new NotFoundException('Profil nebol nájdený');
    }
    const { average, count } = await this.getRatingStats(profileId);
    const profile = await this.buildPublicProfileDto(
      row,
      profileId,
      average,
      count,
    );
    const isOwner = Boolean(user?.id === profileId);
    if (!isOwner && row.public_profile_enabled === false) {
      throw new NotFoundException('Profil nie je verejný.');
    }
    if (!isOwner) {
      let viewer_review: ProfileReviewItemDto | null = null;
      if (user?.id) {
        viewer_review = await this.loadViewerReviewForProfile(
          profileId,
          user.id,
        );
      }
      return { profile, viewer_review };
    }
    const subscription = await this.getSubscriptionForUser(profileId);
    const owner: OwnerProfileExtrasDto = {
      credits: Number(row.credits) || 0,
      subscription,
    };
    return { profile, owner };
  }

  private async buildPublicProfileDto(
    row: ProfileRow,
    profileId: string,
    ratingAverage: number,
    ratingCount: number,
  ): Promise<PublicProfileDto> {
    const phoneVerified = Boolean(row.phone_verified_at);
    const phoneRaw = (row.phone_e164 as string | null) ?? null;
    let contactEmail: string | null = null;
    if (row.public_show_account_email === true) {
      try {
        const { data, error } = await this.supabase
          .getClient()
          .auth.admin.getUserById(profileId);
        if (!error && data?.user?.email) {
          contactEmail = data.user.email;
        }
      } catch (err: unknown) {
        this.logger.warn(
          `auth.admin.getUserById failed for ${profileId}: ${String(err)}`,
        );
      }
    }
    return {
      id: String(row.id),
      role: String(row.role),
      display_name: (row.display_name as string | null) ?? null,
      company_name: (row.company_name as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
      logo_url: (row.logo_url as string | null) ?? null,
      bio: (row.bio as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      location: (row.location as string | null) ?? null,
      skills: (row.skills as string | null) ?? null,
      sector: (row.sector as string | null) ?? null,
      website: (row.website as string | null) ?? null,
      registered_office:
        row.public_show_address !== false
          ? ((row.registered_office as string | null) ?? null)
          : null,
      phone_e164:
        phoneVerified &&
        phoneRaw &&
        row.public_show_phone === true
          ? phoneRaw
          : null,
      contact_email: contactEmail,
      customer_role: Boolean(row.customer_role),
      worker_role: Boolean(row.worker_role),
      provider_role: Boolean(row.provider_role),
      created_at: String(row.created_at ?? new Date().toISOString()),
      rating_average: ratingAverage,
      rating_count: ratingCount,
      registry_verified:
        row.registry_verified_at != null && String(row.registry_verified_at).length > 0,
    };
  }

  private displayNameFromProfileRow(row: ProfileRow): string | null {
    return displayNameFromProfileRowUtil(row);
  }

  private async loadProfileRowById(
    id: string,
  ): Promise<(ProfileRow & { is_deleted?: boolean }) | null> {
    const client = this.supabase.getClient();
    const attempt = await client
      .from('profiles')
      .select(PROFILE_COLUMNS + ',is_deleted')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    const { data, error } = attempt;
    if (error && isProfileSelectMissingOptionalColumnError(error)) {
      this.logger.warn(
        `profile select full columns retried (legacy list): ${error.message}`,
      );
      const legacy = await client
        .from('profiles')
        .select(PROFILE_COLUMNS_LEGACY + ',is_deleted')
        .eq('id', id)
        .eq('is_deleted', false)
        .maybeSingle();
      if (legacy.error || !legacy.data) {
        return null;
      }
      return {
        ...(legacy.data as object),
        public_show_account_email: false,
        registry_verified_at: null,
        public_profile_enabled: true,
        public_show_phone: false,
        public_show_address: true,
        public_allow_platform_contact: true,
        public_show_in_company_search: true,
        marketing_processing_consent: false,
        billing_details: {},
      } as ProfileRow & { is_deleted?: boolean };
    }
    if (error || !data) return null;
    return data as unknown as ProfileRow & { is_deleted?: boolean };
  }

  private assertRevieweeAcceptsReviews(
    reviewee: ProfileRow & { is_deleted?: boolean },
    callerId: string,
  ): void {
    if (reviewee.public_profile_enabled === false) {
      throw new NotFoundException('Profil nie je verejný.');
    }
    if (String(reviewee.id) === callerId) {
      throw new BadRequestException({
        code: 'REVIEW_SELF',
        message: 'Nemôžete ohodnotiť sám seba.',
      });
    }
  }

  private async loadViewerReviewForProfile(
    revieweeId: string,
    reviewerId: string,
  ): Promise<ProfileReviewItemDto | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profile_reviews')
      .select('id, rating, comment, created_at, reviewer_id')
      .eq('reviewee_id', revieweeId)
      .eq('reviewer_id', reviewerId)
      .maybeSingle();
    if (error || !data) {
      if (error) {
        this.logger.warn(
          `loadViewerReviewForProfile: ${(error as { message?: string }).message}`,
        );
      }
      return null;
    }
    const row = data as {
      id: string;
      rating: number;
      comment: string | null;
      created_at: string;
      reviewer_id: string;
    };
    const reviewer = await this.loadProfileRowById(reviewerId);
    return this.toProfileReviewItemDtoAsync(row, reviewer);
  }

  private async loadReviewerProfileRowsByIds(
    ids: string[],
  ): Promise<Map<string, ProfileRow>> {
    const out = new Map<string, ProfileRow>();
    if (ids.length === 0) {
      return out;
    }
    const client = this.supabase.getClient();
    const selectFull =
      'id, role, display_name, first_name, last_name, company_name, avatar_url, logo_url, public_profile_enabled, is_deleted';
    const fullBatch = await client
      .from('profiles')
      .select(selectFull)
      .in('id', ids)
      .eq('is_deleted', false);
    let batchRows: Record<string, unknown>[] | null = fullBatch.data as
      | Record<string, unknown>[]
      | null;
    let batchError = fullBatch.error;
    if (batchError && isProfileSelectMissingOptionalColumnError(batchError)) {
      const legacyBatch = await client
        .from('profiles')
        .select(
          'id, role, display_name, first_name, last_name, company_name, avatar_url, logo_url, is_deleted',
        )
        .in('id', ids)
        .eq('is_deleted', false);
      batchRows = legacyBatch.data as Record<string, unknown>[] | null;
      batchError = legacyBatch.error;
    }
    if (batchError) {
      this.logger.warn(
        `loadReviewerProfileRowsByIds batch: ${batchError.message}`,
      );
    } else {
      for (const p of batchRows ?? []) {
        const row = p as ProfileRow & { id: string };
        out.set(String(row.id), {
          ...row,
          public_profile_enabled:
            (row as { public_profile_enabled?: boolean })
              .public_profile_enabled ?? true,
        } as ProfileRow);
      }
    }
    const missing = ids.filter((id) => !out.has(id));
    await Promise.all(
      missing.map(async (id) => {
        const row = await this.loadProfileRowById(id);
        if (row) {
          out.set(id, row);
        }
      }),
    );
    return out;
  }

  private async resolveReviewerDisplayNameFromAuth(
    userId: string,
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .getClient()
        .auth.admin.getUserById(userId);
      if (error || !data?.user) {
        return null;
      }
      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      const fromMeta =
        String(meta.display_name ?? meta.name ?? '').trim() ||
        [meta.first_name, meta.last_name]
          .map((v) => (typeof v === 'string' ? v.trim() : ''))
          .filter(Boolean)
          .join(' ')
          .trim();
      if (fromMeta) {
        return fromMeta;
      }
      const email = data.user.email?.trim();
      if (!email) {
        return null;
      }
      const local = email.split('@')[0]?.trim();
      return local || null;
    } catch (err: unknown) {
      this.logger.warn(
        `resolveReviewerDisplayNameFromAuth ${userId}: ${String(err)}`,
      );
      return null;
    }
  }

  private async resolveReviewerDisplayName(
    userId: string,
    row: ProfileRow | null,
  ): Promise<string | null> {
    if (row) {
      const fromRow = this.displayNameFromProfileRow(row);
      if (fromRow) {
        return fromRow;
      }
    }
    return this.resolveReviewerDisplayNameFromAuth(userId);
  }

  private async buildReviewerPublicSnapshotAsync(
    row: ProfileRow,
    userId: string,
  ): Promise<{
    reviewer_display_name: string | null;
    reviewer_role: string;
    reviewer_avatar_url: string | null;
    reviewer_logo_url: string | null;
    reviewer_public_profile_enabled: boolean;
  }> {
    return {
      reviewer_display_name: await this.resolveReviewerDisplayName(userId, row),
      reviewer_role: String(row.role ?? ''),
      reviewer_avatar_url: (row.avatar_url as string | null) ?? null,
      reviewer_logo_url: (row.logo_url as string | null) ?? null,
      reviewer_public_profile_enabled: row.public_profile_enabled !== false,
    };
  }

  private async toProfileReviewItemDtoAsync(
    review: {
      id: string;
      rating: number;
      comment: string | null;
      created_at: string;
      reviewer_id: string;
    },
    reviewer: ProfileRow | null,
  ): Promise<ProfileReviewItemDto> {
    const base: ProfileReviewItemDto = {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      reviewer_id: review.reviewer_id,
      reviewer_display_name: null,
      reviewer_role: null,
      reviewer_avatar_url: null,
      reviewer_logo_url: null,
      reviewer_public_profile_enabled: false,
    };
    if (!reviewer) {
      const name = await this.resolveReviewerDisplayNameFromAuth(
        review.reviewer_id,
      );
      if (name) {
        return { ...base, reviewer_display_name: name };
      }
      return base;
    }
    return {
      ...base,
      ...(await this.buildReviewerPublicSnapshotAsync(
        reviewer,
        review.reviewer_id,
      )),
    };
  }

  private async getRatingStats(
    revieweeId: string,
  ): Promise<{ average: number; count: number }> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profile_reviews')
      .select('rating')
      .eq('reviewee_id', revieweeId);
    if (error || !data?.length) {
      return { average: 0, count: 0 };
    }
    const ratings = data as { rating: number }[];
    const sum = ratings.reduce((s, r) => s + r.rating, 0);
    return {
      average: Math.round((sum / ratings.length) * 10) / 10,
      count: ratings.length,
    };
  }

  private async getSubscriptionForUser(
    userId: string,
  ): Promise<MySubscriptionResponseDto | null> {
    const { data: subData } = await this.supabase
      .getClient()
      .from('user_subscriptions')
      .select('plan_id,status,current_period_end')
      .eq('user_id', userId)
      .limit(1);
    const sub =
      Array.isArray(subData) && subData.length > 0 ? subData[0] : null;
    if (!sub) return null;
    const { data: planData } = await this.supabase
      .getClient()
      .from('subscription_plans')
      .select('name_sk')
      .eq('id', (sub as { plan_id: string }).plan_id)
      .single();
    const name_sk = (planData as { name_sk?: string } | null)?.name_sk ?? '';
    return {
      plan_id: (sub as { plan_id: string }).plan_id,
      plan_name_sk: name_sk,
      status: (sub as { status: string }).status,
      current_period_end:
        (sub as { current_period_end?: string }).current_period_end ?? null,
    };
  }
}
