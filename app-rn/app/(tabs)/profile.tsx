import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { S } from '../../constants/strings';
import { colors, spacing, typography } from '../../constants/theme';
import { Button, Input, Label } from '../../components/ui';

type Profile = {
  role?: string;
  display_name?: string | null;
  company_name?: string | null;
  bio?: string | null;
  education?: string | null;
  skills?: string | null;
  job_interests?: string | null;
  location?: string | null;
  description?: string | null;
  sector?: string | null;
  experience?: string | null;
  registration_number?: string | null;
  website?: string | null;
  logo_url?: string | null;
  credits?: number;
};

export default function ProfileScreen() {
  const { user, session, signOut, refreshUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [jobInterests, setJobInterests] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [sector, setSector] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = async () => {
    if (!session?.access_token) return;
    setSaveError(null);
    const res = await api<Profile & { email?: string }>('/api/profiles/me', {
      token: session.access_token,
    });
    if (res.ok && res.data) {
      const d = res.data;
      setProfile(d);
      setSaveError(null);
      setDisplayName(d.display_name ?? '');
      setCompanyName(d.company_name ?? '');
      setBio(d.bio ?? '');
      setSkills(d.skills ?? '');
      setExperience(d.experience ?? '');
      setJobInterests(d.job_interests ?? '');
      setLocation(d.location ?? '');
      setDescription(d.description ?? '');
      setSector(d.sector ?? '');
      setRegistrationNumber(d.registration_number ?? '');
      setWebsite(d.website ?? '');
      setLogoUrl(d.logo_url ?? '');
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [session?.access_token]);

  useFocusEffect(() => {
    if (session?.access_token && profile !== null) void load();
  });

  const handleSave = async () => {
    if (!session?.access_token) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api('/api/profiles/me', {
        token: session.access_token,
        method: 'PATCH',
        body: {
          display_name: displayName.trim() || null,
          company_name: companyName.trim() || null,
          bio: bio.trim() || null,
          skills: skills.trim() || null,
          experience: experience.trim() || null,
          job_interests: jobInterests.trim() || null,
          location: location.trim() || null,
          description: description.trim() || null,
          sector: sector.trim() || null,
          registration_number: registrationNumber.trim() || null,
          website: website.trim() || null,
          logo_url: logoUrl.trim() || null,
        },
      });
      if (!res.ok) {
        const msg =
          (res.data as { message?: string })?.message ||
          res.body ||
          'Uloženie zlyhalo.';
        setSaveError(msg);
        return;
      }
      await load();
      await refreshUser();
    } finally {
      setSaving(false);
    }
  };

  const performLogout = () => {
    signOut().then(() => router.replace('/(auth)/login'));
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Naozaj sa chcete odhlásiť?')) {
        performLogout();
      }
    } else {
      Alert.alert('Odhlásiť', 'Naozaj sa chcete odhlásiť?', [
        { text: S.cancel, style: 'cancel' },
        {
          text: S.logout,
          style: 'destructive',
          onPress: performLogout,
        },
      ]);
    }
  };

  if (!user) {
    return (
      <View style={[styles.centered, styles.screen]}>
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

  const isCompany = profile?.role === 'company';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{S.profilTitle}</Text>
      {saveError ? (
        <Text style={styles.saveError} selectable>{saveError}</Text>
      ) : null}
      <Label>{S.emailReadOnly}</Label>
      <Text style={styles.value}>{user.email}</Text>
      <Label>{S.roleLabel}</Label>
      <Text style={styles.value}>
        {isCompany ? S.roleCompany : S.roleIndividual}
      </Text>
      <Label>{S.credits}</Label>
      <Text style={styles.value}>{profile?.credits ?? 0}</Text>
      <TouchableOpacity
        style={styles.buyCreditsBtn}
        onPress={() => router.push('/buy-credits')}
      >
        <Text style={styles.buyCreditsText}>{S.buyCredits}</Text>
      </TouchableOpacity>
      {!isCompany && (
        <>
          <Label>{S.fullName}</Label>
          <Input
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={S.fullName}
            editable={!saving}
          />
        </>
      )}
      {isCompany && (
        <>
          <Label>{S.companyName}</Label>
          <Input
            style={styles.input}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder={S.companyName}
            editable={!saving}
          />
          <Label>{S.registrationNumber}</Label>
          <Input
            style={styles.input}
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
            placeholder={S.registrationNumber}
            editable={!saving}
          />
          <Label>{S.website}</Label>
          <Input
            style={styles.input}
            value={website}
            onChangeText={setWebsite}
            placeholder={S.website}
            keyboardType="url"
            autoCapitalize="none"
            editable={!saving}
          />
          <Label>{S.logoUrl}</Label>
          <Input
            style={styles.input}
            value={logoUrl}
            onChangeText={setLogoUrl}
            placeholder={S.logoUrl}
            keyboardType="url"
            autoCapitalize="none"
            editable={!saving}
          />
        </>
      )}
      <Label>{S.location}</Label>
      <Input
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder={S.location}
        editable={!saving}
      />
      <Label>{S.bio}</Label>
      <Input
        style={[styles.input, styles.textArea]}
        value={bio}
        onChangeText={setBio}
        placeholder={S.bio}
        multiline
        editable={!saving}
      />
      {!isCompany && (
        <>
          <Label>{S.skills}</Label>
          <Input
            style={[styles.input, styles.textArea]}
            value={skills}
            onChangeText={setSkills}
            placeholder={S.skills}
            multiline
            editable={!saving}
          />
          <Label>{S.experience}</Label>
          <Input
            style={[styles.input, styles.textArea]}
            value={experience}
            onChangeText={setExperience}
            placeholder={S.experience}
            multiline
            editable={!saving}
          />
          <Label>{S.jobInterests}</Label>
          <Input
            style={styles.input}
            value={jobInterests}
            onChangeText={setJobInterests}
            placeholder={S.preferredJobType}
            editable={!saving}
          />
        </>
      )}
      <>
        <Label>{S.description}</Label>
        <Input
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder={S.description}
          multiline
          editable={!saving}
        />
        <Label>{S.sector}</Label>
        <Input
          style={styles.input}
          value={sector}
          onChangeText={setSector}
          placeholder={S.sector}
          editable={!saving}
        />
      </>
      <Button
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        style={styles.button}
      >
        {S.save}
      </Button>
      <TouchableOpacity
        style={styles.plansLink}
        onPress={() => router.push('/plans')}
      >
        <Text style={styles.linkText}>{S.planyTitle}</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
      <Button
        variant="link"
        onPress={handleLogout}
        style={styles.logout}
        textStyle={styles.logoutText}
      >
        {S.logout}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundGradientStart },
  content: { padding: spacing.lg },
  centered: { justifyContent: 'center', alignItems: 'center' },
  heading: {
    ...typography.titleLarge,
    marginBottom: spacing.lg,
    color: colors.foreground,
  },
  saveError: {
    ...typography.bodySmall,
    color: colors.destructive,
    marginBottom: spacing.lg,
  },
  value: {
    ...typography.body,
    marginBottom: spacing.lg,
    color: colors.mutedForeground,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  switchLabel: { ...typography.bodySmall, flex: 1 },
  input: { marginBottom: spacing.lg },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  button: { marginBottom: spacing.lg },
  plansLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
  },
  linkText: { ...typography.body, color: colors.foreground },
  chevron: { fontSize: 20, color: colors.mutedForeground },
  buyCreditsBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buyCreditsText: {
    ...typography.body,
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  logout: { marginTop: spacing.xl },
  logoutText: { color: colors.destructive },
  empty: { ...typography.body, color: colors.mutedForeground },
});
