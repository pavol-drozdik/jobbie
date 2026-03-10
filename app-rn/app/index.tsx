import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth-context';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    const needsRoles =
      user.looking_for_work === false && user.offering_work === false;
    if (needsRoles) return <Redirect href="/(auth)/register/roles" />;
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/(auth)" />;
}
