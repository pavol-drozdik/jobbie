import React from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  ViewStyle,
} from 'react-native';
import { colors, radius } from '../../constants/theme';

type SliderProps = {
  value?: number; // 0..1
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Slider({
  value = 0,
  onValueChange,
  min = 0,
  max = 1,
  step,
  disabled = false,
  style,
}: SliderProps) {
  const [width, setWidth] = React.useState(0);
  const norm = (v: number) => (v - min) / (max - min || 1);
  const denorm = (n: number) => min + n * (max - min);
  const clamped = Math.min(1, Math.max(0, norm(value)));
  const stepNorm = step != null ? step / (max - min) : undefined;

  const pan = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (_, g) => {
        if (width <= 0) return;
        let n = g.moveX / width;
        if (stepNorm != null) n = Math.round(n / stepNorm) * stepNorm;
        n = Math.min(1, Math.max(0, n));
        onValueChange?.(denorm(n));
      },
      onPanResponderMove: (_, g) => {
        if (width <= 0) return;
        let n = g.moveX / width;
        if (stepNorm != null) n = Math.round(n / stepNorm) * stepNorm;
        n = Math.min(1, Math.max(0, n));
        onValueChange?.(denorm(n));
      },
    })
  ).current;

  return (
    <View
      style={[styles.track, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
      <View
        style={[
          styles.thumb,
          { left: `${clamped * 100}%`, marginLeft: -8 },
          disabled && styles.thumbDisabled,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    width: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    top: -5,
  },
  thumbDisabled: { opacity: 0.5 },
});
