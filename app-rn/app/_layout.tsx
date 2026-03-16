import 'react-native-url-polyfill/auto';
import { Stack } from 'expo-router';
import { StripeRoot } from '../components/StripeRoot';
import { AuthProvider } from '../lib/auth-context';

// #region agent log
if (typeof fetch !== 'undefined') { fetch('http://127.0.0.1:7490/ingest/953e80a6-dd3a-405d-9917-1610bb939dfd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'346cbd'},body:JSON.stringify({sessionId:'346cbd',location:'_layout.tsx:root',message:'RootLayout render',hypothesisId:'H3',timestamp:Date.now()})}).catch(()=>{}); }
// #endregion

export default function RootLayout() {
  return (
    <StripeRoot>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="jobs/[id]" options={{ headerShown: true, title: 'Ponuka' }} />
          <Stack.Screen name="chat/[roomId]" options={{ headerShown: true, title: 'Chat' }} />
          <Stack.Screen name="plans" options={{ headerShown: true, title: 'Plány' }} />
          <Stack.Screen name="buy-credits" options={{ headerShown: true, title: 'Kúpiť kredity' }} />
        </Stack>
      </AuthProvider>
    </StripeRoot>
  );
}
