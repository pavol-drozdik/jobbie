import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui';
import { colors, radius, spacing, typography } from '../../constants/theme';

export type PlanCardPlan = {
  id: string;
  name: string;
  name_sk?: string;
  price?: number;
  price_monthly_cents?: number;
  features?: string[];
  highlight?: boolean;
  bestValue?: boolean;
  popularLabel?: string;
  bestValueLabel?: string;
  badge?: string;
  badgeColor?: string;
  color?: 'indigo' | 'violet' | 'amber';
};

type PlanCardProps = {
  plan: PlanCardPlan;
  isCurrentPlan?: boolean;
  onChoose: (planId: string) => void;
  loading?: boolean;
};

export function PlanCard({
  plan,
  isCurrentPlan = false,
  onChoose,
  loading = false,
}: PlanCardProps) {
  const name = plan.name_sk ?? plan.name;
  const price =
    plan.price != null
      ? plan.price
      : (plan.price_monthly_cents ?? 0) / 100;
  const features = plan.features ?? [];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.planName}>{name}</Text>
        {isCurrentPlan ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>AKTÍVNY</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.price}>€{price.toFixed(2)}</Text>
        <Text style={styles.priceUnit}> / mesiac</Text>
      </View>
      {features.length > 0 ? (
        <View style={styles.features}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Button
        onPress={() => onChoose(plan.id)}
        disabled={loading || isCurrentPlan}
        style={styles.cta}
      >
        {isCurrentPlan ? 'Váš aktuálny plán' : 'Zvoliť plán'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  planName: {
    ...typography.title,
    color: colors.foreground,
    flex: 1,
  },
  badge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  priceRow: { marginBottom: spacing.lg },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  priceUnit: {
    ...typography.bodySmall,
    color: colors.mutedForeground,
  },
  features: { marginBottom: spacing.lg, gap: spacing.sm },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.bodySmall,
    color: colors.foreground,
    flex: 1,
  },
  cta: {},
});
