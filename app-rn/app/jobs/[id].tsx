import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { S } from '../../constants/strings';
import { colors, spacing, typography } from '../../constants/theme';
import { Button } from '../../components/ui';

type Job = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string | null;
  requirements: string | null;
  salary: string | null;
  job_type: string | null;
  is_draft: boolean;
  is_active: boolean;
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const load = async () => {
    if (!id || !session?.access_token) return;
    const res = await api<Job>(`/api/jobs/${id}`, {
      token: session.access_token,
    });
    if (res.ok && res.data) setJob(res.data);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id, session?.access_token]);

  const isOwner = user && job && job.company_id === user.id;

  const handleActivate = async () => {
    if (!id || !session?.access_token) return;
    setActionLoading(true);
    try {
      const res = await api(`/api/jobs/${id}/activate`, {
        token: session.access_token,
        method: 'POST',
      });
      if (res.ok) await load();
      else Alert.alert('Chyba', res.body?.slice(0, 200) || 'Zlyhanie');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApply = async () => {
    if (!id || !session?.access_token || !user) return;
    setActionLoading(true);
    try {
      const appRes = await api<{ id: string }>('/api/applications', {
        token: session.access_token,
        method: 'POST',
        body: { job_id: id },
      });
      if (!appRes.ok) {
        Alert.alert('Chyba', appRes.body?.slice(0, 200) || 'Prihlásenie zlyhalo.');
        return;
      }
      setApplied(true);
      const roomRes = await api<{ id: string }>('/api/chat/rooms', {
        token: session.access_token,
        method: 'POST',
        query: { application_id: appRes.data!.id },
      });
      if (roomRes.ok && roomRes.data?.id) {
        router.push(`/chat/${roomRes.data.id}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, styles.screen]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.centered, styles.screen]}>
        <Text style={styles.empty}>{S.jobNotFound}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{job.title}</Text>
      {job.salary ? (
        <Text style={styles.meta}>{S.jobSalary}: {job.salary}</Text>
      ) : null}
      {job.location ? (
        <Text style={styles.meta}>{S.jobLocationOptional}: {job.location}</Text>
      ) : null}
      {job.job_type ? (
        <Text style={styles.meta}>{S.jobType}: {job.job_type}</Text>
      ) : null}
      <Text style={styles.body}>{job.description}</Text>
      {job.requirements ? (
        <>
          <Text style={styles.label}>{S.jobRequirements}</Text>
          <Text style={styles.body}>{job.requirements}</Text>
        </>
      ) : null}
      {isOwner ? (
        !job.is_active && !job.is_draft ? (
          <Button
            onPress={handleActivate}
            loading={actionLoading}
            disabled={actionLoading}
            style={styles.cta}
          >
            {S.publishWithoutPayment}
          </Button>
        ) : null
      ) : user && !applied ? (
        <Button
          onPress={handleApply}
          loading={actionLoading}
          disabled={actionLoading || !job.is_active}
          style={styles.cta}
        >
          {S.apply}
        </Button>
      ) : !user ? (
        <Text style={styles.hint}>{S.pleaseSignIn}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundGradientStart },
  content: { padding: spacing.lg },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: {
    ...typography.titleLarge,
    marginBottom: spacing.md,
    color: colors.foreground,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    color: colors.foreground,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.body,
    lineHeight: 24,
    marginBottom: spacing.sm,
    color: colors.foreground,
  },
  cta: { marginTop: spacing.xl },
  empty: { ...typography.body, color: colors.mutedForeground },
  hint: { marginTop: spacing.xl, ...typography.body, color: colors.mutedForeground },
});
