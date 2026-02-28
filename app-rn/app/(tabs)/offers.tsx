import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { S } from '../../constants/strings';
import { colors, spacing, typography } from '../../constants/theme';
import { JobCard } from '../../components/jobs/JobCard';
import { ApplicationCard } from '../../components/jobs/ApplicationCard';

type Job = {
  id: string;
  title: string;
  is_draft: boolean;
  is_active: boolean;
  description?: string | null;
  salary?: string | null;
  location?: string | null;
};

type Application = {
  id: string;
  job_id: string;
  status: string;
  job_title?: string;
};

export default function OffersScreen() {
  const { session, user } = useAuth();
  const [tab, setTab] = useState<'my' | 'applications'>('my');
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!session?.access_token || !user) return;
    if (tab === 'my') {
      const res = await api<Job[]>('/api/jobs', {
        token: session.access_token,
        query: { limit: '50', offset: '0', my: 'true' },
      });
      setMyJobs(Array.isArray(res.data) ? res.data : []);
    } else {
      const res = await api<Application[]>('/api/applications', {
        token: session.access_token,
        query: {
          limit: '50',
          offset: '0',
          individual_id: user.id,
        },
      });
      setApplications(Array.isArray(res.data) ? res.data : []);
    }
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [session?.access_token, tab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openChat = async (applicationId: string) => {
    const roomRes = await api<{ id: string }>('/api/chat/rooms', {
      token: session?.access_token ?? undefined,
      method: 'POST',
      query: { application_id: applicationId },
    });
    if (roomRes.ok && roomRes.data?.id) {
      router.push(`/chat/${roomRes.data.id}`);
    }
  };

  if (!user) {
    return (
      <View style={[styles.centered, styles.screen]}>
        <Text style={styles.empty}>{S.pleaseSignIn}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'my' && styles.tabActive]}
          onPress={() => setTab('my')}
        >
          <Text style={[styles.tabText, tab === 'my' && styles.tabTextActive]}>
            {S.mojePonuky}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'applications' && styles.tabActive]}
          onPress={() => setTab('applications')}
        >
          <Text style={[styles.tabText, tab === 'applications' && styles.tabTextActive]}>
            {S.aktivnePonuky}
          </Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={[styles.centered, styles.screen]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        >
          {tab === 'my' ? (
            myJobs.length === 0 ? (
              <Text style={styles.empty}>{S.myOffersPlaceholder}</Text>
            ) : (
              myJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onPress={() => router.push(`/jobs/${job.id}`)}
                />
              ))
            )
          ) : applications.length === 0 ? (
            <Text style={styles.empty}>{S.noApplicationsYet}</Text>
          ) : (
            applications.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onPress={() => openChat(app.id)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundGradientStart },
  centered: { justifyContent: 'center', alignItems: 'center' },
  tabRow: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  tab: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  tabText: { ...typography.bodySmall },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  scroll: { padding: spacing.lg, paddingTop: 0 },
  empty: {
    ...typography.body,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
