import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography } from '../../constants/theme';

type AvatarProps = {
  source?: { uri: string } | number;
  fallback?: string; // e.g. initials "JD"
  size?: number;
  style?: ViewStyle;
};

export function Avatar({
  source,
  fallback,
  size = 40,
  style,
}: AvatarProps) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const showImage = source && !imgFailed;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={typeof source === 'number' ? source : source}
          style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <Text
            style={[
              styles.fallbackText,
              { fontSize: size * 0.4 },
            ]}
            numberOfLines={1}
          >
            {fallback?.slice(0, 2).toUpperCase() || '?'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    overflow: 'hidden',
    backgroundColor: colors.muted,
  },
  img: {},
  fallback: {
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: colors.mutedForeground,
    fontWeight: '600',
  },
});
