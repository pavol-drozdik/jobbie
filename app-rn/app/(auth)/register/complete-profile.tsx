import { useEffect } from 'react';
import { router } from 'expo-router';

/** Redirect to preferences flow (backwards compatibility). */
export default function CompleteProfileRedirect() {
  useEffect(() => {
    router.replace('/(auth)/register/preferences-looking');
  }, []);
  return null;
}
