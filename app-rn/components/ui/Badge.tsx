import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'accent' | 'outline';

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

const variantStyles: Record<BadgeVariant, { container: ViewStyle; text: TextStyle }> = {
  default: {
    container: { backgroundColor: colors.primary },
    text: { color: colors.primaryForeground },
  },
  secondary: {
    container: { backgroundColor: colors.secondary },
    text: { color: colors.secondaryForeground },
  },
  destructive: {
    container: { backgroundColor: colors.destructive },
    text: { color: colors.destructiveForeground },
  },
  accent: {
    container: { backgroundColor: colors.accent },
    text: { color: colors.accentForeground },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: { color: colors.foreground },
  },
};

export function Badge({
  children,
  variant = 'default',
  style,
  textStyle,
}: BadgeProps) {
  const v = variantStyles[variant];
  return (
    <View style={[styles.badge, v.container, style]}>
      <Text style={[styles.text, v.text, textStyle]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.captionSmall,
    fontWeight: '600',
  },
});
