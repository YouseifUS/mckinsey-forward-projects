import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/screen';
import { PageHeader } from '@/components/page-header';
import { TextField } from '@/components/text-field';
import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { AppText } from '@/components/app-text';
import { BrandMark } from '@/components/brand-mark';
import { createHabit } from '@/database/habit-repository';
import { useDatabase } from '@/database/use-database';
import { EMPTY_HABIT_DRAFT, type HabitDraft } from '@/types/habit';
import { colors, fonts, radius, spacing } from '@/theme/theme';
import { formatArabicNumber } from '@/business/dates';

type FieldName = keyof HabitDraft;

type Step = {
  field: FieldName;
  eyebrow: string;
  question: string;
  explanation: string;
  example: string;
  inputLabel: string;
};

const STEPS: Step[] = [
  {
    field: 'name',
    eyebrow: 'اسم العادة',
    question: 'إيه العادة اللي حابب تبنيها؟',
    explanation: 'اختار اسم بسيط وواضح للممارسة دي.',
    example: 'القراءة',
    inputLabel: 'اسم العادة',
  },
  {
    field: 'intention',
    eyebrow: 'النية',
    question: 'إيه نيتك من العادة دي؟',
    explanation: 'اوصف الصفة أو الاتجاه اللي حابب تنمّيه جواك من خلال العادة.',
    example: 'ناوي أكون شخص فضولي ويفضل يتعلم باستمرار.',
    inputLabel: 'نيتك',
  },
  {
    field: 'meaning',
    eyebrow: 'المعنى الشخصي',
    question: 'العادة دي بتمثّل لك إيه؟',
    explanation: 'عبّر عن أهميتها الشخصية بالنسبالك، بعيدًا عن الاتجاه اللي بتوصفه النية.',
    example: 'القراءة بتمثّل لي النمو الفكري والفضول والتعلّم طول العمر.',
    inputLabel: 'المعنى بالنسبالك',
  },
  {
    field: 'cue',
    eyebrow: 'الإشارة',
    question: 'إيه اللي هيفكّرك تبدأ العادة؟',
    explanation: 'اختار لحظة أو حدث ثابت يذكّرك تبدأ بهدوء.',
    example: 'بعد ما أشرب القهوة',
    inputLabel: 'إشارة البدء',
  },
  {
    field: 'routine',
    eyebrow: 'الروتين',
    question: 'هتعمل إيه بالتحديد؟',
    explanation: 'خلي الفعل واضح وصغير كفاية عشان تقدر تكرره باستمرار.',
    example: 'أقرأ ١٠ صفحات',
    inputLabel: 'الفعل اللي هتعمله',
  },
  {
    field: 'reward',
    eyebrow: 'المكافأة',
    question: 'هتكافئ نفسك إزاي؟',
    explanation: 'اختار مكافأة بسيطة ولطيفة تساعد التجربة تثبت.',
    example: 'أستمتع بكوباية شاي بهدوء',
    inputLabel: 'مكافأتك',
  },
];

const TOTAL_STEPS = STEPS.length + 1;

