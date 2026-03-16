import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button, Select } from '../ui';
import { getCategoryLabel } from '../ui/CategoryBadge';
import { CATEGORIES } from '../../types/job';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { S } from '../../constants/strings';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const JOB_TYPES = [
  { value: 'all', label: S.anyJobType },
  { value: 'full_time', label: 'Plný úväzok' },
  { value: 'part_time', label: 'Skrátený úväzok' },
  { value: 'brigada', label: 'Brigáda' },
];

const SORT_OPTIONS = [
  { value: 'date_desc', label: S.sortNewestFirst },
  { value: 'date_asc', label: S.sortOldestFirst },
  { value: 'wage_desc', label: S.sortHighestPay },
];

export type JobFiltersState = {
  search: string;
  category: string;
  job_type: string;
  sort_by: string;
  min_hourly_wage: string;
  urgent_only: boolean;
};

const defaultFilters: JobFiltersState = {
  search: '',
  category: 'all',
  job_type: 'all',
  sort_by: 'date_desc',
  min_hourly_wage: '',
  urgent_only: false,
};

type JobFiltersProps = {
  filters: JobFiltersState;
  onFiltersChange: (f: JobFiltersState) => void;
};

export function JobFilters({ filters, onFiltersChange }: JobFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (key: keyof JobFiltersState, value: string | boolean) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onFiltersChange(defaultFilters);
  };

  const hasActive =
    filters.category !== 'all' ||
    filters.job_type !== 'all' ||
    filters.sort_by !== 'date_desc' ||
    !!filters.min_hourly_wage ||
    filters.urgent_only;

  const activeCount = [
    filters.category !== 'all',
    filters.job_type !== 'all',
    filters.sort_by !== 'date_desc',
    !!filters.min_hourly_wage,
    filters.urgent_only,
  ].filter(Boolean).length;

  const categoryOptions = [
    { value: 'all', label: S.allCategories },
    ...CATEGORIES.map((c) => ({ value: c, label: getCategoryLabel(c) })),
  ];

  const toggleAdvanced = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAdvanced((v) => !v);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons
            name="search"
            size={18}
            color={colors.mutedForeground}
            style={styles.searchIcon}
          />
          <Input
            style={styles.searchInput}
            placeholder={S.searchWorkPlaceholder}
            value={filters.search}
            onChangeText={(v) => update('search', v)}
          />
        </View>
        <TouchableOpacity
          onPress={toggleAdvanced}
          style={[styles.filterBtn, showAdvanced && styles.filterBtnActive]}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={showAdvanced ? colors.primary : colors.mutedForeground}
          />
          {activeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {showAdvanced && (
        <View style={styles.advanced}>
          <View style={styles.row}>
            <Select
              value={filters.category}
              onValueChange={(v) => update('category', v)}
              options={categoryOptions}
              placeholder={S.filterCategory}
            />
            <Select
              value={filters.job_type}
              onValueChange={(v) => update('job_type', v)}
              options={JOB_TYPES}
              placeholder={S.filterJobType}
            />
          </View>
          <View style={styles.row}>
            <Select
              value={filters.sort_by}
              onValueChange={(v) => update('sort_by', v)}
              options={SORT_OPTIONS}
              placeholder={S.filterSort}
            />
            <Input
              style={styles.minWageInput}
              placeholder={S.minPerHour}
              value={filters.min_hourly_wage}
              onChangeText={(v) => update('min_hourly_wage', v)}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.row}>
            <Button
              variant={filters.urgent_only ? 'default' : 'outline'}
              onPress={() => update('urgent_only', !filters.urgent_only)}
              style={
                filters.urgent_only
                  ? styles.urgentBtn
                  : undefined
              }
            >
              {S.urgentOnly}
            </Button>
            {hasActive && (
              <TouchableOpacity
                onPress={clearFilters}
                style={styles.clearBtn}
              >
                <Ionicons name="close" size={16} color={colors.mutedForeground} />
                <Text style={styles.clearText}>{S.clearFilters}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export const defaultJobFilters = defaultFilters;

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchWrap: {
    flex: 1,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.md,
    top: 13,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: 40,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.gray50,
    borderColor: colors.gray100,
    borderWidth: 1,
    fontSize: 14,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnInner: { position: 'relative' },
  filterBtnActive: {
    backgroundColor: colors.primaryLight,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  advanced: {
    gap: 12,
    paddingTop: 4,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  minWageInput: {
    width: 112,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.gray50,
    borderColor: colors.gray100,
    fontSize: 12,
  },
  urgentBtn: {
    backgroundColor: colors.destructive,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  clearText: {
    fontSize: 12,
    color: colors.gray500,
  },
});
