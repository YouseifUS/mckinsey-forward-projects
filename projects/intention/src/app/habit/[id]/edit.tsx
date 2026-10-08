import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/screen';
import { PageHeader } from '@/components/page-header';
import { TextField } from '@/components/text-field';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState, LoadingState } from '@/components/states';
import { useHabitDetails } from '@/hooks/use-habit-details';
import { useDatabase } from '@/database/use-database';
import { updateHabit } from '@/database/habit-repository';
import type { HabitDetails, HabitDraft } from '@/types/habit';
import type { DatabaseClient } from '@/database/client';
import { colors, spacing } from '@/theme/theme';

const FIELDS: { key: keyof HabitDraft; label: string; helper: string; multiline?: boolean }[] = [
  { key: 'name', label: 'اسم العادة', helper: 'اسم بسيط للممارسة دي', multiline: false },
  { key: 'intention', label: 'النية', helper: 'الصفة أو الاتجاه اللي حابب تنمّيه' },
  { key: 'meaning', label: 'المعنى الشخصي', helper: 'ليه العادة دي مهمة بالنسبالك' },
  { key: 'cue', label: 'الإشارة', helper: 'اللحظة اللي هتفكّرك تبدأ' },
  { key: 'routine', label: 'الروتين', helper: 'الفعل المحدد اللي هتعمله' },
  { key: 'reward', label: 'المكافأة', helper: 'استجابة لطيفة تثبّت العادة' },
];

export default function EditHabitScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const db = useDatabase();
  const { habit, loading, error, reload } = useHabitDetails(id);

  return (
    <Screen>
      <PageHeader title="تعديل العادة" subtitle="سجل الإكمال هيفضل محفوظ" />
      {loading ? (
        <LoadingState />
      ) : error || !habit ? (
        <ErrorState message={error ?? 'ملقيناش العادة دي.'} onRetry={() => void reload()} />
      ) : (
        <EditForm key={habit.updatedAt} db={db} habit={habit} />
      )}
    </Screen>
  );
}

function EditForm({ db, habit }: { db: DatabaseClient; habit: HabitDetails }) {
  const [draft, setDraft] = useState<HabitDraft>({
    name: habit.name,
    intention: habit.intention,
    meaning: habit.meaning,
    cue: habit.cue,
    routine: habit.routine,
    reward: habit.reward,
  });
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    const missing = FIELDS.find((field) => !draft[field.key].trim());
    if (missing) {
      setFieldError(`${missing.label} مطلوب.`);
      return;
    }
    setSaving(true);
    setFieldError(null);
    try {
      await updateHabit(db, habit.id, draft);
      router.back();
    } catch (saveError) {
      setFieldError(saveError instanceof Error ? saveError.message : 'مقدرناش نحفظ التعديلات.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <AppText style={styles.intro}>
              خليك مرن وخلي العادة تتطور معاك. تعديل الكلام هنا مش هيغيّر سجل الإكمال.
            </AppText>
            {FIELDS.map((field) => (
              <View key={field.key} style={styles.fieldGroup}>
                <TextField
                  label={field.label}
                  multiline={field.multiline ?? true}
                  onChangeText={(value) => {
                    setDraft((current) => ({ ...current, [field.key]: value }));
                    if (fieldError) setFieldError(null);
                  }}
                  value={draft[field.key]}
                />
                <AppText style={styles.helper}>{field.helper}</AppText>
              </View>
            ))}
            {fieldError ? <AppText accessibilityLiveRegion="polite" style={styles.error}>{fieldError}</AppText> : null}
            <AppButton label="احفظ التعديلات" loading={saving} onPress={() => void save()} />
          </ScrollView>
        </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  intro: { color: colors.textSecondary, fontSize: 15, lineHeight: 23 },
  fieldGroup: { gap: spacing.sm },
  helper: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginHorizontal: spacing.xs },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
});
