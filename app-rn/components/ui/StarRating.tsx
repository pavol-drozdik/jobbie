import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../../constants/theme';

type StarRatingProps = {
  rating?: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (value: number) => void;
};

const sizeMap = { sm: 14, md: 20, lg: 24 };

export function StarRating({
  rating = 0,
  maxStars = 5,
  size = 'sm',
  interactive = false,
  onChange,
}: StarRatingProps) {
  const [pressed, setPressed] = React.useState(0);
  const s = sizeMap[size];

  return (
    <View style={styles.row}>
      {Array.from({ length: maxStars }, (_, i) => {
        const starValue = i + 1;
        const filled = interactive
          ? starValue <= (pressed || Math.round(rating))
          : starValue <= Math.round(rating);
        const star = (
          <TouchableOpacity
            key={i}
            onPressIn={() => interactive && setPressed(starValue)}
            onPressOut={() => interactive && setPressed(0)}
            onPress={() => interactive && onChange?.(starValue)}
            disabled={!interactive}
            style={styles.star}
            hitSlop={4}
          >
            <Ionicons
              name={filled ? 'star' : 'star-outline'}
              size={s}
              color={filled ? colors.accent : colors.border}
            />
          </TouchableOpacity>
        );
        return star;
      })}
      {!interactive && rating > 0 ? (
        <Text style={styles.value}>{rating.toFixed(1)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  star: { padding: 2 },
  value: {
    ...typography.captionSmall,
    color: colors.mutedForeground,
    marginLeft: 4,
    fontWeight: '500',
  },
});
