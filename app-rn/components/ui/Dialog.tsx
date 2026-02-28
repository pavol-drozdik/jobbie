import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';

type DialogContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const ctx = React.useContext(DialogContext);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onPress?: () => void }>, {
      onPress: () => ctx?.setOpen(true),
    });
  }
  return (
    <TouchableOpacity onPress={() => ctx?.setOpen(true)} activeOpacity={0.8}>
      {children}
    </TouchableOpacity>
  );
}

export function DialogContent({
  children,
  showClose = true,
}: {
  children: React.ReactNode;
  showClose?: boolean;
}) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) return null;

  return (
    <Modal
      visible={ctx.open}
      transparent
      animationType="fade"
      onRequestClose={() => ctx.setOpen(false)}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => ctx.setOpen(false)}
      >
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          {showClose ? (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => ctx.setOpen(false)}
              hitSlop={12}
            >
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <View style={styles.header}>{children}</View>;
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <Text style={styles.description}>{children}</Text>;
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
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
