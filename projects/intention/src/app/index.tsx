import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/screen';
import { AppIcon } from '@/components/app-icon';
import { BrandMark } from '@/components/brand-mark';
import { IslamicPattern } from '@/components/islamic-pattern';
import { HabitCard } from '@/components/habit-card';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState, LoadingState } from '@/components/states';
import { useHabits } from '@/hooks/use-habits';
import { useDatabase } from '@/database/use-database';
import { completeHabit, undoCompletion } from '@/database/habit-repository';
import { colors, fonts, radius, spacing } from '@/theme/theme';
import { formatArabicNumber, formatFriendlyDate } from '@/business/dates';

export default function HomeScreen() {
  const db = useDatabase();
  const { habits, loading, error, reload } = useHabits(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const completedCount = habits.filter((habit) => habit.completedToday).length;
  const progress = habits.length ? completedCount / habits.length : 0;
  const habitCountLabel = habits.length === 1 ? 'عادة واحدة' : habits.length === 2 ? 'عادتان' : `${formatArabicNumber(habits.length)} ${habits.length <= 10 ? 'عادات' : 'عادة'}`;

  const refresh = async () => {
    setRefreshing(true);
    try { await reload(); } finally { setRefreshing(false); }
  };

  const toggleHabit = async (id: string, completed: boolean) => {
    setNotice(null);
    if (completed) await undoCompletion(db, id);
    else await completeHabit(db, id);
    await reload();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}><BrandMark size={42} /></View>
          <View>
            <AppText style={styles.title}>نية</AppText>
            <AppText style={styles.tagline}>خيرٌ صغير، وأثرٌ يبقى</AppText>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="عرض العادات المؤرشفة" onPress={() => router.push('/archived')} style={({ pressed }) => [styles.archiveButton, pressed && styles.pressed]}>
          <AppIcon name="archive" size={20} color={colors.primary} />
          <AppText style={styles.archiveLabel}>الأرشيف</AppText>
        </Pressable>
      </View>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={() => void reload()} /> : (
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} colors={[colors.primary]} />} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <IslamicPattern />
            <AppText style={styles.date}>{formatFriendlyDate()}</AppText>
            <AppText style={styles.heroTitle}>{habits.length ? 'جدّد نيتك، وابدأ يومك' : 'كل عمل طيّب يبدأ بنيّة'}</AppText>
            <AppText style={styles.heroMessage}>{habits.length ? 'خطوة صغيرة اليوم، تنمّي فيك خيرًا كل يوم.' : 'اغرس عادة بمعنى، وامنحها قليلًا من وقتك كل يوم.'}</AppText>
            {habits.length > 0 ? (
              <View style={styles.progressArea}>
                <View style={styles.progressHeading}>
                  <AppText style={styles.progressLabel}>خطواتك اليوم</AppText>
                  <AppText style={styles.progressValue}>{formatArabicNumber(completedCount)} من {formatArabicNumber(habits.length)}</AppText>
                </View>
                <View accessibilityRole="progressbar" accessibilityLabel="تقدم عادات اليوم" accessibilityValue={{ min: 0, max: habits.length, now: completedCount }} style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
              </View>
            ) : <View style={styles.heroRule} />}
          </View>

          {notice ? <AppText accessibilityLiveRegion="polite" style={styles.notice}>{notice}</AppText> : null}
          {habits.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyMark}><BrandMark size={138} /></View>
              <AppText style={styles.emptyTitle}>اغرس أول عادة</AppText>
              <AppText style={styles.emptyMessage}>ابدأ بشيء بسيط يقرّبك من الشخص اللي ناوي تكونه. كل مرة ترجع فيها لنيتك، هي بداية جديدة.</AppText>
              <AppText style={styles.examples}>قراءة  ·  حركة  ·  تعلّم  ·  ذكر</AppText>
              <View style={styles.divider} />
              <AppText style={styles.gentleNote}>على مهل… النمو يحتاج رعاية، مش استعجال.</AppText>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeading}>
                <AppText style={styles.sectionTitle}>نواياك اليومية</AppText>
                <AppText style={styles.count}>{habitCountLabel}</AppText>
              </View>
              {habits.map((habit) => <HabitCard key={habit.id} habit={habit} onToggle={() => toggleHabit(habit.id, habit.completedToday)} onError={setNotice} />)}
              <AppText style={styles.gentleNote}>كل يوم فرصة جديدة ترجع فيها لنيتك.</AppText>
            </>
          )}
        </ScrollView>
      )}

      {!loading && !error ? (
        <View style={styles.footer}>
          <AppButton label={habits.length ? 'اغرس نية جديدة' : 'ابدأ بنيّة'} icon={<AppIcon name="add" size={20} color={colors.white} />} onPress={() => router.push('/create')} />
          <AppText style={styles.privacy}>رحلتك لك وحدك · بياناتك محفوظة على جهازك</AppText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  brandIcon: { width: 52, height: 56, borderRadius: 16, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 36, lineHeight: 51 },
  tagline: { color: colors.textSecondary, fontSize: 12, lineHeight: 19, marginTop: -5 },
  archiveButton: { minHeight: 46, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 6 },
  archiveLabel: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.65 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md, flexGrow: 1 },
  hero: { backgroundColor: colors.forest, borderRadius: radius.lg, padding: spacing.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.forestDeep, gap: 8 },
  date: { color: colors.goldLight, fontSize: 12, lineHeight: 20, fontWeight: '700' },
  heroTitle: { color: colors.goldLight, fontFamily: fonts.display, fontSize: 29, lineHeight: 46 },
  heroMessage: { color: colors.onForest, fontSize: 14, lineHeight: 23 },
  heroRule: { width: 44, height: 2, backgroundColor: colors.gold, marginTop: 6, alignSelf: 'flex-start' },
  progressArea: { marginTop: spacing.sm, gap: 10 },
  progressHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  progressLabel: { color: colors.onForest, fontSize: 12 },
  progressValue: { color: colors.goldLight, fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: '#36574C', overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: colors.gold },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  sectionTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 26, lineHeight: 42 },
  count: { color: colors.primaryDark, fontSize: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primarySoft, borderRadius: radius.pill },
  notice: { color: colors.danger, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: spacing.lg },
  emptyMark: { width: 158, height: 164, borderTopLeftRadius: 79, borderTopRightRadius: 79, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 32, lineHeight: 48, textAlign: 'center' },
  emptyMessage: { maxWidth: 330, color: colors.textSecondary, fontSize: 16, lineHeight: 26, textAlign: 'center' },
  examples: { color: colors.primary, fontSize: 13, lineHeight: 22 },
  divider: { width: 32, height: 1, backgroundColor: colors.gold, marginVertical: 4 },
  gentleNote: { color: colors.textSecondary, fontSize: 13, lineHeight: 22, textAlign: 'center', paddingVertical: 4 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, gap: 8 },
  privacy: { color: colors.textMuted, fontSize: 11, lineHeight: 18, textAlign: 'center' },
});
