import {
  Controller,
  Get,
  Query,
  Headers,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OptionalAuth } from '../auth/optional-auth.decorator';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import {
  SearchQueryDto,
  SearchResponseDto,
  SearchSuggestQueryDto,
  SearchAnalyticsSummaryDto,
} from './search.dto';
import { SearchService } from './search.service';
import { Public } from '../auth/public.decorator';

@Controller('search')
@Throttle({ default: { limit: 120, ttl: 60000 } })
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @OptionalAuth()
  async search(
    @Query() query: SearchQueryDto,
    @CurrentUserDecorator() user: CurrentUser | null,
  ): Promise<SearchResponseDto> {
    return this.searchService.search(query, { userId: user?.id ?? null });
  }

  @Get('suggest')
  @Public()
  async suggest(
    @Query() query: SearchSuggestQueryDto,
  ): Promise<{ suggestions: string[] }> {
    return this.searchService.suggestJobs(query);
  }

  /**
   * Pass header `X-Search-Analytics-Secret` matching `SEARCH_ANALYTICS_SECRET`.
   */
  @Get('analytics/summary')
  async analyticsSummary(
    @Query('days') daysRaw?: string,
    @Headers('x-search-analytics-secret') secret?: string,
  ): Promise<SearchAnalyticsSummaryDto> {
    const days = Math.min(Math.max(Number(daysRaw) || 7, 1), 90);
    const result = await this.searchService.searchAnalyticsSummary(days, secret);
    if (!result) {
      throw new UnauthorizedException('Invalid or missing analytics secret');
    }
    return result;
  }
}
