import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useRegistration } from '../../../lib/registration-context';
import { S } from '../../../constants/strings';
import { colors, spacing, typography } from '../../../constants/theme';
import { Button, Label } from '../../../components/ui';

type RoleChoice = 'looking' | 'offering' | 'both';

export default function RolesScreen() {
  const { setRoles } = useRegistration();
  const [choice, setChoice] = useState<RoleChoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const looking_for_work = choice === 'looking' || choice === 'both';
  const offering_work = choice === 'offering' || choice === 'both';

  const handleNext = () => {
    if (!choice) {
      setError('Zvoľte aspoň jednu možnosť.');
      return;
    }
    setError(null);
    setRoles({ looking_for_work, offering_work });
    if (looking_for_work) {
      router.replace('/(auth)/register/preferences-looking');
    } else {
      router.replace('/(auth)/register/preferences-offering');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.scroll}>
        <Text style={styles.heading}>{S.stepRoles}</Text>
        {error ? (
          <Text style={styles.error} selectable>{error}</Text>
        ) : null}
        <Label>Čo vás zaujíma?</Label>
        <TouchableOpacity
          style={[
            styles.roleBtn,
            choice === 'looking' && styles.roleBtnActive,
          ]}
          onPress={() => setChoice('looking')}
        >
          <Text
            style={[
              styles.roleBtnText,
              choice === 'looking' && styles.roleBtnTextActive,
            ]}
          >
            {S.lookingForWork}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.roleBtn,
            choice === 'offering' && styles.roleBtnActive,
          ]}
          onPress={() => setChoice('offering')}
        >
          <Text
            style={[
              styles.roleBtnText,
              choice === 'offering' && styles.roleBtnTextActive,
            ]}
          >
            {S.offeringWork}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.roleBtn,
            choice === 'both' && styles.roleBtnActive,
          ]}
          onPress={() => setChoice('both')}
        >
          <Text
            style={[
              styles.roleBtnText,
              choice === 'both' && styles.roleBtnTextActive,
            ]}
          >
            {S.bothRoles}
          </Text>
        </TouchableOpacity>
        <Button onPress={handleNext} style={styles.button}>
          Ďalej
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
  error: {
    ...typography.bodySmall,
    color: colors.destructive,
    marginBottom: spacing.lg,
  },
  roleBtn: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  roleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  roleBtnText: { ...typography.bodySmall },
  roleBtnTextActive: { color: colors.primary, fontWeight: '600' },
  button: { marginTop: spacing.xl },
});
