import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { S } from '../../constants/strings';
import { colors, spacing, typography } from '../../constants/theme';
import {
  JobFilters,
  defaultJobFilters,
  type JobFiltersState,
} from '../../components/jobs/JobFilters';
import { JobCard } from '../../components/jobs/JobCard';
import { EmptyState } from '../../components/ui';
import type { Job } from '../../types/job';

export default function FindWorkScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const initCategory = params.category ?? 'all';

  const { session, user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<JobFiltersState>({
    ...defaultJobFilters,
    category: initCategory,
  });

  const fetchJobs = useCallback(async () => {
    if (!session?.access_token) return;
    const query: Record<string, string> = {
      limit: '100',
      offset: '0',
      is_active: 'true',
    };
    if (filters.search.trim()) query.q = filters.search.trim();
    if (filters.category !== 'all') query.category = filters.category;
    if (filters.job_type !== 'all') query.job_type = filters.job_type;
    if (filters.urgent_only) query.urgent_only = 'true';
    if (filters.sort_by) query.sort = filters.sort_by;
    if (filters.min_hourly_wage.trim())
      query.min_hourly_wage = filters.min_hourly_wage.trim();
    if (filters.sort_by === 'date_asc' || filters.sort_by === 'date_desc')
      query.sort = filters.sort_by;

    const res = await api<Job[]>('/api/jobs', {
      token: session.access_token,
      query,
    });
    if (res.ok && Array.isArray(res.data)) {
      setJobs(res.data);
      if (res.data.length > 0) {
        api('/api/jobs/impressions', {
          method: 'POST',
          token: session.access_token,
          body: { job_ids: res.data.map((j) => j.id) },
        }).catch(() => {});
      }
    } else setJobs([]);
  }, [session?.access_token, filters]);

  useEffect(() => {
    setLoading(true);
    fetchJobs().finally(() => setLoading(false));
  }, [fetchJobs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>{S.pleaseSignIn}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{S.findWork}</Text>
          <Text style={styles.count}>
            {jobs.length} {S.findWorkCount}
          </Text>
        </View>
      </View>
      <View style={styles.filtersWrap}>
        <JobFilters filters={filters} onFiltersChange={setFilters} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title={S.noOffers}
            description={S.noOffersTryFilters}
          />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onPress={() => router.push(`/jobs/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundGradientStart },
  header: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
  },
  count: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 2,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: 2,
    gap: 2,
  },
  viewToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleActive: {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filtersWrap: {
    marginTop: 0,
  },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  allOffersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 12,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, padding: spacing.xl },
  empty: { ...typography.body, color: colors.mutedForeground },
});
