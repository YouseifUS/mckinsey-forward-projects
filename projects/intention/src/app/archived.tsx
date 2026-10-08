import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/screen';
import { PageHeader } from '@/components/page-header';
import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { ErrorState, LoadingState } from '@/components/states';
import { useHabits } from '@/hooks/use-habits';
import { colors, fonts, radius, spacing } from '@/theme/theme';
import { formatArabicNumber } from '@/business/dates';

export default function ArchivedHabitsScreen() {
  const { habits, loading, error, reload } = useHabits(true);

  return (
    <Screen>
      <PageHeader title="العادات المؤرشفة" subtitle="سجلك محفوظ بأمان" />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : habits.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <AppIcon name="archive" size={32} color={colors.primary} />
          </View>
          <AppText style={styles.emptyTitle}>مفيش عادات مؤرشفة</AppText>
          <AppText style={styles.emptyMessage}>أي عادة توقفها هتظهر هنا وسجل إكمالها هيفضل محفوظ.</AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <AppText style={styles.intro}>العادات المؤرشفة مش هتظهر في يومك، لكن المعنى اللي بتمثّله لسه جزء منك.</AppText>
          {habits.map((habit) => (
            <Pressable
              key={habit.id}
              accessibilityRole="button"
              accessibilityLabel={`عرض العادة المؤرشفة ${habit.name}`}
              onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              <View style={styles.cardTop}>
                <View style={styles.cardIcon}>
                  <AppIcon name="archive" size={19} color={colors.primary} />
                </View>
                <AppText style={styles.name}>{habit.name}</AppText>
                <AppIcon name="chevronRight" size={19} color={colors.textMuted} />
              </View>
              <AppText style={styles.intention}>«{habit.intention}»</AppText>
              <AppText style={styles.stats}>{formatArabicNumber(habit.totalCompletions)} إجمالي الإكمال · {formatArabicNumber(habit.longestStreak)} يوم أطول استمرارية</AppText>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  intro: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '800' },
  intention: { color: colors.primaryDark, fontFamily: fonts.display, fontSize: 25, lineHeight: 38 },
  stats: { color: colors.textMuted, fontSize: 12 },
  pressed: { opacity: 0.7 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  emptyMessage: { color: colors.textSecondary, fontSize: 15, lineHeight: 23, textAlign: 'center' },
});
