import React from 'react';
import { Switch as RNSwitch, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../constants/theme';

type SwitchProps = React.ComponentProps<typeof RNSwitch>;

export function Switch({ ...props }: SwitchProps) {
  return (
    <RNSwitch
      trackColor={{ false: colors.border, true: colors.primaryLight }}
      thumbColor={props.value ? colors.primary : colors.mutedForeground}
      {...props}
    />
  );
}
