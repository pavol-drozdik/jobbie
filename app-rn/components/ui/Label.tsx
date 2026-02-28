import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

type LabelProps = {
  children: React.ReactNode;
  style?: TextStyle;
  optional?: boolean;
};

export function Label({ children, style, optional }: LabelProps) {
  return (
    <Text style={[styles.label, style]}>
      {children}
      {optional ? (
        <Text style={styles.optional}> (voliteľné)</Text>
      ) : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.bodySmall,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  optional: {
    color: colors.mutedForeground,
  },
});
