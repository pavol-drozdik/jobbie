import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { getPendingRegistration } from '../../../lib/registration-cache';
import { useRegistration } from '../../../lib/registration-context';
import { useRegistrationSignUp } from '../../../lib/use-registration-signup';
import { S } from '../../../constants/strings';
import { colors, spacing, typography } from '../../../constants/theme';
import { Button, Input, Label } from '../../../components/ui';

export default function PreferencesLookingScreen() {
  const { credentials, setPreferences } = useRegistration();
  const { doSignUp, saving, error } = useRegistrationSignUp();
  const [lookingCategory, setLookingCategory] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');

  const pending = getPendingRegistration();

  const handleContinue = async () => {
    const job_interests = lookingCategory.trim() || null;
    const location = preferredLocation.trim() || null;
    const prefs = {
      job_interests,
      location,
      sector: null as string | null,
    };
    setPreferences(prefs);
    const result = await doSignUp(prefs);
    if (result.ok) {
      if (result.needsEmailConfirmation) {
        router.replace('/(auth)/register/confirm-email');
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  const handleSkip = async () => {
    setPreferences({
      job_interests: null,
      location: null,
      sector: null,
    });
    const result = await doSignUp(null);
    if (result.ok) {
      if (result.needsEmailConfirmation) {
        router.replace('/(auth)/register/confirm-email');
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  const hasData = !!(credentials ?? pending.credentials);
  if (!hasData) {
    return (
      <View style={[styles.centered, styles.container]}>
        <Text style={styles.error}>
          Chýbajú údaje. Začnite registráciu znova.
        </Text>
        <Button
          onPress={() => router.replace('/(auth)/register/account-type')}
          style={styles.button}
        >
          Späť na začiatok
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>{S.preferencesLookingTitle}</Text>
      <Text style={styles.subheading}>{S.preferencesOptional}</Text>
      {error ? (
        <Text style={styles.errorText} selectable>{error}</Text>
      ) : null}

      <View style={styles.section}>
        <Label>{S.category}</Label>
        <Input
          value={lookingCategory}
          onChangeText={setLookingCategory}
          placeholder={S.category}
          editable={!saving}
          style={styles.input}
        />
        <Label>{S.preferredLocation}</Label>
        <Input
          value={preferredLocation}
          onChangeText={setPreferredLocation}
          placeholder={S.preferredLocation}
          editable={!saving}
          style={styles.input}
        />
      </View>

      <Button
        onPress={handleContinue}
        loading={saving}
        disabled={saving}
        style={styles.button}
      >
        {S.continue}
      </Button>
      <Button
        variant="link"
        onPress={handleSkip}
        disabled={saving}
        style={styles.link}
      >
        {S.skipForNow}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingTop: spacing.xxl },
  centered: { justifyContent: 'center', alignItems: 'center' },
  heading: {
    ...typography.title,
    marginBottom: spacing.xs,
    color: colors.foreground,
  },
  subheading: {
    ...typography.bodySmall,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.destructive,
    marginBottom: spacing.lg,
  },
  error: {
    ...typography.bodySmall,
    color: colors.destructive,
    marginBottom: spacing.lg,
  },
  section: { marginBottom: spacing.xl },
  input: { marginBottom: spacing.lg },
  button: { marginTop: spacing.sm },
  link: { marginTop: spacing.lg },
});
