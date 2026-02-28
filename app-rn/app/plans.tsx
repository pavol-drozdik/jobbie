import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useAuth } from '../lib/auth-context';
import { api } from '../lib/api';
import { S } from '../constants/strings';
import { colors, spacing, typography } from '../constants/theme';
import { Button, Card } from '../components/ui';

type Plan = {
  id: string;
  slug: string;
  name_sk: string;
  price_monthly_cents: number;
  max_active_jobs: number;
  sort_order: number;
};

type MySubscription = {
  plan_id: string;
  plan_name_sk: string;
  status: string;
  current_period_end: string | null;
};

export default function PlansScreen() {
  const { session } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mySub, setMySub] = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    if (!session?.access_token) return;
    const [plansRes, meRes] = await Promise.all([
      api<Plan[]>('/api/plans', { token: session.access_token }),
      api<MySubscription | null>('/api/plans/me', {
        token: session.access_token,
      }),
    ]);
    setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
    setMySub(meRes.data ?? null);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [session?.access_token]);

  const selectPlan = async (planId: string, priceCents: number) => {
    if (!session?.access_token) return;
    setActionLoading(planId);
    try {
      if (priceCents === 0) {
        const res = await api('/api/payments/checkout-subscription', {
          token: session.access_token,
          method: 'POST',
          body: {
            plan_id: planId,
            success_url: 'https://yourapp.com/plans?success=1',
            cancel_url: 'https://yourapp.com/plans?cancel=1',
          },
        });
        if (res.ok) await load();
        else Alert.alert('Chyba', res.body?.slice(0, 200) || 'Zlyhanie');
        return;
      }
      const res = await api<{ checkout_url?: string }>(
        '/api/payments/checkout-subscription',
        {
          token: session.access_token,
          method: 'POST',
          body: {
            plan_id: planId,
            success_url: 'https://yourapp.com/plans?success=1',
            cancel_url: 'https://yourapp.com/plans?cancel=1',
          },
        }
      );
      if (res.ok && res.data?.checkout_url) {
        const opened = await Linking.canOpenURL(res.data.checkout_url);
        if (opened) await Linking.openURL(res.data.checkout_url);
        else Alert.alert('Otvorte v prehliadači', res.data.checkout_url);
      } else {
        Alert.alert('Chyba', res.body?.slice(0, 200) || 'Platba neprebehla.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, styles.screen]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{S.myPlan}</Text>
      {mySub ? (
        <Card style={styles.card}>
          <Text style={styles.planName}>{mySub.plan_name_sk}</Text>
          <Text style={styles.status}>Stav: {mySub.status}</Text>
          {mySub.current_period_end ? (
            <Text style={styles.meta}>
              Do: {new Date(mySub.current_period_end).toLocaleDateString('sk-SK')}
            </Text>
          ) : null}
        </Card>
      ) : (
        <Text style={styles.noSub}>{S.noSubscription}</Text>
      )}
      <Text style={styles.heading}>Dostupné plány</Text>
      {plans.map((plan) => {
        const isCurrent = mySub?.plan_id === plan.id;
        const isFree = plan.price_monthly_cents === 0;
        return (
          <Card key={plan.id} style={styles.card}>
            <Text style={styles.planName}>{plan.name_sk}</Text>
            <Text style={styles.price}>
              {isFree ? 'Zadarmo' : `${(plan.price_monthly_cents / 100).toFixed(2)} €/mesiac`}
            </Text>
            <Text style={styles.meta}>
              Max. {plan.max_active_jobs} aktívnych inzerátov
            </Text>
            <Button
              onPress={() => selectPlan(plan.id, plan.price_monthly_cents)}
              loading={actionLoading === plan.id}
              disabled={actionLoading !== null}
              style={[styles.cta, isCurrent && styles.ctaCurrent]}
            >
              {isCurrent ? 'Aktuálny' : S.selectPlan}
            </Button>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundGradientStart },
  content: { padding: spacing.lg },
  centered: { justifyContent: 'center', alignItems: 'center' },
  heading: {
    ...typography.title,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    color: colors.foreground,
  },
  noSub: {
    ...typography.body,
    color: colors.mutedForeground,
    marginBottom: spacing.xl,
  },
  card: { marginBottom: spacing.md, padding: spacing.lg },
  planName: {
    ...typography.title,
    marginBottom: spacing.xs,
    color: colors.foreground,
  },
  price: {
    ...typography.body,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  status: { ...typography.bodySmall, color: colors.mutedForeground },
  meta: {
    ...typography.bodySmall,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  cta: {},
  ctaCurrent: { backgroundColor: '#34C759' },
});
