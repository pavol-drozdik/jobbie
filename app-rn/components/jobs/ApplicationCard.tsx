import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '../ui';
import { colors, spacing, typography } from '../../constants/theme';

export type ApplicationCardItem = {
  id: string;
  job_id: string;
  job_title?: string;
  status: string;
};

type ApplicationCardProps = {
  application: ApplicationCardItem;
  onPress: () => void;
};

export function ApplicationCard({ application, onPress }: ApplicationCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Card style={styles.card}>
        <Text style={styles.title} numberOfLines={2}>
          {application.job_title || `Ponuka ${application.job_id.slice(0, 8)}...`}
        </Text>
        <Text style={styles.status}>Stav: {application.status}</Text>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  title: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.foreground,
  },
  status: {
    ...typography.caption,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
});
