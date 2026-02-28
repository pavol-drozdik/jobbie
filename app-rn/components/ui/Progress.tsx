import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '../../constants/theme';

type ProgressProps = {
  value?: number; // 0..100
  style?: ViewStyle;
};

export function Progress({ value = 0, style }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <View style={[styles.track, style]}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    width: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
});
