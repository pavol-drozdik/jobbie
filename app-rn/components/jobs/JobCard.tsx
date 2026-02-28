import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Badge } from '../ui';
import { CategoryBadge } from '../ui/CategoryBadge';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { timeAgo, getJobTypeLabel } from '../../lib/timeAgo';
import { getCompensationLabel } from '../../types/job';

export type JobCardJob = {
  id: string;
  title: string;
  description?: string | null;
  salary?: string | null;
  location?: string | null;
  location_address?: string | null;
  job_type?: string | null;
  category?: string | null;
  is_draft?: boolean;
  is_active?: boolean;
  is_urgent?: boolean;
  is_featured?: boolean;
  compensation_type?: string | null;
  compensation_amount?: number | null;
  employer_name?: string | null;
  created_at?: string | null;
};

type JobCardProps = {
  job: JobCardJob;
  onPress: () => void;
};

export function JobCard({ job, onPress }: JobCardProps) {
  const compensation = getCompensationLabel(
    job.compensation_type,
    job.compensation_amount
  );
  const location = job.location_address ?? job.location;
  const category = job.category ?? (job.job_type || 'other');
  const showCategory =
    category &&
    category !== 'full_time' &&
    category !== 'part_time' &&
    category !== 'brigada';
  const jobTypeLabel = getJobTypeLabel(job.job_type);
  const timeAgoStr = job.created_at ? timeAgo(job.created_at) : '';
  const employerName = job.employer_name?.trim() || 'Zamestnávateľ';
  const deadlineStr =
    job.application_deadline &&
    new Date(job.application_deadline).toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'short',
    });
  const workers =
    job.workers_needed != null && job.workers_needed > 0
      ? job.workers_needed === 1
        ? '1 osoba'
        : `${job.workers_needed} osoby`
      : null;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.titleBlock}>
            <View style={styles.badges}>
              {job.is_urgent && (
                <Badge
                  style={styles.urgentBadge}
                  textStyle={styles.urgentBadgeText}
                >
                  URGENT
                </Badge>
              )}
              {job.is_featured && (
                <Badge
                  style={styles.featuredBadge}
                  textStyle={styles.badgeText}
                >
                  TOP
                </Badge>
              )}
              {job.is_draft && (
                <Badge variant="outline" textStyle={styles.badgeText}>
                  Koncept
                </Badge>
              )}
              {job.is_active && !job.is_draft && (
                <Badge variant="default" textStyle={styles.badgeText}>
                  Aktívna
                </Badge>
              )}
              {!job.is_active && !job.is_draft && (
                <Badge variant="secondary" textStyle={styles.badgeText}>
                  Neaktívna
                </Badge>
              )}
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {job.title}
            </Text>
            <Text style={styles.employer}>{employerName}</Text>
          </View>
          <View style={styles.salaryBlock}>
            <Text style={styles.salary}>{compensation}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          {location ? (
            <View style={styles.metaItem}>
              <Ionicons
                name="location-outline"
                size={12}
                color={colors.gray500}
              />
              <Text style={styles.metaText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          ) : null}
          {deadlineStr ? (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={colors.gray500} />
              <Text style={styles.metaText}>{deadlineStr}</Text>
            </View>
          ) : null}
          {workers ? (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={12} color={colors.gray500} />
              <Text style={styles.metaText}>{workers}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomRow}>
          {showCategory ? (
            <CategoryBadge category={category} size="sm" />
          ) : jobTypeLabel ? (
            <Text style={styles.jobTypeLabel}>{jobTypeLabel}</Text>
          ) : null}
          {timeAgoStr ? (
            <Text style={styles.timeAgo}>{timeAgoStr}</Text>
          ) : null}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray100,
    padding: 16,
    backgroundColor: colors.background,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  badgeText: { fontSize: 10 },
  urgentBadge: { backgroundColor: '#ef4444' },
  urgentBadgeText: { fontSize: 10, color: '#fff' },
  featuredBadge: {
    backgroundColor: colors.accent400,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray900,
  },
  employer: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
  },
  salaryBlock: { flexShrink: 0 },
  salary: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 140,
  },
  metaText: {
    fontSize: 12,
    color: colors.gray500,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  jobTypeLabel: {
    fontSize: 10,
    color: colors.gray500,
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 11,
    color: colors.gray400,
  },
});
