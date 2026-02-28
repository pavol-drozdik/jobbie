import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { S } from '../../constants/strings';
import { colors, spacing, typography } from '../../constants/theme';
import { Button, Input, Label } from '../../components/ui';

type Profile = {
  display_name?: string | null;
  company_name?: string | null;
  bio?: string | null;
  education?: string | null;
  skills?: string | null;
  location?: string | null;
  description?: string | null;
  sector?: string | null;
};

export default function ProfileScreen() {
  const { user, session, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!session?.access_token) return;
    const res = await api<Profile & { email?: string }>('/api/profiles/me', {
      token: session.access_token,
    });
    if (res.ok && res.data) {
      setProfile(res.data);
      setDisplayName(res.data.display_name ?? '');
      setCompanyName(res.data.company_name ?? '');
      setBio(res.data.bio ?? '');
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [session?.access_token]);

  const handleSave = async () => {
    if (!session?.access_token) return;
    setSaving(true);
    try {
      await api('/api/profiles/me', {
        token: session.access_token,
        method: 'PATCH',
        body: {
          display_name: displayName.trim() || null,
          company_name: companyName.trim() || null,
          bio: bio.trim() || null,
        },
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Odhlásiť', 'Naozaj sa chcete odhlásiť?', [
      { text: S.cancel, style: 'cancel' },
      {
        text: S.logout,
        style: 'destructive',
        onPress: () =>
          signOut().then(() => router.replace('/(auth)/login')),
      },
    ]);
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{S.profilTitle}</Text>
      <Label>{S.emailReadOnly}</Label>
      <Text style={styles.value}>{user.email}</Text>
      <Label>{S.fullName}</Label>
      <Input
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Celé meno"
        editable={!saving}
      />
      <Label>{S.companyName}</Label>
      <Input
        style={styles.input}
        value={companyName}
        onChangeText={setCompanyName}
        placeholder="Názov firmy"
        editable={!saving}
      />
      <Label>{S.bio}</Label>
      <Input
        style={[styles.input, styles.textArea]}
        value={bio}
        onChangeText={setBio}
        placeholder="Bio"
        multiline
        editable={!saving}
      />
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
  value: {
    ...typography.body,
    marginBottom: spacing.lg,
    color: colors.mutedForeground,
  },
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
  logout: { marginTop: spacing.xl },
  logoutText: { color: colors.destructive },
  empty: { ...typography.body, color: colors.mutedForeground },
});
