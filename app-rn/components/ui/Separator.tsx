import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

type SeparatorProps = {
  orientation?: 'horizontal' | 'vertical';
};

export function Separator({ orientation = 'horizontal' }: SeparatorProps) {
  return (
    <View
      style={[
        styles.separator,
        orientation === 'vertical' ? styles.vertical : styles.horizontal,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  separator: { backgroundColor: colors.border },
  horizontal: { height: 1, width: '100%' },
  vertical: { width: 1, flex: 1 },
});
