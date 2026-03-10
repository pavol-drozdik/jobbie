import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { S } from '../../../constants/strings';
import { colors, spacing, typography } from '../../../constants/theme';
import { Button, Label } from '../../../components/ui';

type AccountType = 'individual' | 'company';

export default function AccountTypeScreen() {
  const [accountType, setAccountType] = useState<AccountType>('individual');

  const handleNext = () => {
    router.push({
      pathname: '/(auth)/register/credentials',
      params: { accountType },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.scroll}>
        <Text style={styles.heading}>{S.stepAccountType}</Text>
        <Label>{S.roleLabel}</Label>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[
              styles.roleBtn,
              accountType === 'individual' && styles.roleBtnActive,
            ]}
            onPress={() => setAccountType('individual')}
          >
            <Text
              style={[
                styles.roleBtnText,
                accountType === 'individual' && styles.roleBtnTextActive,
              ]}
            >
              {S.roleIndividual}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.roleBtn,
              accountType === 'company' && styles.roleBtnActive,
            ]}
            onPress={() => setAccountType('company')}
          >
            <Text
              style={[
                styles.roleBtnText,
                accountType === 'company' && styles.roleBtnTextActive,
              ]}
            >
              {S.roleCompany}
            </Text>
          </TouchableOpacity>
        </View>
        <Button onPress={handleNext} style={styles.button}>
          Ďalej
        </Button>
        <Button
          variant="link"
          onPress={() => router.back()}
          style={styles.link}
        >
          {S.haveAccount} {S.login}
        </Button>
      </View>
    </View>
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
  roleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
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
  button: { marginTop: spacing.sm },
  link: { marginTop: spacing.lg },
});
