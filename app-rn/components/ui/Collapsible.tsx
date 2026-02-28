import React from 'react';
import { View, TouchableOpacity, LayoutAnimation, StyleSheet } from 'react-native';
import { colors, spacing } from '../../constants/theme';

type CollapsibleContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

type CollapsibleProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function Collapsible({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  children,
}: CollapsibleProps) {
  const [internalOpen, setInternal] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternal(v);
    onOpenChange?.(v);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };
  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      {children}
    </CollapsibleContext.Provider>
  );
}

export function CollapsibleTrigger({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(CollapsibleContext);
  return (
    <TouchableOpacity onPress={() => ctx?.setOpen(!ctx.open)} activeOpacity={0.8}>
      {children}
    </TouchableOpacity>
  );
}

export function CollapsibleContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx?.open) return null;
  return <View style={styles.content}>{children}</View>;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.sm },
});
