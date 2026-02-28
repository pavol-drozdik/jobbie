import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from './useToast';
import { colors, radius, spacing, typography } from '../../constants/theme';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((t) => (
        <View
          key={t.id}
          style={[
            styles.toast,
            t.variant === 'destructive' && styles.toastDestructive,
          ]}
        >
          <View style={styles.content}>
            {t.title ? (
              <Text style={styles.title}>{t.title}</Text>
            ) : null}
            {t.description ? (
              <Text style={styles.description}>{t.description}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => dismiss(t.id)}
            style={styles.close}
            hitSlop={8}
          >
            <Ionicons name="close" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.xl + 40,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 1000,
    gap: spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  toastDestructive: {
    borderColor: colors.destructive,
    backgroundColor: '#fef2f2',
  },
  content: { flex: 1 },
  title: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.foreground,
  },
  description: {
    ...typography.caption,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  close: { padding: 4 },
});
