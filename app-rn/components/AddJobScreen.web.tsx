import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth-context';
import { api } from '../lib/api';
import { S } from '../constants/strings';
import { colors, spacing, typography } from '../constants/theme';
import { Button, Input, Label } from './ui';
import { Select } from './ui/Select';
import { getCategoryLabel } from './ui/CategoryBadge';
import { StripePaymentFormWeb } from './StripePaymentFormWeb';
import {
  CATEGORIES,
  JOB_TYPES,
  COMPENSATION_TYPES,
  type Job,
} from '../types/job';

const categoryOptions = CATEGORIES.map((c) => ({
  value: c,
  label: getCategoryLabel(c),
}));

export default function AddJobScreenWeb() {
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [salary, setSalary] = useState('');
  const [category, setCategory] = useState('');
  const [jobType, setJobType] = useState('brigada');
  const [workersNeeded, setWorkersNeeded] = useState('1');
  const [compensationType, setCompensationType] = useState('hourly');
  const [compensationAmount, setCompensationAmount] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [completionDeadline, setCompletionDeadline] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isDraft, setIsDraft] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === '1') {
      router.replace('/(tabs)/offers');
    }
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Názov a popis sú povinné.');
      return;
    }
    if (!category.trim()) {
      setError('Vyberte kategóriu.');
      return;
    }
    if (!session?.access_token) {
      setError(S.pleaseSignIn);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        requirements: requirements.trim() || null,
        salary: salary.trim() || null,
        location: locationAddress.trim() || null,
        location_address: locationAddress.trim() || null,
        job_type: jobType || null,
        category: category || null,
        workers_needed: Math.max(1, parseInt(workersNeeded, 10) || 1),
        compensation_type: compensationType || null,
        compensation_amount: compensationAmount.trim()
          ? parseFloat(compensationAmount.replace(',', '.'))
          : null,
        application_deadline: applicationDeadline.trim() || null,
        completion_deadline: completionDeadline.trim() || null,
        is_urgent: isUrgent,
        is_draft: isDraft,
      };
      const res = await api<Job>('/api/jobs', {
        token: session.access_token,
        method: 'POST',
        body,
      });
      if (!res.ok) {
        setError(res.body?.slice(0, 200) || 'Chyba pri ukladaní.');
        return;
      }
      if (isDraft) {
        router.replace('/(tabs)/offers');
        return;
      }
      const jobId = res.data?.id;
      if (!jobId) {
        setError('Chyba: chýba ID ponuky.');
        return;
      }
      const payRes = await api<{ client_secret: string }>(
        '/api/payments/create-payment-intent-job',
        {
          token: session.access_token,
          method: 'POST',
          body: { job_id: jobId },
        },
      );
      if (!payRes.ok) {
        setError(
          (payRes.data as { message?: string })?.message ??
            payRes.body ??
            'Platba sa nepodarila.',
        );
        return;
      }
      const secret =
        typeof payRes.data?.client_secret === 'string'
          ? payRes.data.client_secret.trim()
          : '';
      if (!secret) {
        setError('Server nevrátil platobné údaje.');
        return;
      }
      setPaymentClientSecret(secret);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  if (paymentClientSecret) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setPaymentClientSecret(null)}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Platba za zverejnenie</Text>
        </View>
        <Text style={styles.paymentDescription}>
          Vyplňte údaje karty a dokončite platbu.
        </Text>
        <StripePaymentFormWeb
          clientSecret={paymentClientSecret}
          onSuccess={() => router.replace('/(tabs)/offers')}
          onCancel={() => setPaymentClientSecret(null)}
          submitLabel="Zaplatiť a zverejniť"
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{S.newJobOffer}</Text>
      </View>

      {error ? (
        <Text style={styles.error} selectable>
          {error}
        </Text>
      ) : null}

      <Label>{S.jobTitle} *</Label>
      <Input
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="napr. Pomoc so sťahovaním"
        editable={!loading}
      />

      <Label>{S.categoryRequired}</Label>
      <Select
        value={category}
        onValueChange={setCategory}
        options={categoryOptions}
        placeholder={S.selectCategory}
      />

      <Label>{S.jobType}</Label>
      <Select
        value={jobType}
        onValueChange={setJobType}
        options={JOB_TYPES.map((t) => ({ value: t.value, label: t.label }))}
        placeholder="Typ úväzku"
      />

      <Label>{S.workersNeeded}</Label>
      <Input
        style={styles.input}
        value={workersNeeded}
        onChangeText={setWorkersNeeded}
        placeholder="1"
        keyboardType="number-pad"
        editable={!loading}
      />

      <Label>{S.compensationType}</Label>
      <Select
        value={compensationType}
        onValueChange={setCompensationType}
        options={COMPENSATION_TYPES.map((t) => ({
          value: t.value,
          label: t.label,
        }))}
        placeholder="Typ odmeny"
      />

      {(compensationType === 'hourly' || compensationType === 'fixed') && (
        <>
          <Label>{S.compensationAmount}</Label>
          <Input
            style={styles.input}
            value={compensationAmount}
            onChangeText={setCompensationAmount}
            placeholder={compensationType === 'hourly' ? 'napr. 10' : 'napr. 500'}
            keyboardType="decimal-pad"
            editable={!loading}
          />
        </>
      )}

      <Label>{S.jobDescription} *</Label>
      <Input
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Popis"
        multiline
        numberOfLines={4}
        editable={!loading}
      />

      <Label>{S.jobRequirements}</Label>
      <Input
        style={[styles.input, styles.textArea]}
        value={requirements}
        onChangeText={setRequirements}
        placeholder="Požiadavky"
        multiline
        editable={!loading}
      />

      <Label optional>{S.locationAddress}</Label>
      <Input
        style={styles.input}
        value={locationAddress}
        onChangeText={setLocationAddress}
        placeholder="Mesto, adresa"
        editable={!loading}
      />

      <Label optional>{S.applicationDeadline}</Label>
      <Input
        style={styles.input}
        value={applicationDeadline}
        onChangeText={setApplicationDeadline}
        placeholder="YYYY-MM-DD"
        editable={!loading}
      />

      <Label optional>{S.completionDeadline}</Label>
      <Input
        style={styles.input}
        value={completionDeadline}
        onChangeText={setCompletionDeadline}
        placeholder="Termín"
        editable={!loading}
      />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>{S.urgentOnly}</Text>
        <Switch
          value={isUrgent}
          onValueChange={setIsUrgent}
          disabled={loading}
          trackColor={{ false: colors.border, true: colors.destructive }}
          thumbColor={isUrgent ? colors.destructiveForeground : colors.mutedForeground}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>{S.saveDraft}</Text>
        <Switch
          value={isDraft}
          onValueChange={setIsDraft}
          disabled={loading}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={isDraft ? colors.primary : colors.mutedForeground}
        />
      </View>

      <Button
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
      >
        {isDraft ? S.saveDraft : S.createAndPublish}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundGradientStart },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  backBtn: { padding: spacing.xs },
  headerTitle: {
    ...typography.title,
    color: colors.foreground,
  },
  error: {
    ...typography.bodySmall,
    color: colors.destructive,
    marginBottom: spacing.lg,
  },
  input: { marginBottom: spacing.lg },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  rowLabel: { ...typography.body, color: colors.foreground },
  paymentDescription: {
    ...typography.body,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
  },
});
