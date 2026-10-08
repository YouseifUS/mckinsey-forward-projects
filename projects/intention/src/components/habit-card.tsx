import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppIcon } from './app-icon';
import { CompletionButton } from './completion-button';
import { AppText } from './app-text';
import type { HabitSummary } from '@/types/habit';
import { colors, radius, shadows, spacing } from '@/theme/theme';
import { formatArabicNumber } from '@/business/dates';

type Props = {
  habit: HabitSummary;
  onToggle: () => Promise<void>;
  onError: (message: string) => void;
};

export function HabitCard({ habit, onToggle, onError }: Props) {
  const openDetails = () => router.push({ pathname: '/habit/[id]', params: { id: habit.id } });
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`عرض تفاصيل عادة ${habit.name}`}
        onPress={openDetails}
        style={({ pressed }) => [styles.top, pressed && styles.pressed]}>
        <View style={styles.heading}>
          <AppText style={styles.name}>{habit.name}</AppText>
          <AppIcon name="chevronRight" size={21} color={colors.textMuted} />
        </View>
        <AppText style={styles.intention}>«{habit.intention}»</AppText>
      </Pressable>

      <View style={styles.metrics}>
        <AppText style={styles.metric}><AppText style={styles.metricValue}>{formatArabicNumber(habit.currentStreak)}</AppText> حالي</AppText>
        <View style={styles.dot} />
        <AppText style={styles.metric}><AppText style={styles.metricValue}>{formatArabicNumber(habit.longestStreak)}</AppText> الأطول</AppText>
        <View style={styles.dot} />
        <AppText style={styles.metric}><AppText style={styles.metricValue}>{formatArabicNumber(habit.totalCompletions)}</AppText> إجمالي</AppText>
      </View>

      <CompletionButton
        compact
        completed={habit.completedToday}
        onToggle={onToggle}
        onError={onError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  top: { gap: spacing.sm },
  pressed: { opacity: 0.72 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: colors.text, fontSize: 14, fontWeight: '800' },
  intention: { color: colors.primaryDark, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  metrics: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  metric: { color: colors.textSecondary, fontSize: 12 },
  metricValue: { color: colors.text, fontWeight: '800' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted },
});
