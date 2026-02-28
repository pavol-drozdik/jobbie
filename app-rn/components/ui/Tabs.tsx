import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';

type TabsContextValue = {
  value: string;
  onValueChange: (v: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
};

export function Tabs({ value, onValueChange, children }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      {children}
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.list, style]}>{children}</View>;
}

type TabsTriggerProps = {
  value: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function TabsTrigger({ value, children, style }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext);
  const active = ctx?.value === value;
  return (
    <TouchableOpacity
      onPress={() => ctx?.onValueChange(value)}
      style={[styles.trigger, active && styles.triggerActive, style]}
    >
      <Text style={[styles.triggerText, active && styles.triggerTextActive]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

export function TabsContent({
  value,
  children,
  style,
}: {
  value: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const ctx = React.useContext(TabsContext);
  if (ctx?.value !== value) return null;
  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    height: 36,
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: 2,
    gap: 2,
  },
  trigger: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  triggerActive: {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  triggerText: {
    ...typography.bodySmall,
    color: colors.mutedForeground,
  },
  triggerTextActive: {
    color: colors.foreground,
    fontWeight: '600',
  },
});
