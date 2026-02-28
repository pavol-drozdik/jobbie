import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';

type AlertVariant = 'default' | 'destructive';

type AlertProps = {
  variant?: AlertVariant;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Alert({
  variant = 'default',
  children,
  style,
}: AlertProps) {
  return (
    <View
      style={[
        styles.alert,
        variant === 'destructive' && styles.destructive,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function AlertTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function AlertDescription({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[styles.description, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  alert: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  destructive: {
    borderColor: colors.destructive,
  },
  title: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginBottom: spacing.xs,
    color: colors.foreground,
  },
  description: {
    ...typography.bodySmall,
    color: colors.mutedForeground,
  },
});
