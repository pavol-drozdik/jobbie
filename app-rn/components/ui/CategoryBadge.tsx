import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';

const categoryConfig: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; text: string }
> = {
  construction: { label: 'Stavba', icon: 'construct-outline', bg: '#fff7ed', text: '#c2410c' },
  moving: { label: 'Sťahovanie', icon: 'car-outline', bg: '#eff6ff', text: '#1d4ed8' },
  cleaning: { label: 'Upratovanie', icon: 'sparkles-outline', bg: '#ecfdf5', text: '#047857' },
  babysitting: { label: 'Opatrovanie', icon: 'heart-outline', bg: '#fdf2f8', text: '#be185d' },
  gardening: { label: 'Záhrada', icon: 'leaf-outline', bg: '#f0fdf4', text: '#15803d' },
  delivery: { label: 'Doručovanie', icon: 'cube-outline', bg: '#f5f3ff', text: '#6d28d9' },
  warehouse: { label: 'Sklad', icon: 'cube-outline', bg: '#fffbeb', text: '#b45309' },
  events: { label: 'Eventy', icon: 'musical-notes-outline', bg: '#fdf4ff', text: '#a21caf' },
  painting: { label: 'Maľovanie', icon: 'brush-outline', bg: '#ecfeff', text: '#0e7490' },
  other: { label: 'Iné', icon: 'ellipsis-horizontal', bg: '#f9fafb', text: '#4b5563' },
};

export function getCategoryLabel(category: string): string {
  return categoryConfig[category]?.label ?? category;
}

export function getCategoryConfig(category: string) {
  return categoryConfig[category] ?? categoryConfig.other;
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
