import {

  Body,

  Controller,

  Delete,

  ForbiddenException,

  Get,

  UnauthorizedException,

  HttpCode,

  HttpStatus,

  NotFoundException,

  Param,

  ParseUUIDPipe,

  Patch,

  Post,

  Query,

  Req,

  UseGuards,

  UseInterceptors,

} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';

import { Request } from 'express';

import { OptionalAuth } from '../auth/optional-auth.decorator';
import { AnonymousCatalogCacheInterceptor } from '../common/interceptors/anonymous-catalog-cache.interceptor';
import { sanitizeRichTextHtml } from '../common/sanitize-html.util';

import { CurrentUserDecorator } from '../auth/current-user.decorator';

import { CurrentUser } from '../auth/auth.types';

import { SupabaseService } from '../supabase/supabase.service';

import { AuditService } from '../audit/audit.service';
import { CreditsService } from '../billing/credits.service';
import { SubscriptionLimitsService } from '../billing/subscription-limits.service';
import { ListingTopPromotionService } from '../billing/listing-top-promotion.service';
import { isCompanyAdLiveForTop } from '../billing/listing-live.util';
import { attachShowTopBadgeToAds } from '../billing/listing-badge-enrichment.util';

import {

  CreateCompanyAdDto,

  UpdateCompanyAdDto,

  CompanyAdResponseDto,

  CompanyAdListItemDto,

} from './company-ads.dto';

import { CREDITS_PER_AD_MONTH } from './company-ads.constants';

import {

  publishCostCredits,

  resolvePublishMonths,

  validateCompanyAdForPublish,

} from './company-ads-publish.validation';

import {

  type AdRow,

  type OwnerListRow,

  fieldsFromDto,

  rowToPublishShape,

  toListItemDto,

  toResponse,

  mapAdForViewer,
  mapAdForViewerWithOwner,

} from './company-ads.mapper';

import { companyAdViewerFromUser } from './public-response.mapper';
import { CompanyAdsListService } from './company-ads-list.service';
import { CompanyAdOpenChatService } from './company-ad-open-chat.service';
import { PromoCampaignService } from '../promotions/promo-campaign.service';
import type { CompanyAdOpenChatResponseDto } from './company-ad-open-chat.service';
import { IndexNowService } from '../seo/indexnow.service';



