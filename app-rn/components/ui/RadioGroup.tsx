import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';

type RadioGroupContextValue = {
  value: string;
  onValueChange: (v: string) => void;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

type RadioGroupProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function RadioGroup({ value, onValueChange, children, style }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <View style={[styles.group, style]}>{children}</View>
    </RadioGroupContext.Provider>
  );
}

type RadioGroupItemProps = {
  value: string;
  label?: string;
  disabled?: boolean;
};

export function RadioGroupItem({ value, label, disabled = false }: RadioGroupItemProps) {
  const ctx = React.useContext(RadioGroupContext);
  const checked = ctx?.value === value;
  return (
    <TouchableOpacity
      onPress={() => !disabled && ctx?.onValueChange(value)}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.row, disabled && styles.disabled]}
    >
      <View style={[styles.circle, checked && styles.circleChecked]}>
        {checked ? (
          <Ionicons name="ellipse" size={10} color={colors.primary} />
        ) : null}
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  disabled: { opacity: 0.5 },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleChecked: {},
  label: { ...typography.bodySmall, color: colors.foreground },
});
