/**
 * Rule-based feed scoring (no vectors, no embeddings).
 *
 * Weights (positive = boost, negative = demote):
 * - Applied: +100 (strongest)
 * - Saved: +50
 * - Chatted: +40
 * - Viewed: +30 with recency decay (30 * 0.95^days_ago)
 * - Same category as viewed/applied/saved: +25
 * - Same job_type as viewed/applied/saved: +15
 * - Profile job_interests matches job category: +25
 * - Profile location matches job location/address: +15
 * - Profile skill in title/description/requirements: +5 per skill
 *
 * Skipped preferences: when user skipped the preferences step (null
 * job_interests/location), profile-based ranking for category/location is
 * omitted; feed still returns all results with default/newest-first ordering
 * and engagement-based boosts only.
 * - Scrolled past (impression, no view): -5
 *
 * "Scrolled past" = job has at least one row in job_impressions for this user
 * and no row in job_views for this user (or never opened after being shown).
 * We apply a small penalty so such jobs rank lower.
 *
 * Engagement data is cached in-memory per user (TTL 5 min) to reduce DB load.
 * Cache is invalidated when user records view, impressions, save, or apply.
 */

import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/** TTL for engagement cache: 5 minutes. */
const ENGAGEMENT_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedEngagement {
  profile: FeedProfile | null;
  engagement: FeedEngagement;
  expiresAt: number;
}

/** Weights for scoring (documented in module comment above). */
export const FEED_WEIGHTS = {
  applied: 100,
  saved: 50,
  chatted: 40,
  viewedBase: 30,
  viewedDecay: 0.95,
  sameCategory: 25,
  sameJobType: 15,
  profileCategoryMatch: 25,
  profileLocationMatch: 15,
  profileSkillMatch: 5,
  scrolledPast: -5,
} as const;

export interface FeedProfile {
  jobInterests: string[];
  skills: string[];
  location: string | null;
}

export interface FeedEngagement {
  appliedJobIds: Set<string>;
  savedJobIds: Set<string>;
  viewed: Array<{ jobId: string; viewedAt: string }>;
  chattedJobIds: Set<string>;
  impressedJobIds: Set<string>;
  categoriesFromEngagement: Set<string>;
  jobTypesFromEngagement: Set<string>;
}

/** Job-like row with fields needed for scoring. */
export interface JobForScore {
  id: string;
  category: string | null;
  job_type: string | null;
  location: string | null;
  location_address: string | null;
  title?: string | null;
  description?: string | null;
  requirements?: string | null;
}

@Injectable()
export class FeedScoringService {
  private readonly engagementCache = new Map<
    string,
    CachedEngagement
  >();

  constructor(private supabase: SupabaseService) {}

  /** Invalidate cached engagement for a user (call after view/impressions/save/apply). */
  invalidateEngagement(userId: string): void {
    this.engagementCache.delete(userId);
  }

