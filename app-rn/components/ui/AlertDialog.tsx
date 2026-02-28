import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { Button } from './Button';

type AlertDialogContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

type AlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  return (
    <AlertDialogContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(AlertDialogContext);
  if (!ctx) return null;

  return (
    <Modal
      visible={ctx.open}
      transparent
      animationType="fade"
      onRequestClose={() => ctx.setOpen(false)}
    >
      <Pressable style={styles.overlay} onPress={() => ctx.setOpen(false)}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function AlertDialogHeader({ children }: { children: React.ReactNode }) {
  return <View style={styles.header}>{children}</View>;
}

export function AlertDialogFooter({ children }: { children: React.ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

export function AlertDialogTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function AlertDialogDescription({ children }: { children: React.ReactNode }) {
  return <Text style={styles.description}>{children}</Text>;
}

export function AlertDialogAction({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  const ctx = React.useContext(AlertDialogContext);
  const handlePress = () => {
    onPress();
    ctx?.setOpen(false);
  };
  return <Button onPress={handlePress}>{children}</Button>;
}

export function AlertDialogCancel({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = React.useContext(AlertDialogContext);
  return (
    <Button variant="outline" onPress={() => ctx?.setOpen(false)}>
      {children}
    </Button>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  header: { marginBottom: spacing.md },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  title: {
    ...typography.titleLarge,
    color: colors.foreground,
  },
  description: {
    ...typography.bodySmall,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
});
