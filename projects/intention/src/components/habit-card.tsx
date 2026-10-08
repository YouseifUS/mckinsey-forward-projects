import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppIcon } from './app-icon';
import { CompletionButton } from './completion-button';
import { AppText } from './app-text';
import type { HabitSummary } from '@/types/habit';
import { colors, fonts, radius, shadows, spacing } from '@/theme/theme';
import { formatArabicNumber } from '@/business/dates';

type Props = {
  habit: HabitSummary;
  onToggle: () => Promise<void>;
  onError: (message: string) => void;
};

export function HabitCard({ habit, onToggle, onError }: Props) {
  const openDetails = () => router.push({ pathname: '/habit/[id]', params: { id: habit.id } });
  return (
    <View style={[styles.card, habit.completedToday && styles.cardCompleted]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`عرض تفاصيل عادة ${habit.name}`}
        onPress={openDetails}
        style={({ pressed }) => [styles.top, pressed && styles.pressed]}>
        <View style={styles.heading}>
          <View style={styles.nameArea}>
            <View style={[styles.seedDot, habit.completedToday && styles.seedDotCompleted]} />
            <AppText style={styles.name}>{habit.name}</AppText>
          </View>
          <AppIcon name="chevronRight" size={21} color={colors.textMuted} />
        </View>
        <AppText style={styles.intentionLabel}>نيّتك</AppText>
        <AppText style={styles.intention}>{habit.intention}</AppText>
      </Pressable>

      <View style={styles.metrics}>
        <AppText style={styles.metric}><AppText style={styles.metricValue}>{formatArabicNumber(habit.currentStreak)}</AppText> {habit.currentStreak >= 3 && habit.currentStreak <= 10 ? 'أيام متتابعة' : 'يوم متتابع'}</AppText>
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
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardCompleted: { borderColor: '#B6C8B5', backgroundColor: '#F6F8F0' },
  top: { gap: spacing.sm },
  pressed: { opacity: 0.72 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  seedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  seedDotCompleted: { backgroundColor: colors.success },
  name: { flexShrink: 1, color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '800' },
  intentionLabel: { color: colors.primary, fontSize: 11, lineHeight: 17, marginTop: 4 },
  intention: { color: colors.text, fontFamily: fonts.display, fontSize: 24, lineHeight: 36 },
  metrics: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  metric: { color: colors.textSecondary, fontSize: 12 },
  metricValue: { color: colors.text, fontWeight: '800' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted },
});
