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
import { router, useLocalSearchParams } from 'expo-router';
import { useRegistration } from '../../../lib/registration-context';
import { S } from '../../../constants/strings';
import { colors, spacing, typography } from '../../../constants/theme';
import { Button, Input, Label } from '../../../components/ui';

type AccountType = 'individual' | 'company';

export default function CredentialsScreen() {
  const { setCredentials } = useRegistration();
  const params = useLocalSearchParams<{ accountType?: string }>();
  const accountType = (params.accountType === 'company'
    ? 'company'
    : 'individual') as AccountType;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [registeredOffice, setRegisteredOffice] = useState('');
  const [ico, setIco] = useState('');
  const [dic, setDic] = useState('');
  const [vatPayer, setVatPayer] = useState(false);
  const [vatId, setVatId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAgree, setTermsAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (!email.trim() || !password) {
      setError('Vyplňte email a heslo.');
      return;
    }
    if (password.length < 6) {
      setError('Heslo musí mať aspoň 6 znakov.');
      return;
    }
    if (!termsAgree) {
      setError(S.termsRequired);
      return;
    }
    if (accountType === 'individual') {
      if (!firstName.trim() || !lastName.trim()) {
        setError('Vyplňte meno a priezvisko.');
        return;
      }
    } else {
      if (!companyName.trim()) {
        setError('Vyplňte názov firmy.');
        return;
      }
      if (!registeredOffice.trim()) {
        setError('Vyplňte sídlo firmy.');
        return;
      }
      if (!ico.trim()) {
        setError('Vyplňte IČO.');
        return;
      }
      if (!dic.trim()) {
        setError('Vyplňte DIČ.');
        return;
      }
    }

    setError(null);
    setCredentials({
      accountType,
      email: email.trim(),
      password,
      termsAgree,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      companyName: companyName.trim(),
      registeredOffice: registeredOffice.trim(),
      ico: ico.trim(),
      dic: dic.trim(),
      vatId: vatPayer ? vatId.trim() : '',
    });
    router.replace('/(auth)/register/preferences-looking');
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
        <Text style={styles.heading}>{S.stepCredentials}</Text>
        {error ? (
          <Text style={styles.error} selectable>{error}</Text>
        ) : null}

        {accountType === 'individual' ? (
          <>
            <Label>{S.firstName}</Label>
            <Input
              placeholder={S.firstName}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              editable={!loading}
              style={styles.input}
            />
            <Label>{S.lastName}</Label>
            <Input
              placeholder={S.lastName}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              editable={!loading}
              style={styles.input}
            />
          </>
        ) : (
          <>
            <Label>{S.companyName}</Label>
            <Input
              placeholder={S.companyName}
              value={companyName}
              onChangeText={setCompanyName}
              editable={!loading}
              style={styles.input}
            />
            <Label>{S.registeredOffice}</Label>
            <Input
              placeholder={S.registeredOffice}
              value={registeredOffice}
              onChangeText={setRegisteredOffice}
              editable={!loading}
              style={styles.input}
            />
            <Label>{S.companyIdIco}</Label>
            <Input
              placeholder={S.companyIdIco}
              value={ico}
              onChangeText={setIco}
              keyboardType="numeric"
              editable={!loading}
              style={styles.input}
            />
            <Label>{S.taxIdDic}</Label>
            <Input
              placeholder={S.taxIdDic}
              value={dic}
              onChangeText={setDic}
              editable={!loading}
              style={styles.input}
            />
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setVatPayer((v) => !v)}
              disabled={loading}
            >
              <View
                style={[
                  styles.checkbox,
                  vatPayer && styles.checkboxChecked,
                ]}
              />
              <Text style={styles.checkLabel}>{S.vatPayer}</Text>
            </TouchableOpacity>
            {vatPayer && (
              <>
                <Label>{S.vatIdIcDph}</Label>
                <Input
                  placeholder={S.vatIdIcDph}
                  value={vatId}
                  onChangeText={setVatId}
                  editable={!loading}
                  style={styles.input}
                />
              </>
            )}
          </>
        )}

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
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setTermsAgree((v) => !v)}
          disabled={loading}
        >
          <View
            style={[
              styles.checkbox,
              termsAgree && styles.checkboxChecked,
            ]}
          />
          <Text style={styles.checkLabel}>{S.termsAgree}</Text>
        </TouchableOpacity>
        <Button
          onPress={handleNext}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Ďalej
        </Button>
        <Button
          variant="link"
          onPress={() => router.back()}
          disabled={loading}
          style={styles.link}
        >
          Späť
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
  error: {
    ...typography.bodySmall,
    color: colors.destructive,
    marginBottom: spacing.lg,
  },
  input: { marginBottom: spacing.lg },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkLabel: { ...typography.bodySmall, flex: 1 },
  button: { marginTop: spacing.sm },
  link: { marginTop: spacing.lg },
});
