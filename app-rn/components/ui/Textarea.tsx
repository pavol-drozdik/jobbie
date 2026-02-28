import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';

type TextareaProps = TextInputProps & {
  error?: boolean;
};

export function Textarea({ style, error, ...props }: TextareaProps) {
  return (
    <TextInput
      placeholderTextColor={colors.mutedForeground}
      style={[styles.textarea, error && styles.error]}
      multiline
      textAlignVertical="top"
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  textarea: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.foreground,
  },
  error: { borderColor: colors.destructive },
});
