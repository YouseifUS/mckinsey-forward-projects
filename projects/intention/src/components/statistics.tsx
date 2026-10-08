import { StyleSheet, View } from 'react-native';
import { AppIcon, type AppIconName } from './app-icon';
import { AppText } from './app-text';
import type { HabitStatistics } from '@/types/habit';
import { colors, radius, spacing } from '@/theme/theme';
import { formatArabicNumber } from '@/business/dates';

type StatProps = {
  icon: AppIconName;
  label: string;
  value: number;
  suffix?: string;
};

function Stat({ icon, label, value, suffix }: StatProps) {
  return (
    <View style={styles.stat} accessibilityLabel={`${label}: ${formatArabicNumber(value)}${suffix ? ` ${suffix}` : ''}`}>
      <AppIcon name={icon} size={18} color={colors.primary} />
      <AppText style={styles.value}>
        {formatArabicNumber(value)}<AppText style={styles.suffix}>{suffix ? ` ${suffix}` : ''}</AppText>
      </AppText>
      <AppText style={styles.label}>{label}</AppText>
    </View>
  );
}

export function Statistics({ statistics }: { statistics: HabitStatistics }) {
  return (
    <View style={styles.row}>
      <Stat icon="streak" label="الحالي" value={statistics.currentStreak} suffix="يوم" />
      <Stat icon="spark" label="الأطول" value={statistics.longestStreak} suffix="يوم" />
      <Stat icon="total" label="الإجمالي" value={statistics.totalCompletions} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    minHeight: 104,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  value: { color: colors.text, fontSize: 21, fontWeight: '800' },
  suffix: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
});
