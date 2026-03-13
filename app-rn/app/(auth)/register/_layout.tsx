import { Stack } from 'expo-router';
import { RegistrationProvider } from '../../../lib/registration-context';

export default function RegisterLayout() {
  return (
    <RegistrationProvider>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="account-type" />
      <Stack.Screen name="credentials" />
      <Stack.Screen name="preferences-looking" />
      <Stack.Screen name="complete-profile" />
      <Stack.Screen name="confirm-email" />
      <Stack.Screen name="welcome" />
    </Stack>
    </RegistrationProvider>
  );
}
