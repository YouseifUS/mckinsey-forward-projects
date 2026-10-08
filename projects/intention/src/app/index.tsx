import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/screen';
import { AppIcon } from '@/components/app-icon';
import { HabitCard } from '@/components/habit-card';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState, LoadingState } from '@/components/states';
import { useHabits } from '@/hooks/use-habits';
import { useDatabase } from '@/database/use-database';
import { completeHabit, undoCompletion } from '@/database/habit-repository';
import { colors, radius, shadows, spacing } from '@/theme/theme';
import { formatFriendlyDate } from '@/business/dates';

export default function HomeScreen() {
  const db = useDatabase();
  const { habits, loading, error, reload } = useHabits(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const toggleHabit = async (id: string, completed: boolean) => {
    setNotice(null);
    if (completed) await undoCompletion(db, id);
    else await completeHabit(db, id);
    await reload();
  };

  return (
    <Screen includeBottomInset={false}>
      <View style={styles.header}>
        <View>
          <AppText style={styles.eyebrow}>{formatFriendlyDate()}</AppText>
          <AppText style={styles.title}>نواياك</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="عرض العادات المؤرشفة"
          onPress={() => router.push('/archived')}
          style={({ pressed }) => [styles.archiveButton, pressed && styles.pressed]}>
          <AppIcon name="archive" size={23} color={colors.primaryDark} />
        </Pressable>
      </View>

      {notice ? <AppText accessibilityLiveRegion="polite" style={styles.notice}>{notice}</AppText> : null}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : habits.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <AppIcon name="spark" size={38} color={colors.primary} />
          </View>
          <AppText style={styles.emptyTitle}>ابدأ بالشخص اللي ناوي تكونه</AppText>
          <AppText style={styles.emptyMessage}>
            أنشئ عادة مبنية على نية مهمة بالنسبالك. الأفعال الصغيرة ممكن تتحول بالتدريج لجزء حقيقي من شخصيتك.
          </AppText>
          <AppButton label="أنشئ أول عادة" onPress={() => router.push('/create')} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}>
          <View style={styles.prompt}>
            <AppText style={styles.promptLabel}>تذكير بسيط</AppText>
            <AppText style={styles.promptText}>الاستمرارية بتكبر مع تكرار الفعل، مش مع الأيام المثالية.</AppText>
          </View>
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onToggle={() => toggleHabit(habit.id, habit.completedToday)}
              onError={setNotice}
            />
          ))}
          <View style={styles.bottomSpace} />
        </ScrollView>
      )}

      {habits.length > 0 && !loading && !error ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إنشاء عادة"
          onPress={() => router.push('/create')}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
          <AppIcon name="add" color={colors.white} size={28} />
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 3 },
  title: { color: colors.text, fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.7 },
  archiveButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  pressed: { opacity: 0.65 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  prompt: { backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  promptLabel: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  promptText: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  notice: { marginHorizontal: spacing.lg, color: colors.danger, fontSize: 13, textAlign: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyTitle: { color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: '800', textAlign: 'center' },
  emptyMessage: { color: colors.textSecondary, fontSize: 15, lineHeight: 23, textAlign: 'center', marginBottom: spacing.sm },
  fab: {
    position: 'absolute',
    left: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 8,
  },
  fabPressed: { transform: [{ scale: 0.94 }] },
  bottomSpace: { height: 96 },
});
