import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';

type InputProps = TextInputProps & {
  error?: boolean;
};

export function Input({ style, error, ...props }: InputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.mutedForeground}
      style={[styles.input, error && styles.inputError, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.foreground,
  },
  inputError: {
    borderColor: colors.destructive,
  },
});
