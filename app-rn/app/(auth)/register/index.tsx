import { useEffect } from 'react';
import { router } from 'expo-router';

export default function RegisterIndex() {
  useEffect(() => {
    router.replace('/(auth)/register/account-type');
  }, []);
  return null;
}
