import 'react-native-url-polyfill/auto';
import { Stack } from 'expo-router';
import { AuthProvider } from '../lib/auth-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="jobs/[id]" options={{ headerShown: true, title: 'Ponuka' }} />
        <Stack.Screen name="chat/[roomId]" options={{ headerShown: true, title: 'Chat' }} />
        <Stack.Screen name="plans" options={{ headerShown: true, title: 'Plány' }} />
      </Stack>
    </AuthProvider>
  );
}