export default function CreateHabitScreen() {
  const db = useDatabase();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<HabitDraft>(EMPTY_HABIT_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const isReview = step === STEPS.length;

  const goBack = () => {
    setError(null);
    if (step > 0) setStep((value) => value - 1);
    else router.back();
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      goBack();
      return true;
    });
    return () => subscription.remove();
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [step]);

  const currentStep = useMemo(() => STEPS[step], [step]);

  const continueForward = () => {
    if (!currentStep) return;
    if (!draft[currentStep.field].trim()) {
      setError('اكتب إجابة قبل ما تكمل. تقدر تعدّلها بعدين.');
      return;
    }
    setError(null);
    setStep((value) => value + 1);
  };

  const save = async () => {
    if (saving) return;
    const missing = STEPS.find((item) => !draft[item.field].trim());
    if (missing) {
      setStep(STEPS.indexOf(missing));
      setError('الإجابة دي مطلوبة.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const habit = await createHabit(db, draft);
      router.replace({ pathname: '/habit/[id]', params: { id: habit.id, created: '1' } });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'مقدرناش ننشئ العادة.');
      setSaving(false);
    }
  };

  return (
    <Screen>
      <PageHeader title="إنشاء عادة" subtitle={`الخطوة ${formatArabicNumber(step + 1)} من ${formatArabicNumber(TOTAL_STEPS)}`} onBack={goBack} />
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
        style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {isReview ? (
            <Review draft={draft} onEdit={(targetStep) => setStep(targetStep)} />
          ) : (
            <View style={styles.stepContent}>
              <View style={styles.stepHeading}>
                <AppText style={styles.eyebrow}>{currentStep.eyebrow}</AppText>
                <View style={styles.stepMark}><BrandMark size={38} /></View>
              </View>
              <AppText style={styles.question}>{currentStep.question}</AppText>
              <AppText style={styles.explanation}>{currentStep.explanation}</AppText>
              <View style={styles.exampleCard}>
                <AppText style={styles.exampleLabel}>مثال</AppText>
                <AppText style={styles.example}>«{currentStep.example}»</AppText>
              </View>
              <TextField
                autoCapitalize="sentences"
                autoFocus
                error={error ?? undefined}
                label={currentStep.inputLabel}
                multiline={currentStep.field !== 'name'}
                onChangeText={(value) => {
                  setDraft((current) => ({ ...current, [currentStep.field]: value }));
                  if (error) setError(null);
                }}
                placeholder={currentStep.example}
                returnKeyType={currentStep.field === 'name' ? 'next' : 'default'}
                value={draft[currentStep.field]}
              />
            </View>
          )}

          {isReview && error ? <AppText style={styles.reviewError}>{error}</AppText> : null}
          <View style={styles.actions}>
            <AppButton label="رجوع" variant="ghost" onPress={goBack} style={styles.actionButton} />
            <AppButton
              label={isReview ? 'أنشئ العادة' : 'كمّل'}
              loading={saving}
              onPress={isReview ? () => void save() : continueForward}
              style={styles.actionButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Review({ draft, onEdit }: { draft: HabitDraft; onEdit: (step: number) => void }) {
  return (
    <View style={styles.stepContent}>
      <AppText style={styles.eyebrow}>المراجعة</AppText>
      <AppText style={styles.question}>نيتك، بكل تفاصيلها</AppText>
      <AppText style={styles.explanation}>خد لحظة واتأكد إن كل جزء شخصي وعملي بالنسبالك.</AppText>
      <View style={styles.reviewCard}>
        {STEPS.map((item, index) => (
          <Pressable
            key={item.field}
            accessibilityRole="button"
            accessibilityLabel={`تعديل ${item.eyebrow}`}
            onPress={() => onEdit(index)}
            style={({ pressed }) => [styles.reviewRow, pressed && styles.pressed]}>
            <View style={styles.reviewCopy}>
              <AppText style={styles.reviewLabel}>{item.eyebrow}</AppText>
              <AppText style={styles.reviewValue}>{draft[item.field]}</AppText>
            </View>
            <AppIcon name="edit" size={18} color={colors.primary} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progressTrack: { height: 4, marginHorizontal: spacing.lg, backgroundColor: colors.surfaceMuted, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  content: { flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xl, justifyContent: 'space-between' },
  stepContent: { gap: spacing.md },
  stepHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepMark: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  question: { color: colors.text, fontFamily: fonts.display, fontSize: 32, lineHeight: 48 },
  explanation: { color: colors.textSecondary, fontSize: 16, lineHeight: 24 },
  exampleCard: { backgroundColor: colors.accentSoft, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.xs },
  exampleLabel: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  example: { color: colors.text, fontSize: 15, lineHeight: 24 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  actionButton: { flex: 1 },
  reviewCard: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginTop: spacing.sm },
  reviewRow: { minHeight: 80, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  reviewCopy: { flex: 1, gap: spacing.xs },
  reviewLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  reviewValue: { color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  reviewError: { color: colors.danger, fontSize: 13, textAlign: 'center', marginTop: spacing.md },
  pressed: { opacity: 0.65 },
});
