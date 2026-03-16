import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';

const categoryConfig: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; text: string }
> = {
  stavba: { label: 'Stavba', icon: 'construct-outline', bg: '#fff7ed', text: '#c2410c' },
  domacnost: { label: 'Domácnosť', icon: 'home-outline', bg: '#eff6ff', text: '#1d4ed8' },
  zahrada: { label: 'Záhrada', icon: 'leaf-outline', bg: '#f0fdf4', text: '#15803d' },
  stahovanie: { label: 'Sťahovanie', icon: 'car-outline', bg: '#f5f3ff', text: '#6d28d9' },
  sklad: { label: 'Sklad', icon: 'cube-outline', bg: '#fffbeb', text: '#b45309' },
  eventy: { label: 'Eventy', icon: 'musical-notes-outline', bg: '#fdf4ff', text: '#a21caf' },
  starostlivost: { label: 'Starostlivosť', icon: 'heart-outline', bg: '#fdf2f8', text: '#be185d' },
  gastro: { label: 'Gastro', icon: 'restaurant-outline', bg: '#ecfdf5', text: '#047857' },
  auto: { label: 'Auto', icon: 'car-sport-outline', bg: '#ecfeff', text: '#0e7490' },
  ine: { label: 'Iné', icon: 'ellipsis-horizontal', bg: '#f9fafb', text: '#4b5563' },
};

export function getCategoryLabel(category: string): string {
  return categoryConfig[category]?.label ?? category;
}

export function getCategoryConfig(category: string) {
  return categoryConfig[category] ?? categoryConfig.ine;
}

type CategoryBadgeProps = {
  category: string;
  size?: 'sm' | 'md';
};

export function CategoryBadge({ category, size = 'sm' }: CategoryBadgeProps) {
  const config = getCategoryConfig(category);
  return (
    <View
      style={[
        styles.badge,
        size === 'md' && styles.badgeMd,
        { backgroundColor: config.bg },
      ]}
    >
      <Ionicons
        name={config.icon}
        size={size === 'sm' ? 12 : 16}
        color={config.text}
      />
      <Text style={[styles.text, { color: config.text }, size === 'md' && styles.textMd]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.lg,
  },
  badgeMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  text: {
    ...typography.captionSmall,
    fontWeight: '600',
  },
  textMd: { ...typography.caption },
});
