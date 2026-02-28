import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg';

type ButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  default: {
    container: { backgroundColor: colors.primary },
    text: { color: colors.primaryForeground },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.input,
    },
    text: { color: colors.foreground },
  },
  secondary: {
    container: { backgroundColor: colors.secondary },
    text: { color: colors.secondaryForeground },
  },
  destructive: {
    container: { backgroundColor: colors.destructive },
    text: { color: colors.destructiveForeground },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.foreground },
  },
  link: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.primary },
  },
};

const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  default: {
    container: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    text: { ...typography.body, fontWeight: '600' },
  },
  sm: {
    container: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    text: { fontSize: 12, fontWeight: '600' },
  },
  lg: {
    container: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
    text: { ...typography.body, fontSize: 18, fontWeight: '600' },
  },
};

export function Button({
  onPress,
  children,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        v.container,
        s.container,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={v.text.color === colors.primaryForeground ? '#fff' : colors.primary}
        />
      ) : (
        <Text style={[styles.text, v.text, s.text, textStyle]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    minHeight: 40,
  },
  text: {},
  disabled: { opacity: 0.6 },
});
