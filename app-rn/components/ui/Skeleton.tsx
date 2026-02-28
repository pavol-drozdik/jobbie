import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors, radius } from '../../constants/theme';

type SkeletonProps = {
  style?: ViewStyle;
};

export function Skeleton({ style }: SkeletonProps) {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.skeleton, { opacity }, style]} />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    opacity: 0.1,
  },
});
