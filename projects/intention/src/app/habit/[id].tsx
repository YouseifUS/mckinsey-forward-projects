import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/screen';
import { PageHeader } from '@/components/page-header';
import { AppIcon, type AppIconName } from '@/components/app-icon';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { CompletionButton } from '@/components/completion-button';
import { CompletionCalendar } from '@/components/completion-calendar';
import { Statistics } from '@/components/statistics';
import { ErrorState, LoadingState } from '@/components/states';
import { useHabitDetails } from '@/hooks/use-habit-details';
import { useDatabase } from '@/database/use-database';
import {
  completeHabit,
  deleteHabit,
  setHabitArchived,
  undoCompletion,
} from '@/database/habit-repository';
import { colors, radius, spacing } from '@/theme/theme';

export default function HabitDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string; created?: string }>();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const db = useDatabase();
  const { habit, loading, error, reload } = useHabitDetails(id);
  const [notice, setNotice] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);

  const toggleCompletion = async () => {
    if (!habit || !id) return;
    setNotice(null);
    if (habit.completedToday) await undoCompletion(db, id);
    else await completeHabit(db, id);
    await reload();
  };

  const toggleArchive = async () => {
    if (!habit || !id || managing) return;
    setManaging(true);
    setNotice(null);
    try {
      await setHabitArchived(db, id, !habit.isArchived);
      await reload();
      setNotice(habit.isArchived ? 'رجّعنا العادة لنواياك اليومية.' : 'تمت أرشفة العادة وسجلها محفوظ.');
    } catch (manageError) {
      setNotice(manageError instanceof Error ? manageError.message : 'مقدرناش نحدّث العادة.');
    } finally {
      setManaging(false);
    }
  };

  const confirmDelete = () => {
    if (!id || !habit) return;
    Alert.alert(
      'تحذف العادة نهائيًا؟',
      `عادة «${habit.name}» وكل سجل إكمالها هيتمسحوا. الخطوة دي مينفعش تتراجع عنها.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف نهائي',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteHabit(db, id);
                router.replace('/');
              } catch (deleteError) {
                setNotice(deleteError instanceof Error ? deleteError.message : 'مقدرناش نحذف العادة.');
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Screen includeBottomInset={false}>
      <PageHeader title={habit?.name ?? 'تفاصيل العادة'} subtitle={habit?.isArchived ? 'مؤرشفة' : 'ممارسة يومية'} />
      {loading ? (
        <LoadingState />
      ) : error || !habit ? (
        <ErrorState message={error ?? 'ملقيناش العادة دي.'} onRetry={() => void reload()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {params.created === '1' ? (
            <View style={styles.createdBanner}>
              <AppIcon name="spark" size={21} color={colors.primary} />
              <AppText style={styles.createdText}>نيتك جاهزة تتحول لممارسة—يوم هادي في كل مرة.</AppText>
            </View>
          ) : null}
          {habit.isArchived ? (
            <View style={styles.archivedBanner}>
              <AppIcon name="archive" size={20} color={colors.primaryDark} />
              <AppText style={styles.archivedText}>العادة دي متوقفة ومش بتظهر دلوقتي في صفحتك الرئيسية.</AppText>
            </View>
          ) : null}
          {notice ? <AppText accessibilityLiveRegion="polite" style={styles.notice}>{notice}</AppText> : null}

          <Section label="الهوية">
            <View style={styles.identityCard}>
              <AppText style={styles.habitName}>{habit.name}</AppText>
              <AppText style={styles.intention}>«{habit.intention}»</AppText>
              <View style={styles.divider} />
              <AppText style={styles.smallLabel}>معناها بالنسبالك</AppText>
              <AppText style={styles.meaning}>{habit.meaning}</AppText>
            </View>
          </Section>

          {!habit.isArchived ? (
            <CompletionButton
              completed={habit.completedToday}
              onToggle={toggleCompletion}
              onError={setNotice}
            />
          ) : null}

          <Section label="دورة العادة" subtitle="الإشارة بتبدأ الفعل، والمكافأة بتساعده يثبت.">
            <View style={styles.loop}>
              <LoopCard icon="calendar" label="الإشارة" value={habit.cue} tone="accent" />
              <AppText style={styles.loopArrow}>↓</AppText>
              <LoopCard icon="spark" label="الروتين" value={habit.routine} tone="primary" />
              <AppText style={styles.loopArrow}>↓</AppText>
              <LoopCard icon="total" label="المكافأة" value={habit.reward} tone="soft" />
            </View>
          </Section>

          <Section label="إيقاعك" subtitle="معلومات تساعدك، مش حكم عليك.">
            <Statistics statistics={habit.statistics} />
          </Section>

          <Section label="تقويم الإكمال" subtitle="الأيام اللي فاتت سجل، مش نتيجة تحكم عليك.">
            <CompletionCalendar completionDates={habit.completionDates} />
          </Section>

          <Section label="إدارة العادة">
            <View style={styles.manageCard}>
              <AppButton
                label="تعديل العادة"
                variant="secondary"
                icon={<AppIcon name="edit" size={18} color={colors.primaryDark} />}
                onPress={() => router.push({ pathname: '/habit/[id]/edit', params: { id: habit.id } })}
              />
              <AppButton
                label={habit.isArchived ? 'استعادة العادة' : 'أرشفة العادة'}
                variant="ghost"
                loading={managing}
                icon={<AppIcon name={habit.isArchived ? 'restore' : 'archive'} size={18} color={colors.text} />}
                onPress={() => void toggleArchive()}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="حذف العادة نهائيًا"
                onPress={confirmDelete}
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                <AppIcon name="delete" size={18} color={colors.danger} />
                <AppText style={styles.deleteLabel}>حذف نهائي</AppText>
              </Pressable>
            </View>
          </Section>
          <AppText style={styles.footerThought}>كل يوم فرصة جديدة ترجع فيها لنيتك.</AppText>
        </ScrollView>
      )}
    </Screen>
  );
}

function Section({
  label,
  subtitle,
  children,
}: React.PropsWithChildren<{ label: string; subtitle?: string }>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText style={styles.sectionLabel}>{label}</AppText>
        {subtitle ? <AppText style={styles.sectionSubtitle}>{subtitle}</AppText> : null}
      </View>
      {children}
    </View>
  );
}

function LoopCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: AppIconName;
  label: string;
  value: string;
  tone: 'accent' | 'primary' | 'soft';
}) {
  return (
    <View style={[styles.loopCard, styles[`${tone}Loop`]]}>
      <View style={styles.loopIcon}><AppIcon name={icon} size={20} color={colors.primaryDark} /></View>
      <View style={styles.loopCopy}>
        <AppText style={styles.loopLabel}>{label}</AppText>
        <AppText style={styles.loopValue}>{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  createdBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radius.md },
  createdText: { flex: 1, color: colors.primaryDark, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  archivedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceMuted, padding: spacing.md, borderRadius: radius.md },
  archivedText: { flex: 1, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  notice: { color: colors.primaryDark, fontSize: 13, textAlign: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.sm, padding: spacing.sm },
  section: { gap: spacing.md },
  sectionHeader: { gap: spacing.xs },
  sectionLabel: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sectionSubtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  identityCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  habitName: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  intention: { color: colors.primaryDark, fontSize: 24, lineHeight: 33, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border },
  smallLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  meaning: { color: colors.text, fontSize: 16, lineHeight: 24 },
  loop: { alignItems: 'stretch' },
  loopCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 88, padding: spacing.md, borderRadius: radius.md },
  accentLoop: { backgroundColor: colors.accentSoft },
  primaryLoop: { backgroundColor: colors.primarySoft },
  softLoop: { backgroundColor: colors.surface },
  loopIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  loopCopy: { flex: 1, gap: spacing.xs },
  loopLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  loopValue: { color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  loopArrow: { color: colors.textMuted, textAlign: 'center', fontSize: 18, height: 25 },
  manageCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  deleteButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  deleteLabel: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.65 },
  footerThought: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: spacing.md },
});
