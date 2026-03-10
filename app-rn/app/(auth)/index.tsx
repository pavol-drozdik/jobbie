import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { S } from '../../constants/strings';
import { colors, spacing, typography } from '../../constants/theme';
import { Button } from '../../components/ui';

export default function AuthEntryScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>JOBBIE</Text>
        <Text style={styles.heroSub}>Práca a brigády na jednom mieste</Text>
      </View>
      <View style={styles.actions}>
        <Button
          onPress={() => router.push('/(auth)/login')}
          style={styles.button}
        >
          {S.login}
        </Button>
        <Button
          variant="outline"
          onPress={() => router.push('/(auth)/register')}
          style={styles.button}
        >
          {S.createAccount}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  hero: {
    marginBottom: spacing.xxl,
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  heroSub: {
    ...typography.body,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  actions: { gap: spacing.md },
  button: { width: '100%' },
});