function wantsTopListing(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function addOneCalendarMonth(from: Date): Date {

  const d = new Date(from.getTime());

  d.setMonth(d.getMonth() + 1);

  return d;

}



function addCalendarMonths(from: Date, monthCount: number): Date {

  const d = new Date(from.getTime());

  d.setMonth(d.getMonth() + monthCount);

  return d;

}



function skMonthsPhrase(monthCount: number): string {

  if (monthCount === 1) {

    return '1 mesiac';

  }

  if (monthCount >= 2 && monthCount <= 4) {

    return `${monthCount} mesiace`;

  }

  return `${monthCount} mesiacov`;

}



@Controller('company-ads')

export class CompanyAdsController {

  constructor(
    private supabase: SupabaseService,
    private audit: AuditService,
    private credits: CreditsService,
    private limits: SubscriptionLimitsService,
    private companyAdsList: CompanyAdsListService,
    private topPromotion: ListingTopPromotionService,
    private indexNow: IndexNowService,
    private companyAdOpenChat: CompanyAdOpenChatService,
    private promoCampaigns: PromoCampaignService,
  ) {}

  private triggerFirstPublishPromo(userId: string): void {
    void this.promoCampaigns.tryAutoGrantOnFirstPublish(userId);
  }

  private notifyAdPublishedIfActive(ad: { id: string; status?: string | null }): void {
    if (ad.status === 'active') {
      this.indexNow.notifyAdPublished(String(ad.id));
    }
  }

  private async applyTopListingOnCompanyAdPublish(
    userId: string,
    adId: string,
    wantTop: boolean | undefined,
  ): Promise<void> {
    if (!wantsTopListing(wantTop)) {
      return;
    }
    await this.topPromotion.applyCompanyAdTopCategoryIfRequested(
      userId,
      adId,
      true,
      'company_ad_publish_top',
    );
  }



  @Get()

  @OptionalAuth()

  @UseInterceptors(AnonymousCatalogCacheInterceptor)

  async list(

    @Req() req: Request & { user: CurrentUser | null },

    @Query('category') category?: string,

    @Query('q') q?: string,

    @Query('location') location?: string,

    @Query('region') region?: string,

    @Query('city') city?: string,

    @Query('services') services?: string,

    @Query('availability') availability?: string,

    @Query('price_type') priceType?: string,

    @Query('price_min') priceMin?: string,

    @Query('profile_type') profileType?: string,

    @Query('weekend') weekend?: string,

    @Query('emergency') emergency?: string,

    @Query('online') online?: string,

    @Query('my') my?: string,

    @Query('limit') limit = 50,

    @Query('offset') offset = 0,

  ): Promise<CompanyAdListItemDto[]> {
    const limitNum = Math.min(Number(limit) || 50, 100);
    const offsetNum = Math.max(Number(offset) || 0, 0);
    if (my === 'true') {
      const user = req.user;
      if (!user) {
        throw new UnauthorizedException();
      }
      return this.companyAdsList.listMine(user.id, limitNum, offsetNum);
    }
    const viewer = companyAdViewerFromUser(req.user ?? null);
    return this.companyAdsList.list(
      {
        category,
        q,
        location,
        region,
        city,
        services,
        availability,
        priceType,
        priceMin,
        profileType,
        weekend,
        emergency,
        online,
        limit: limitNum,
        offset: offsetNum,
      },
      viewer,
    );
  }



  @Post(':id/top-listing')
  @HttpCode(HttpStatus.OK)
  async applyTopListing(
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<CompanyAdResponseDto> {
    const { data: row, error } = await this.supabase
      .getClient()
      .from('company_ads')
      .select('id, owner_id, status')
      .eq('id', id)
      .maybeSingle();
    if (error || !row) {
      throw new NotFoundException('Reklama nebola nájdená.');
    }
    const ad = row as AdRow;
    if (ad.owner_id !== user.id) {
      throw new ForbiddenException('Nemáte oprávnenie upravovať túto reklamu.');
    }
    if (!isCompanyAdLiveForTop(ad.status)) {
      throw new ForbiddenException('Najprv zverejnite reklamu.');
    }
    const topCost = await this.topPromotion.resolveTopListingCreditCost(user.id);
    const profile = await this.requireProviderProfile(user.id);
    if ((profile.credits ?? 0) < topCost) {
      throw new ForbiddenException(
        `Na topovanie potrebujete aspoň ${topCost} kreditov. Kúpte kredity v sekcii Plány / kredity.`,
      );
    }
    const result = await this.topPromotion.applyCompanyAdTopCategoryIfRequested(
      user.id,
      id,
      true,
      'company_ad_top_listing',
    );
    if (!result.applied) {
      const active = await this.topPromotion.getActiveTopCompanyAdIds([id]);
      if (!active.has(id)) {
        throw new ForbiddenException('Topovanie sa nepodarilo aktivovať.');
      }
    }
    const { data: updated, error: loadErr } = await this.supabase
      .getClient()
      .from('company_ads')
      .select('*')
      .eq('id', id)
      .single();
    if (loadErr || !updated) {
      throw new ForbiddenException('Topovanie sa nepodarilo aktivovať.');
    }
    return this.enrichAdTopBadge(mapAdForViewer(updated as AdRow, user));
  }

  @Get(':id/for-edit')
  async getForEdit(
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<CompanyAdResponseDto> {
    const { data: row, error } = await this.supabase
      .getClient()
      .from('company_ads')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !row) {
      throw new NotFoundException('Reklama nebola nájdená.');
    }

    const ad = row as AdRow;
    if (ad.owner_id !== user.id) {
      throw new ForbiddenException('Nemáte oprávnenie upravovať túto reklamu.');
    }

    return mapAdForViewer(ad, user);
  }

  @Get(':id')

  @OptionalAuth()

  async getOne(

    @Param('id') id: string,

    @Req() req: Request & { user: CurrentUser | null },

  ): Promise<CompanyAdResponseDto> {

    const { data: row, error } = await this.supabase

      .getClient()

      .from('company_ads')

      .select('*')

      .eq('id', id)

      .maybeSingle();

    if (error || !row) {

      throw new NotFoundException('Reklama nebola nájdená.');

    }

    const ad = row as AdRow;

    const user = req.user ?? null;

    const isOwner = user && ad.owner_id === user.id;

    const now = Date.now();

    const ends = ad.ends_at ? new Date(ad.ends_at as string).getTime() : 0;

    const visible =

      ad.status === 'active' && ends > now;

    if (!isOwner && !visible) {

      throw new NotFoundException('Reklama nebola nájdená.');

    }

    const { data: ownerProfile } = await this.supabase

      .getClient()

      .from('profiles')

      .select('is_deleted')

      .eq('id', ad.owner_id)

      .maybeSingle();

    if (!isOwner && (ownerProfile as { is_deleted?: boolean } | null)?.is_deleted) {

      throw new NotFoundException('Reklama nebola nájdená.');

    }

    const ownersMap = await this.companyAdsList.loadOwnersMap([
      String(ad.owner_id),
    ]);
    const dto = mapAdForViewerWithOwner(
      ad,
      user,
      ownersMap.get(String(ad.owner_id)),
    );
    const topAdIds = await this.topPromotion.getActiveTopCompanyAdIds([dto.id]);
    const [enriched] = attachShowTopBadgeToAds([dto], topAdIds);
    return enriched ?? dto;

  }

  @Post(':id/open-chat')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(JwksAuthGuard)
  async openChat(
    @Param('id', ParseUUIDPipe) companyAdId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<CompanyAdOpenChatResponseDto> {
    return this.companyAdOpenChat.openChat(user.id, companyAdId);
  }



  @Post()

  @HttpCode(HttpStatus.OK)

  async create(

    @CurrentUserDecorator() user: CurrentUser,

    @Body() body: CreateCompanyAdDto,

  ): Promise<CompanyAdResponseDto> {

    const profile = await this.requireProviderProfile(user.id);

    const isDraft = body.is_draft !== false;

    const publishMonths = resolvePublishMonths(body.duration_months);

    const publishCost = publishCostCredits(body.duration_months);



    const fieldPatch = fieldsFromDto(body);

    if (!isDraft) {
      validateCompanyAdForPublish(
        {
          title: body.title,
          body: sanitizeRichTextHtml(body.body),
          category: body.category,
          profile_type: body.profile_type ?? 'company',
          services: body.services ?? [],
          region: body.region ?? null,
          city: body.city ?? null,
          service_areas: body.service_areas ?? [],
          price_type: body.price_type ?? 'negotiable',
          price_min: body.price_min ?? null,
          price_max: body.price_max ?? null,
          price_negotiable: body.price_negotiable ?? false,
          preferred_contact_method: body.preferred_contact_method ?? 'platform',
          contact_email: body.contact_email ?? null,
          contact_phone: body.contact_phone ?? null,
          website: body.website ?? null,
          founded_year: body.founded_year ?? null,
          ico: body.ico ?? null,
        },
        {},
      );

      const topCost = wantsTopListing(body.want_top_listing)
        ? await this.topPromotion.resolveTopListingCreditCost(user.id)
        : 0;
      const totalCost = publishCost + topCost;
      if ((profile.credits ?? 0) < totalCost) {

        throw new ForbiddenException(

          `Na zverejnenie reklamy na ${skMonthsPhrase(

            publishMonths,

          )} potrebujete aspoň ${totalCost} kreditov. Kúpte kredity v sekcii Plány / kredity.`,

        );

      }

    }



    const now = new Date();

    const startsAt = isDraft ? null : now.toISOString();

    const endsAt = isDraft

      ? null

      : addCalendarMonths(now, publishMonths).toISOString();

    const insertRow = {

      owner_id: user.id,

      title: body.title,

      body: sanitizeRichTextHtml(body.body),

      category: body.category,

      thumbnail_url: body.thumbnail_url ?? null,

      status: 'draft',

      starts_at: null,

      ends_at: null,

      duration_months: null,

      profile_type: body.profile_type ?? 'company',

      preferred_contact_method: body.preferred_contact_method ?? 'platform',

      ...fieldPatch,

    };

    const { data, error } = await this.supabase

      .getClient()

      .from('company_ads')

      .insert(insertRow)

      .select()

      .single();

    if (error || !data) {

      const message =

        [error?.message, error?.details, error?.code]

          .filter(Boolean)

          .join(' ') || 'Nepodarilo sa vytvoriť reklamu.';

      throw new ForbiddenException(message);

    }

    let adRow = data as AdRow;
    // NOTE: assertCanPublish → spend_credits (company_ad ref) → activate; reverseSpendByRef on failure.
    if (!isDraft) {
      await this.limits.assertCanPublish(user.id);
      const adId = String(adRow.id);
      await this.credits.spendAmount(user.id, publishCost, {
        reason: 'publish_service_profile',
        refType: 'company_ad',
        refId: adId,
        subjectType: 'company_ad',
      });
      try {
        const { data: published, error: pubErr } = await this.supabase
          .getClient()
          .from('company_ads')
          .update({
            status: 'active',
            starts_at: startsAt,
            ends_at: endsAt,
            duration_months: publishMonths,
          })
          .eq('id', adId)
          .eq('owner_id', user.id)
          .select()
          .single();
        if (pubErr || !published) {
          throw new ForbiddenException(
            'Nepodarilo sa zverejniť reklamu po úhrade kreditov.',
          );
        }
        adRow = published as AdRow;
        this.triggerFirstPublishPromo(user.id);
      } catch (e) {
        await this.credits.reverseSpendByRef(
          user.id,
          'company_ad',
          adId,
          'company_ad_publish_rollback',
        );
        throw e;
      }
      try {
        await this.applyTopListingOnCompanyAdPublish(
          user.id,
          adId,
          body.want_top_listing,
        );
      } catch {
        /* Ad stays active; client may retry POST .../top-listing. */
      }
    }

    void this.audit.recordAuditEvent({

      actorUserId: user.id,

      actorIp: null,

      actorUserAgent: null,

      sessionId: null,

      deviceId: null,

      eventType: 'company_ad.created',

      subjectType: 'company_ad',

      subjectId: adRow.id,

      payload: {

        status: adRow.status,

        is_draft: isDraft,

        duration_months: isDraft ? null : publishMonths,

        credits_charged: isDraft ? 0 : publishCost,

      },

    });

    const created = mapAdForViewer(adRow, user);
    if (!isDraft) {
      this.notifyAdPublishedIfActive(adRow);
    }
    return created;

  }



  @Patch(':id')

  @HttpCode(HttpStatus.OK)

  async update(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('id') id: string,

    @Body() body: UpdateCompanyAdDto,

  ): Promise<CompanyAdResponseDto> {

    const { data: existing, error: fetchErr } = await this.supabase

      .getClient()

      .from('company_ads')

      .select('*')

      .eq('id', id)

      .maybeSingle();

    if (fetchErr || !existing) {

      throw new NotFoundException('Reklama nebola nájdená.');

    }

    const ad = existing as AdRow;

    if (ad.owner_id !== user.id) {

      throw new ForbiddenException('Nemáte oprávnenie upravovať túto reklamu.');

    }

    const profile = await this.requireProviderProfile(user.id);

    let credits = profile.credits ?? 0;



    if (body.status !== undefined && body.status !== ad.status) {

      return this.patchStatus(user, ad, body.status, credits);

    }



    if (body.publish === true && ad.status === 'draft') {

      const publishMonths = resolvePublishMonths(body.duration_months);

      const publishCost = publishCostCredits(body.duration_months);

      const fieldPatch = fieldsFromDto(body);

      validateCompanyAdForPublish(
        rowToPublishShape(ad),
        fieldPatch as Record<string, unknown>,
      );

      const topCost = wantsTopListing(body.want_top_listing)
        ? await this.topPromotion.resolveTopListingCreditCost(user.id)
        : 0;
      const totalCost = publishCost + topCost;
      if (credits < totalCost) {

        throw new ForbiddenException(

          `Na zverejnenie reklamy na ${skMonthsPhrase(

            publishMonths,

          )} potrebujete aspoň ${totalCost} kreditov. Kúpte kredity v sekcii Plány / kredity.`,

        );

      }

      const now = new Date();

      const startsAt = now.toISOString();

      const endsAt = addCalendarMonths(now, publishMonths).toISOString();

      await this.limits.assertCanPublish(user.id, { excludeAdId: id });
      await this.credits.spendAmount(user.id, publishCost, {
        reason: 'publish_service_profile',
        refType: 'company_ad',
        refId: id,
        subjectType: 'company_ad',
      });

      try {
        const { data: updated, error } = await this.supabase

          .getClient()

          .from('company_ads')

          .update({

            ...fieldPatch,

            title: body.title ?? ad.title,

            body:
              body.body !== undefined
                ? sanitizeRichTextHtml(body.body)
                : ad.body,

            category: body.category ?? ad.category,

            thumbnail_url:

              body.thumbnail_url !== undefined

                ? body.thumbnail_url

                : ad.thumbnail_url,

            status: 'active',

            starts_at: startsAt,

            ends_at: endsAt,

            duration_months: publishMonths,

          })

          .eq('id', id)

          .select()

          .single();

        if (error || !updated) {
          throw new ForbiddenException('Nepodarilo sa zverejniť reklamu.');
        }

        let publishedDto = mapAdForViewer(updated as AdRow, user);
        try {
          await this.applyTopListingOnCompanyAdPublish(
            user.id,
            id,
            body.want_top_listing,
          );
          publishedDto = await this.enrichAdTopBadge(publishedDto);
        } catch {
          /* Client may retry POST .../top-listing. */
        }
        this.notifyAdPublishedIfActive(updated as AdRow);
        return publishedDto;
      } catch (e) {
        await this.credits.reverseSpendByRef(
          user.id,
          'company_ad',
          id,
          'company_ad_publish_rollback',
        );
        throw e;
      }

    }



    if (body.renew === true) {

      if (ad.status === 'draft') {

        throw new ForbiddenException('Najprv zverejnite reklamu.');

      }

      if (credits < CREDITS_PER_AD_MONTH) {

        throw new ForbiddenException(

          'Na obnovenie reklamy potrebujete aspoň 3 kredity. Kúpte kredity v sekcii Plány / kredity.',

        );

      }

      const now = new Date();

      const currentEnd = ad.ends_at ? new Date(ad.ends_at as string) : now;

      const base =

        currentEnd.getTime() > now.getTime() ? currentEnd : now;

      const newEnd = addOneCalendarMonth(base);

      const renewRefId = `${id}:renew:${now.toISOString().slice(0, 16)}`;
      await this.credits.spendByKey(user.id, 'renewServiceProfile30Days', {
        reason: 'renew_service_profile',
        refType: 'company_ad',
        refId: renewRefId,
        subjectType: 'company_ad',
      });

      try {
        const { data: updated, error } = await this.supabase

          .getClient()

          .from('company_ads')

          .update({

            status: 'active',

            ends_at: newEnd.toISOString(),

            ...(ad.starts_at ? {} : { starts_at: now.toISOString() }),

          })

          .eq('id', id)

          .select()

          .single();

        if (error || !updated) {
          throw new ForbiddenException('Nepodarilo sa obnoviť reklamu.');
        }

        await this.topPromotion.applyCompanyAdTopCategoryIfRequested(
          user.id,
          id,
          body.want_top_listing,
          'company_ad_renew_top',
        );

        const renewed = mapAdForViewer(updated as AdRow, user);
        this.notifyAdPublishedIfActive(updated as AdRow);
        return this.enrichAdTopBadge(renewed);
      } catch (e) {
        await this.credits.reverseSpendByRef(
          user.id,
          'company_ad',
          renewRefId,
          'company_ad_renew_rollback',
        );
        throw e;
      }

    }

    const patch = fieldsFromDto(body);

    if (Object.keys(patch).length === 0) {

      if (
        wantsTopListing(body.want_top_listing) &&
        isCompanyAdLiveForTop(ad.status)
      ) {
        try {
          await this.topPromotion.applyCompanyAdTopCategoryIfRequested(
            user.id,
            id,
            true,
            'company_ad_update_top',
          );
        } catch {
          /* Save succeeds; client may retry save with top flag. */
        }
      }

      return this.enrichAdTopBadge(mapAdForViewer(ad, user));

    }

    const { data: updated, error } = await this.supabase

      .getClient()

      .from('company_ads')

      .update(patch)

      .eq('id', id)

      .select()

      .single();

    if (error || !updated) {

      throw new ForbiddenException('Nepodarilo sa uložiť zmeny.');

    }

    const savedRow = updated as AdRow;
    if (
      wantsTopListing(body.want_top_listing) &&
      isCompanyAdLiveForTop(savedRow.status)
    ) {
      try {
        await this.topPromotion.applyCompanyAdTopCategoryIfRequested(
          user.id,
          id,
          true,
          'company_ad_update_top',
        );
      } catch {
        /* Save succeeds; client may retry save with top flag. */
      }
    }

    return this.enrichAdTopBadge(mapAdForViewer(savedRow, user));

  }

  private async enrichAdTopBadge(
    dto: CompanyAdResponseDto,
  ): Promise<CompanyAdResponseDto> {
    const topAdIds = await this.topPromotion.getActiveTopCompanyAdIds([dto.id]);
    const [enriched] = attachShowTopBadgeToAds([dto], topAdIds);
    return enriched ?? dto;
  }

  private async patchStatus(

    user: CurrentUser,

    ad: AdRow,

    newStatus: string,

    _credits: number,

  ): Promise<CompanyAdResponseDto> {
    const userId = user.id;

    const allowed = ['draft', 'active', 'paused', 'archived'];

    if (!allowed.includes(newStatus)) {

      throw new ForbiddenException('Neplatný stav reklamy.');

    }

    if (newStatus === 'active' && ad.status !== 'draft') {

      const ends = ad.ends_at ? new Date(ad.ends_at as string).getTime() : 0;

      if (ends <= Date.now() && ad.status !== 'paused') {

        throw new ForbiddenException(

          'Expirovanú reklamu obnovte cez obnovenie (renew).',

        );

      }

    }

    const { data: updated, error } = await this.supabase

      .getClient()

      .from('company_ads')

      .update({ status: newStatus })

      .eq('id', ad.id)

      .select()

      .single();

    if (error || !updated) {

      throw new ForbiddenException('Nepodarilo sa zmeniť stav reklamy.');

    }

    void this.audit.recordAuditEvent({

      actorUserId: userId,

      actorIp: null,

      actorUserAgent: null,

      sessionId: null,

      deviceId: null,

      eventType: 'company_ad.status_changed',

      subjectType: 'company_ad',

      subjectId: ad.id,

      payload: { from: ad.status, to: newStatus },

    });

    return mapAdForViewer(updated as AdRow, user);

  }



  @Delete(':id')

  @HttpCode(HttpStatus.OK)

  async remove(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('id') id: string,

  ): Promise<{ ok: boolean }> {

    const { data: existing } = await this.supabase

      .getClient()

      .from('company_ads')

      .select('owner_id')

      .eq('id', id)

      .maybeSingle();

    if (!existing) {

      throw new NotFoundException('Reklama nebola nájdená.');

    }

    if ((existing as { owner_id: string }).owner_id !== user.id) {

      throw new ForbiddenException('Nemáte oprávnenie zmazať túto reklamu.');

    }

    const { error } = await this.supabase

      .getClient()

      .from('company_ads')

      .delete()

      .eq('id', id);

    if (error) {

      throw new ForbiddenException('Nepodarilo sa zmazať reklamu.');

    }

    void this.audit.recordAuditEvent({

      actorUserId: user.id,

      actorIp: null,

      actorUserAgent: null,

      sessionId: null,

      deviceId: null,

      eventType: 'company_ad.deleted',

      subjectType: 'company_ad',

      subjectId: id,

      payload: {},

    });

    return { ok: true };

  }



  private async requireProviderProfile(userId: string): Promise<{

    credits: number;

    provider_role: boolean;

  }> {

    const { data, error } = await this.supabase

      .getClient()

      .from('profiles')

      .select('credits, provider_role')

      .eq('id', userId)

      .single();

    if (error || !data) {

      throw new ForbiddenException('Profil nebol nájdený.');

    }

    const p = data as { credits?: number; provider_role?: boolean };

    if (!p.provider_role) {

      throw new ForbiddenException(

        'Na vytvorenie reklamy musíte mať zapnuté „Chcem aby ma klienti našli“ v profile.',

      );

    }

    return { credits: p.credits ?? 0, provider_role: true };

  }



}


