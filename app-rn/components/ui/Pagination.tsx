import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../constants/theme';

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        onPress={() => canPrev && onPageChange(page - 1)}
        disabled={!canPrev}
        style={[styles.btn, !canPrev && styles.btnDisabled]}
      >
        <Ionicons
          name="chevron-back"
          size={20}
          color={canPrev ? colors.foreground : colors.mutedForeground}
        />
        <Text
          style={[
            styles.btnText,
            !canPrev && styles.btnTextDisabled,
          ]}
        >
          Predchádzajúca
        </Text>
      </TouchableOpacity>
      <Text style={styles.pageText}>
        {page} / {totalPages}
      </Text>
      <TouchableOpacity
        onPress={() => canNext && onPageChange(page + 1)}
        disabled={!canNext}
        style={[styles.btn, !canNext && styles.btnDisabled]}
      >
        <Text
          style={[
            styles.btnText,
            !canNext && styles.btnTextDisabled,
          ]}
        >
          Ďalšia
        </Text>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={canNext ? colors.foreground : colors.mutedForeground}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { ...typography.bodySmall, color: colors.foreground },
  btnTextDisabled: { color: colors.mutedForeground },
  pageText: {
    ...typography.bodySmall,
    color: colors.mutedForeground,
  },
});
