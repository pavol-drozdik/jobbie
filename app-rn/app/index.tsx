import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth-context';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect href="/(tabs)" />;
  return <Redirect href="/(auth)/login" />;
}
