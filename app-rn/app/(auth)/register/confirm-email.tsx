import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { S } from '../../../constants/strings';
import { colors, spacing, typography } from '../../../constants/theme';
import { Button } from '../../../components/ui';

export default function ConfirmEmailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{S.confirmEmailTitle}</Text>
      <Text style={styles.message}>{S.confirmEmailMessage}</Text>
      <Button
        onPress={() => router.replace('/(auth)/login')}
        style={styles.primaryButton}
      >
        {S.stepIntoApp}
      </Button>
      <Button
        variant="link"
        onPress={() => router.replace('/(auth)/login')}
        style={styles.link}
      >
        {S.alreadyConfirmedSignIn}
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
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  primaryButton: { minWidth: 200, marginBottom: spacing.md },
  link: {},
});
