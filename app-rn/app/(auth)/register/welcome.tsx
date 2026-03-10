import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../lib/auth-context';
import { api } from '../../../lib/api';
import { S } from '../../../constants/strings';
import { colors, spacing, typography } from '../../../constants/theme';
import { Button } from '../../../components/ui';

type Profile = { display_name?: string | null; company_name?: string | null };

export default function WelcomeScreen() {
  const { session } = useAuth();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    api<Profile>('/api/profiles/me', { token: session.access_token })
      .then((res) => {
        if (res.ok && res.data) {
          const n =
            res.data.display_name?.trim() ||
            res.data.company_name?.trim() ||
            null;
          setName(n || null);
        }
      })
      .catch(() => {});
  }, [session?.access_token]);

  const handleEnter = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{S.welcomeTitle}</Text>
      {name ? (
        <Text style={styles.greeting}>
          {S.welcomeGreeting}, {name}!
        </Text>
      ) : null}
      <Button onPress={handleEnter} style={styles.button}>
        {S.enterTheApp}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.foreground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  greeting: {
    ...typography.body,
    color: colors.foreground,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  button: { minWidth: 200 },
});
