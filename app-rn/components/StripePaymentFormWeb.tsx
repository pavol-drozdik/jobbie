import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { colors, spacing, typography } from '../constants/theme';
import { Button } from './ui';
import { S } from '../constants/strings';

const publishableKey =
  typeof process !== 'undefined'
    ? (process.env?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '')
    : '';

const stripePromise =
  publishableKey && typeof window !== 'undefined'
    ? loadStripe(publishableKey)
    : null;

function PaymentFormInner({
  onSuccess,
  onCancel,
  submitLabel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setPayError(null);
    try {
      const returnUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}?paid=1`
          : '';
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
      });
      if (error) {
        setPayError(error.message ?? 'Platba zlyhala.');
      } else {
        onSuccess();
      }
    } catch (e) {
      setPayError(e instanceof Error ? e.message : 'Platba zlyhala.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.form}>
      <View style={styles.paymentElementWrap} collapsable={false}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </View>
      {payError ? (
        <Text style={styles.error} selectable>
          {payError}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          onPress={handlePay}
          loading={paying}
          disabled={!stripe || paying}
          style={styles.button}
        >
          {submitLabel}
        </Button>
        <TouchableOpacity onPress={onCancel} style={styles.cancel} disabled={paying}>
          <Text style={styles.cancelText}>{S.cancel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type Props = {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
  submitLabel?: string;
};

export function StripePaymentFormWeb({
  clientSecret,
  onSuccess,
  onCancel,
  submitLabel = 'Zaplatiť',
}: Props) {
  const [stripeReady, setStripeReady] = useState(false);

  useEffect(() => {
    if (!stripePromise) return;
    stripePromise.then(() => setStripeReady(true)).catch(() => {});
  }, []);

  if (!publishableKey) {
    return (
      <View style={styles.form}>
        <Text style={styles.configError}>
          Stripe nie je nakonfigurovaný. Pridajte EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
          do .env a reštartujte.
        </Text>
        <TouchableOpacity onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelText}>{S.cancel}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!stripeReady || !stripePromise) {
    return (
      <View style={styles.form}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Načítava sa platobná brána…</Text>
        <TouchableOpacity onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelText}>{S.cancel}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        loader: 'auto',
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: colors.primary,
            borderRadius: '8px',
          },
        },
      }}
    >
      <PaymentFormInner
        onSuccess={onSuccess}
        onCancel={onCancel}
        submitLabel={submitLabel}
      />
    </Elements>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: spacing.md },
  paymentElementWrap: {
    width: '100%',
    minHeight: 320,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    ...typography.body,
    color: colors.mutedForeground,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  configError: {
    ...typography.bodySmall,
    color: colors.destructive,
    marginBottom: spacing.lg,
  },
  error: {
    ...typography.bodySmall,
    color: colors.destructive,
    marginBottom: spacing.lg,
  },
  actions: { gap: spacing.md },
  button: { marginBottom: spacing.md },
  cancel: { alignSelf: 'center', marginBottom: spacing.xl },
  cancelText: { ...typography.body, color: colors.primary },
});
