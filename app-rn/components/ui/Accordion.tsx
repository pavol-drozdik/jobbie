import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../constants/theme';

type AccordionContextValue = {
  value: string | null;
  onValueChange: (v: string | null) => void;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

type AccordionProps = {
  type?: 'single' | 'multiple';
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  children: React.ReactNode;
};

export function Accordion({
  type = 'single',
  value,
  onValueChange,
  children,
}: AccordionProps) {
  const [internalValue, setInternal] = React.useState<string | null>(null);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internalValue;
  const setValue = (v: string | null) => {
    if (!isControlled) setInternal(v);
    onValueChange?.(v);
  };
  return (
    <AccordionContext.Provider value={{ value: current ?? null, onValueChange: setValue }}>
      {children}
    </AccordionContext.Provider>
  );
}

const AccordionItemValueContext = React.createContext<string>('');

export function AccordionItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItemValueContext.Provider value={value}>
      <View style={styles.item}>{children}</View>
    </AccordionItemValueContext.Provider>
  );
}

function AccordionTriggerImpl({ children }: { children: React.ReactNode }) {
  const itemValue = React.useContext(AccordionItemValueContext);
  const ctx = React.useContext(AccordionContext);
  const open = ctx?.value === itemValue;
  const onPress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    ctx?.onValueChange(open ? null : itemValue);
  };
  return (
    <TouchableOpacity style={styles.trigger} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.triggerText}>{children}</Text>
      <Ionicons
        name={open ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={colors.mutedForeground}
      />
    </TouchableOpacity>
  );
}

export const AccordionTrigger = AccordionTriggerImpl;

export function AccordionContent({ children }: { children: React.ReactNode }) {
  const itemValue = React.useContext(AccordionItemValueContext);
  const ctx = React.useContext(AccordionContext);
  if (ctx?.value !== itemValue) return null;
  return <View style={styles.content}>{children}</View>;
}

const styles = StyleSheet.create({
  item: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: 0,
  },
  triggerText: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.foreground,
  },
  content: {
    paddingBottom: spacing.lg,
    paddingTop: 0,
  },
});
