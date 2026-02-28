import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { S } from '../../constants/strings';
import { colors, spacing, typography } from '../../constants/theme';
import { Button, Input, Label } from '../../components/ui';

type Role = 'company' | 'individual';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('individual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Vyplňte email a heslo.');
      return;
    }
    if (password.length < 6) {
      setError('Heslo musí mať aspoň 6 znakov.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: e } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { role } },
      });
      if (e) {
        setError(e.message ?? 'Registrácia zlyhala.');
        return;
      }
      router.replace('/(tabs)');
    } catch {
      setError('Pri registrácii sa vyskytla chyba.');
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
        <Text style={styles.heading}>{S.register}</Text>
        {error ? (
          <Text style={styles.error} selectable>{error}</Text>
        ) : null}
        <Label>{S.roleLabel}</Label>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'individual' && styles.roleBtnActive]}
            onPress={() => setRole('individual')}
            disabled={loading}
          >
            <Text style={[styles.roleBtnText, role === 'individual' && styles.roleBtnTextActive]}>
              {S.roleIndividual}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'company' && styles.roleBtnActive]}
            onPress={() => setRole('company')}
            disabled={loading}
          >
            <Text style={[styles.roleBtnText, role === 'company' && styles.roleBtnTextActive]}>
              {S.roleCompany}
            </Text>
          </TouchableOpacity>
        </View>
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
          {S.signUp}
        </Button>
        <Button
          variant="link"
          onPress={() => router.back()}
          disabled={loading}
          style={styles.link}
        >
          {S.haveAccount} {S.login}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingTop: spacing.xxl },
  heading: {
    ...typography.title,
    marginBottom: spacing.lg,
    color: colors.foreground,
  },
  label: { ...typography.bodySmall, marginBottom: spacing.xs, color: colors.foreground },
  roleRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  roleBtn: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  roleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  roleBtnText: { ...typography.bodySmall, textAlign: 'center' },
  roleBtnTextActive: { color: colors.primary, fontWeight: '600' },
  error: {
    ...typography.bodySmall,
    color: colors.destructive,
    marginBottom: spacing.lg,
  },
  input: { marginBottom: spacing.lg },
  button: { marginTop: spacing.sm },
  link: { marginTop: spacing.lg },
});
