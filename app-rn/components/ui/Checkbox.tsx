import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';

type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Checkbox({
  checked,
  onCheckedChange,
  disabled = false,
  style,
}: CheckboxProps) {
  return (
    <TouchableOpacity
      onPress={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.box,
        checked && styles.checked,
        disabled && styles.disabled,
        style,
      ]}
    >
      {checked ? (
        <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.primary },
  disabled: { opacity: 0.5 },
});
