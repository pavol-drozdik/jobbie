import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { usePaymentSheet } from '@stripe/stripe-react-native';
import { useAuth } from '../lib/auth-context';
import { api } from '../lib/api';
import { S } from '../constants/strings';
import { colors, spacing, typography } from '../constants/theme';
import { Button } from './ui';

type CreditPack = {
  price_id: string;
  credits: number;
  unit_amount: number;
  currency: string;
};

type CreditPacksConfig = {
  stripeConfigured: boolean;
  hasDefaultPrice: boolean;
  hasProductId: boolean;
  hasCreditProductIds: boolean;
};

function formatPrice(unitAmount: number, currency: string): string {
  const value = (unitAmount / 100).toFixed(2);
  if (currency.toUpperCase() === 'EUR') return `${value} €`;
  return `${value} ${currency}`;
}

export default function BuyCreditsScreenNative() {
  const { session } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [packsLoadError, setPacksLoadError] = useState<string | null>(null);
  const [configHint, setConfigHint] = useState<CreditPacksConfig | null>(null);
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPacksLoadError(null);
      const res = await api<CreditPack[]>('/api/payments/credit-packs', {});
      if (cancelled) return;
      setPacksLoading(false);
      if (!res.ok) {
        setPacksLoadError(
          `Server ${res.status}: ${res.body?.slice(0, 80) ?? 'Unknown error'}`,
        );
        return;
      }
      if (res.data && Array.isArray(res.data)) {
        setPacks(res.data);
        if (res.data.length > 0) {
          setSelectedPack(res.data[0]);
        }
      }
      if (!res.data || !Array.isArray(res.data) || res.data.length === 0) {
        const cfg = await api<CreditPacksConfig>(
          '/api/payments/credit-packs-config',
          {},
        );
        if (!cancelled && cfg.ok && cfg.data) setConfigHint(cfg.data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBuy = async () => {
    if (!session?.access_token) return;
    const pack = selectedPack ?? packs[0];
    if (!pack) return;
    setLoading(true);
    setError(null);
    try {
      // #region agent log
      fetch('http://127.0.0.1:7490/ingest/953e80a6-dd3a-405d-9917-1610bb939dfd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'346cbd'},body:JSON.stringify({sessionId:'346cbd',location:'BuyCreditsScreen.native:handleBuy-start',message:'handleBuy',hypothesisId:'H2',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const res = await api<{ client_secret: string }>(
        '/api/payments/create-payment-intent-credits',
        {
          method: 'POST',
          token: session.access_token,
          body: {
            price_id: pack.price_id,
            credits_amount: pack.credits,
          },
        },
      );
      if (!res.ok) {
        const msg =
          (res.data as { message?: string })?.message ||
          res.body ||
          'Platba sa nepodarila.';
        setError(msg);
        return;
      }
      const clientSecret =
        typeof res.data?.client_secret === 'string'
          ? res.data.client_secret.trim()
          : '';
      if (!clientSecret) {
        setError(
          'Server nevrátil platobné údaje. Skontrolujte Stripe konfiguráciu.',
        );
        return;
      }
      // #region agent log
      fetch('http://127.0.0.1:7490/ingest/953e80a6-dd3a-405d-9917-1610bb939dfd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'346cbd'},body:JSON.stringify({sessionId:'346cbd',location:'BuyCreditsScreen.native:before-initPaymentSheet',message:'before initPaymentSheet',hypothesisId:'H2',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const { error: initErr } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'JOBBIE',
      });
      if (initErr) {
        setError(initErr.message ?? 'Nepodarilo sa pripraviť platbu.');
        return;
      }
      const { error: presentErr } = await presentPaymentSheet();
      if (presentErr) {
        if (presentErr.code !== 'Canceled') {
          setError(presentErr.message ?? 'Platba zrušená alebo zlyhala.');
        }
        return;
      }
      router.back();
    } catch (e) {
      // #region agent log
      const err = e instanceof Error ? e : new Error(String(e));
      fetch('http://127.0.0.1:7490/ingest/953e80a6-dd3a-405d-9917-1610bb939dfd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'346cbd'},body:JSON.stringify({sessionId:'346cbd',location:'BuyCreditsScreen.native:handleBuy-catch',message:'handleBuy threw',data:{name:err.name,message:err.message},hypothesisId:'H2',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setError(err.message ?? 'Platba zlyhala.');
    } finally {
      setLoading(false);
    }
  };

  if (packsLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{S.loading}</Text>
      </View>
    );
  }

  if (packs.length === 0) {
    const hint = configHint;
    let tip = 'Žiadne balíky nie sú momentálne k dispozícii.';
    if (packsLoadError) {
      tip = packsLoadError;
    } else if (hint) {
      if (!hint.stripeConfigured) {
        tip =
          'V backend .env chýba STRIPE_SECRET_KEY. Pridaj Stripe kľúč a reštartuj server.';
      } else if (!hint.hasDefaultPrice && !hint.hasProductId && !hint.hasCreditProductIds) {
        tip =
          'V backend .env nastav STRIPE_PRICE_ID_CREDITS alebo STRIPE_PRODUCT_ID_CREDITS alebo STRIPE_CREDIT_PRODUCT_IDS. Reštartuj server.';
      } else if (!hint.hasDefaultPrice && !hint.hasProductId && hint.hasCreditProductIds) {
        tip =
          'Skontroluj STRIPE_CREDIT_PRODUCT_IDS v .env (platné ID produktov v Stripe) alebo pridaj STRIPE_PRICE_ID_CREDITS ako záložný balík.';
      } else {
        tip =
          'Skontroluj v Stripe, že produkt má aktívnu jednorazovú cenu s metadata.credits (alebo nastav STRIPE_PRICE_ID_CREDITS).';
      }
    }
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{S.buyCredits}</Text>
        <Text style={styles.empty} selectable>
          {tip}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancel}
        >
          <Text style={styles.cancelText}>{S.cancel}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{S.buyCredits}</Text>
      <Text style={styles.description}>
        Vyberte balík a zaplaťte priamo v aplikácii.
      </Text>
      {packs.map((pack) => (
        <TouchableOpacity
          key={pack.price_id}
          onPress={() => setSelectedPack(pack)}
          style={[
            styles.packRow,
            selectedPack?.price_id === pack.price_id && styles.packRowSelected,
          ]}
          activeOpacity={0.7}
        >
          <Text style={styles.packLabel}>
            {pack.credits} kreditov – {formatPrice(pack.unit_amount, pack.currency)}
          </Text>
        </TouchableOpacity>
      ))}
      {error ? (
        <Text style={styles.error} selectable>
          {error}
        </Text>
      ) : null}
      <Button
        onPress={handleBuy}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        {S.buyCredits}
      </Button>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.cancel}
        disabled={loading}
      >
        <Text style={styles.cancelText}>{S.cancel}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.mutedForeground,
    marginTop: spacing.md,
  },
  title: {
    ...typography.titleLarge,
    marginBottom: spacing.lg,
    color: colors.foreground,
  },
  description: {
    ...typography.body,
    color: colors.mutedForeground,
    marginBottom: spacing.xl,
  },
  packRow: {
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  packRowSelected: {
    borderColor: colors.primary,
  },
  packLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.foreground,
  },
  empty: {
    ...typography.body,
    color: colors.mutedForeground,
    marginBottom: spacing.xl,
  },
  error: {
    ...typography.bodySmall,
    color: colors.destructive,
    marginBottom: spacing.lg,
  },
  button: { marginBottom: spacing.md },
  cancel: { alignSelf: 'center', marginBottom: spacing.xl },
  cancelText: { ...typography.body, color: colors.primary },
});
