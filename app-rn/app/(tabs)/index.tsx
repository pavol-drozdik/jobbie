import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { S } from '../../constants/strings';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { JobCard } from '../../components/jobs/JobCard';
import { CategoryBadge, getCategoryLabel, getCategoryConfig } from '../../components/ui/CategoryBadge';
import { CATEGORIES } from '../../types/job';

type Job = {
  id: string;
  title: string;
  description?: string | null;
  salary?: string | null;
  location?: string | null;
  job_type?: string | null;
  is_active: boolean;
  is_draft?: boolean;
  is_urgent?: boolean;
  created_at?: string | null;
};

const HOME_SECTION_LIMIT = 5;

export default function HomeScreen() {
  const { session, user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [urgentJobs, setUrgentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
    if (!session?.access_token) return;
    const [latestRes, urgentRes] = await Promise.all([
      api<Job[]>('/api/jobs', {
        token: session.access_token,
        query: {
          limit: String(HOME_SECTION_LIMIT),
          offset: '0',
          is_active: 'true',
          sort: 'date_desc',
        },
      }),
      api<Job[]>('/api/jobs', {
        token: session.access_token,
        query: {
          limit: String(HOME_SECTION_LIMIT),
          offset: '0',
          is_active: 'true',
          urgent_only: 'true',
          sort: 'date_desc',
        },
      }),
    ]);
    if (latestRes.ok && Array.isArray(latestRes.data)) {
      setJobs(latestRes.data);
      if (latestRes.data.length > 0) {
        api('/api/jobs/impressions', {
          method: 'POST',
          token: session.access_token,
          body: { job_ids: latestRes.data.map((j) => j.id) },
        }).catch(() => {});
      }
    } else setJobs([]);
    if (urgentRes.ok && Array.isArray(urgentRes.data)) {
      setUrgentJobs(urgentRes.data);
      if (urgentRes.data.length > 0) {
        api('/api/jobs/impressions', {
          method: 'POST',
          token: session.access_token,
          body: { job_ids: urgentRes.data.map((j) => j.id) },
        }).catch(() => {});
      }
    } else setUrgentJobs([]);
  };

  useEffect(() => {
    fetchJobs().finally(() => setLoading(false));
  }, [session?.access_token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const openFindWithCategory = (category: string) => {
    router.push({ pathname: '/(tabs)/find', params: { category } });
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>{S.pleaseSignIn}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, styles.screen]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const jobCount = jobs.length;
  const stats = [
    { value: `${jobCount}+`, label: S.statsPonuky },
    { value: '100+', label: S.statsPracantov },
    { value: '4.8', label: S.statsHodnotenie },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroBlurOrbs}>
          <View style={styles.heroOrb1} />
          <View style={styles.heroOrb2} />
        </View>
        <View style={styles.heroContent}>
          <View style={styles.heroTitleRow}>
            <View style={styles.heroAmberBar} />
            <View>
              <Text style={styles.heroTitle}>Nájdi prácu.</Text>
              <Text style={styles.heroTitleAccent}>Nájdi pomoc.</Text>
            </View>
          </View>
          <Text style={styles.heroSub}>
            Prepojíme ľudí, ktorí hľadajú brigádu, s tými, ktorí potrebujú pomoc.
          </Text>

          <View style={styles.heroButtons}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/find')}
              style={styles.ctaFind}
              activeOpacity={0.9}
            >
              <Ionicons name="search" size={18} color={colors.primaryDark} />
              <Text style={styles.ctaFindText}>{S.searchWork}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/add')}
              style={styles.ctaAdd}
              activeOpacity={0.9}
            >
              <Ionicons name="add" size={18} color={colors.accentButtonText} />
              <Text style={styles.ctaAddText}>{S.navPridatPonuku}</Text>
            </TouchableOpacity>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            {stats.map((stat, i) => (
              <View key={i} style={styles.statItem}>
                <View style={styles.statIcon}>
                  <Ionicons
                    name={
                      i === 0
                        ? 'briefcase-outline'
                        : i === 1
                          ? 'people-outline'
                          : 'star-outline'
                    }
                    size={18}
                    color={colors.heroText}
                  />
                </View>
                <View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.sections}>
        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{S.categories}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
            style={styles.categoriesScrollView}
          >
            {CATEGORIES.map((cat) => {
              const config = getCategoryConfig(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => openFindWithCategory(cat)}
                  style={styles.categoryItem}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.categoryIconWrap,
                      { backgroundColor: config.bg },
                    ]}
                  >
                    <Ionicons
                      name={config.icon}
                      size={28}
                      color={config.text}
                    />
                  </View>
                  <Text style={styles.categoryLabel}>
                    {getCategoryLabel(cat)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Latest (up to 5) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons
                  name="trending-up"
                  size={18}
                  color={colors.primaryForeground}
                />
              </View>
              <Text style={styles.sectionTitle}>{S.latestOffers}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/find')}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionLink}>
                {S.all} <Ionicons name="arrow-forward" size={12} color={colors.primary} />
              </Text>
            </TouchableOpacity>
          </View>
          {jobs.length === 0 ? (
            <Text style={styles.noJobs}>{S.noJobsYet}</Text>
          ) : (
            jobs.slice(0, HOME_SECTION_LIMIT).map((item) => (
              <JobCard
                key={item.id}
                job={item}
                onPress={() => router.push(`/jobs/${item.id}`)}
              />
            ))
          )}
        </View>

        {/* Urgent (up to 5) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconWrap, styles.sectionIconWrapUrgent]}>
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color="#fff"
                />
              </View>
              <Text style={styles.sectionTitle}>{S.sectionUrgent}</Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/find',
                  params: { urgent_only: 'true' },
                })
              }
              activeOpacity={0.7}
            >
              <Text style={styles.sectionLink}>
                {S.all} <Ionicons name="arrow-forward" size={12} color={colors.primary} />
              </Text>
            </TouchableOpacity>
          </View>
          {urgentJobs.length === 0 ? (
            <Text style={styles.noJobs}>{S.noJobsYet}</Text>
          ) : (
            urgentJobs.slice(0, HOME_SECTION_LIMIT).map((item) => (
              <JobCard
                key={item.id}
                job={item}
                onPress={() => router.push(`/jobs/${item.id}`)}
              />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundGradientStart,
  },
  scrollContent: { paddingBottom: spacing.xxl },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  empty: { ...typography.body, color: colors.mutedForeground },
  noJobs: {
    ...typography.bodySmall,
    color: colors.mutedForeground,
    paddingVertical: spacing.lg,
  },

  hero: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.heroMid,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + spacing.md,
    paddingBottom: spacing.xl,
  },
  heroBlurOrbs: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
  },
  heroOrb1: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#fff',
  },
  heroOrb2: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#c4b5fd',
  },
  heroContent: { position: 'relative', zIndex: 1 },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  heroAmberBar: {
    width: 4,
    height: 40,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.heroText,
    letterSpacing: -0.5,
  },
  heroTitleAccent: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.heroTextMuted,
    letterSpacing: -0.5,
  },
  heroSub: {
    ...typography.bodySmall,
    color: colors.heroTextMuted,
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  ctaFind: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaFindText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  ctaAdd: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaAddText: { color: colors.accentButtonText, fontWeight: '700', fontSize: 14 },
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.heroText,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.heroTextMuted,
  },

  sections: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  section: { marginBottom: spacing.xxl },
  sectionTitle: {
    ...typography.title,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconWrapUrgent: {
    backgroundColor: '#dc2626',
  },
  sectionLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionLink: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  categoriesScroll: {
    paddingRight: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  categoriesScrollView: { marginHorizontal: -spacing.lg },
  categoryItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  categoryIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray700,
    textAlign: 'center',
  },
});
