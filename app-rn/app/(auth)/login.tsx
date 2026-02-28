import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { S } from '../../constants/strings';
import { colors, spacing, typography } from '../../constants/theme';
import { Button, Input, Label } from '../../components/ui';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Vyplňte email a heslo.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: e } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (e) {
        setError(e.message ?? 'Prihlásenie zlyhalo.');
        return;
      }
      router.replace('/(tabs)');
    } catch {
      setError('Pri prihlásení sa vyskytla chyba.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.logo}>JOBBIE</Text>
          <Text style={styles.heroSub}>Prihláste sa do svojho účtu</Text>
        </View>
        <Text style={styles.heading}>{S.login}</Text>
        {error ? (
          <Text style={styles.error} selectable>{error}</Text>
        ) : null}
        <Label>{S.email}</Label>
        <Input
          placeholder={S.email}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          style={styles.input}
        />
        <Label>{S.password}</Label>
        <Input
          placeholder={S.password}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
          style={styles.input}
        />
        <Button
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          {S.signIn}
        </Button>
        <Button
          variant="link"
          onPress={() => router.push('/(auth)/register')}
          disabled={loading}
          style={styles.link}
        >
          {S.noAccount} {S.register}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingTop: spacing.xxl },
  hero: {
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  heroSub: {
    ...typography.bodySmall,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  heading: {
    ...typography.title,
    marginBottom: spacing.lg,
    color: colors.foreground,
  },
  error: {
    ...typography.bodySmall,
    color: colors.destructive,
    marginBottom: spacing.lg,
  },
  input: { marginBottom: spacing.lg },
  button: { marginTop: spacing.sm },
  link: { marginTop: spacing.lg },
});