  async loadProfile(userId: string): Promise<FeedProfile | null> {
    const { data } = await this.supabase
      .getClient()
      .from('profiles')
      .select('job_interests, skills, location')
      .eq('id', userId)
      .single();
    if (!data) return null;
    const raw = data as {
      job_interests?: string | null;
      skills?: string | null;
      location?: string | null;
    };
    const split = (s: string | null | undefined): string[] =>
      !s || typeof s !== 'string'
        ? []
        : s
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean);
    return {
      jobInterests: split(raw.job_interests),
      skills: split(raw.skills),
      location:
        raw.location != null && typeof raw.location === 'string'
          ? raw.location.trim()
          : null,
    };
  }

  async loadEngagement(userId: string): Promise<{
    profile: FeedProfile | null;
    engagement: FeedEngagement;
  }> {
    const now = Date.now();
    const cached = this.engagementCache.get(userId);
    if (cached && cached.expiresAt > now) {
      return { profile: cached.profile, engagement: cached.engagement };
    }

    const profile = await this.loadProfile(userId);
    const [applied, saved, views, chatted, impressions] = await Promise.all([
      this.loadAppliedJobIds(userId),
      this.loadSavedJobIds(userId),
      this.loadViews(userId),
      this.loadChattedJobIds(userId),
      this.loadImpressions(userId),
    ]);

    const allEngagementJobIds = [
      ...applied,
      ...saved,
      ...views.map((v) => v.jobId),
    ];
    const uniqueJobIds = [...new Set(allEngagementJobIds)];
    let categoriesFromEngagement = new Set<string>();
    let jobTypesFromEngagement = new Set<string>();
    if (uniqueJobIds.length > 0) {
      const { data: jobs } = await this.supabase
        .getClient()
        .from('job_offers')
        .select('id, category, job_type')
        .in('id', uniqueJobIds);
      for (const j of jobs ?? []) {
        const row = j as { id: string; category?: string | null; job_type?: string | null };
        if (row.category) categoriesFromEngagement.add(row.category);
        if (row.job_type) jobTypesFromEngagement.add(row.job_type);
      }
    }

    const engagement: FeedEngagement = {
      appliedJobIds: new Set(applied),
      savedJobIds: new Set(saved),
      viewed: views,
      chattedJobIds: new Set(chatted),
      impressedJobIds: new Set(impressions),
      categoriesFromEngagement,
      jobTypesFromEngagement,
    };

    this.engagementCache.set(userId, {
      profile,
      engagement,
      expiresAt: now + ENGAGEMENT_CACHE_TTL_MS,
    });
    return { profile, engagement };
  }

  private async loadAppliedJobIds(userId: string): Promise<string[]> {
    const { data } = await this.supabase
      .getClient()
      .from('applications')
      .select('job_id')
      .eq('individual_id', userId);
    return (data ?? []).map((r: { job_id: string }) => r.job_id);
  }

  private async loadSavedJobIds(userId: string): Promise<string[]> {
    const { data } = await this.supabase
      .getClient()
      .from('saved_jobs')
      .select('job_id')
      .eq('user_id', userId);
    return (data ?? []).map((r: { job_id: string }) => r.job_id);
  }

  private async loadViews(
    userId: string,
  ): Promise<Array<{ jobId: string; viewedAt: string }>> {
    const { data } = await this.supabase
      .getClient()
      .from('job_views')
      .select('job_id, viewed_at')
      .eq('user_id', userId);
    return (data ?? []).map((r: { job_id: string; viewed_at: string }) => ({
      jobId: r.job_id,
      viewedAt: r.viewed_at,
    }));
  }

  private async loadChattedJobIds(userId: string): Promise<string[]> {
    const { data } = await this.supabase
      .getClient()
      .from('chat_rooms')
      .select('job_id')
      .eq('individual_id', userId);
    return (data ?? []).map((r: { job_id: string }) => r.job_id);
  }

  private async loadImpressions(userId: string): Promise<string[]> {
    const { data } = await this.supabase
      .getClient()
      .from('job_impressions')
      .select('job_id')
      .eq('user_id', userId);
    return [...new Set((data ?? []).map((r: { job_id: string }) => r.job_id))];
  }

  computeScore(
    job: JobForScore,
    profile: FeedProfile | null,
    engagement: FeedEngagement,
  ): number {
    let score = 0;
    const jobId = job.id;

    if (engagement.appliedJobIds.has(jobId)) {
      score += FEED_WEIGHTS.applied;
    }
    if (engagement.savedJobIds.has(jobId)) {
      score += FEED_WEIGHTS.saved;
    }
    if (engagement.chattedJobIds.has(jobId)) {
      score += FEED_WEIGHTS.chatted;
    }

    const viewEntry = engagement.viewed.find((v) => v.jobId === jobId);
    if (viewEntry) {
      const daysAgo =
        (Date.now() - new Date(viewEntry.viewedAt).getTime()) /
        (24 * 60 * 60 * 1000);
      score +=
        FEED_WEIGHTS.viewedBase *
        Math.pow(FEED_WEIGHTS.viewedDecay, Math.max(0, daysAgo));
    }

    if (job.category && engagement.categoriesFromEngagement.has(job.category)) {
      score += FEED_WEIGHTS.sameCategory;
    }
    if (job.job_type && engagement.jobTypesFromEngagement.has(job.job_type)) {
      score += FEED_WEIGHTS.sameJobType;
    }

    if (profile) {
      const categoryMatch =
        job.category &&
        profile.jobInterests.some(
          (i) =>
            i &&
            job.category &&
            (job.category.toLowerCase() === i.toLowerCase() ||
              job.category.toLowerCase().includes(i.toLowerCase())),
        );
      if (categoryMatch) {
        score += FEED_WEIGHTS.profileCategoryMatch;
      }
      const loc =
        (job.location ?? '') + ' ' + (job.location_address ?? '');
      if (
        profile.location &&
        loc.toLowerCase().includes(profile.location.toLowerCase())
      ) {
        score += FEED_WEIGHTS.profileLocationMatch;
      }
      const text = [
        job.title,
        job.description,
        job.requirements,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      for (const skill of profile.skills) {
        if (skill && text.includes(skill.toLowerCase())) {
          score += FEED_WEIGHTS.profileSkillMatch;
        }
      }
    }

    if (
      engagement.impressedJobIds.has(jobId) &&
      !engagement.appliedJobIds.has(jobId) &&
      !engagement.savedJobIds.has(jobId) &&
      !engagement.chattedJobIds.has(jobId) &&
      !engagement.viewed.some((v) => v.jobId === jobId)
    ) {
      score += FEED_WEIGHTS.scrolledPast;
    }

    return score;
  }

  scoreAndSort<T extends JobForScore>(
    jobs: T[],
    profile: FeedProfile | null,
    engagement: FeedEngagement,
  ): T[] {
    return [...jobs].sort((a, b) => {
      const sa = this.computeScore(a, profile, engagement);
      const sb = this.computeScore(b, profile, engagement);
      return sb - sa;
    });
  }
}
