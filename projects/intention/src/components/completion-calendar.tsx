import { Pressable, StyleSheet, View } from 'react-native';
import { useMemo, useState } from 'react';
import { AppIcon } from './app-icon';
import { AppText } from './app-text';
import {
  formatMonthYear,
  formatArabicNumber,
  isSameMonth,
  moveMonth,
  startOfMonth,
  toLocalDateKey,
} from '@/business/dates';
import { colors, radius, spacing } from '@/theme/theme';

const WEEKDAYS = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

type CalendarDay = {
  key: string;
  day: number;
};

function getDaysInMonth(month: Date): (CalendarDay | null)[] {
  const firstWeekday = month.getDay();
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days: (CalendarDay | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= total; day += 1) {
    days.push({
      day,
      key: toLocalDateKey(new Date(month.getFullYear(), month.getMonth(), day, 12)),
    });
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export function CompletionCalendar({ completionDates }: { completionDates: string[] }) {
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(today));
  const completed = useMemo(() => new Set(completionDates), [completionDates]);
  const days = useMemo(() => getDaysInMonth(visibleMonth), [visibleMonth]);
  const canMoveNext = !isSameMonth(visibleMonth, today);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الشهر السابق"
          hitSlop={10}
          onPress={() => setVisibleMonth((month) => moveMonth(month, -1))}
          style={styles.navButton}>
          <AppIcon name="back" size={19} color={colors.text} />
        </Pressable>
        <AppText style={styles.month}>{formatMonthYear(visibleMonth)}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الشهر التالي"
          accessibilityState={{ disabled: !canMoveNext }}
          disabled={!canMoveNext}
          hitSlop={10}
          onPress={() => setVisibleMonth((month) => moveMonth(month, 1))}
          style={[styles.navButton, !canMoveNext && styles.disabled]}>
          <AppIcon name="chevronRight" size={19} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((weekday, index) => (
          <View key={`${weekday}-${index}`} style={styles.cell}>
            <AppText style={styles.weekday}>{weekday}</AppText>
          </View>
        ))}
        {days.map((item, index) => {
          if (!item) return <View key={`empty-${index}`} style={styles.cell} />;
          const isCompleted = completed.has(item.key);
          const isToday = item.key === todayKey;
          const isFuture = item.key > todayKey;
          return (
            <View
              key={item.key}
              accessibilityLabel={`${item.key}: ${isFuture ? 'يوم قادم' : isCompleted ? 'مكتمل' : 'غير مكتمل'}`}
              style={styles.cell}>
              <View style={[
                styles.day,
                isCompleted && styles.completed,
                isToday && styles.today,
                isFuture && styles.future,
              ]}>
                <AppText style={[
                  styles.dayText,
                  isCompleted && styles.completedText,
                  isFuture && styles.futureText,
                ]}>{formatArabicNumber(item.day)}</AppText>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={[styles.legendDot, styles.completed]} />
        <AppText style={styles.legendText}>مكتمل</AppText>
        <View style={[styles.legendDot, styles.today]} />
        <AppText style={styles.legendText}>اليوم</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { color: colors.text, fontSize: 16, fontWeight: '800' },
  navButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 43, alignItems: 'center', justifyContent: 'center' },
  weekday: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  completed: { backgroundColor: colors.primary },
  completedText: { color: colors.white, fontWeight: '800' },
  today: { borderWidth: 2, borderColor: colors.accent },
  future: { backgroundColor: colors.surfaceMuted },
  futureText: { color: colors.textMuted },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: colors.textSecondary, fontSize: 12, marginRight: spacing.sm },
});
