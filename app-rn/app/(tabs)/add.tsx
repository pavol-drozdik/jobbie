import { useState } from 'react';
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
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { S } from '../../constants/strings';
import { colors, spacing, typography } from '../../constants/theme';
import { Button, Input, Label } from '../../components/ui';
import { Select } from '../../components/ui/Select';
import { getCategoryLabel } from '../../components/ui/CategoryBadge';
import {
  CATEGORIES,
  JOB_TYPES,
  COMPENSATION_TYPES,
  type Job,
} from '../../types/job';

const categoryOptions = CATEGORIES.map((c) => ({
  value: c,
  label: getCategoryLabel(c),
}));

export default function AddJobScreen() {
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
      const payRes = await api<{ checkout_url?: string }>(
        '/api/payments/checkout-session',
        {
          token: session.access_token,
          method: 'POST',
          body: {
            job_id: jobId,
            success_url: 'https://yourapp.com/offers?paid=1',
            cancel_url: 'https://yourapp.com/offers?cancel=1',
          },
        }
      );
      if (payRes.ok && payRes.data?.checkout_url) {
        setError(`Pre platbu otvorte: ${payRes.data.checkout_url}`);
      } else {
        router.replace('/(tabs)/offers');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

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
});
