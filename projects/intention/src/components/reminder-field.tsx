import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet, Switch, View } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { AppText } from './app-text';
import { AppButton } from './app-button';
import { dateFromTime, formatReminderTime, timeFromDate } from '@/business/reminder-time';
import { hasReminderPermission, requestReminderPermission } from '@/services/habit-reminders';
import { colors, radius, spacing } from '@/theme/theme';

type Props = {
  value: string | null;
  onChange: (time: string | null) => void;
  disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
};

export function ReminderField({ value, onChange, disabled, onBusyChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    const check = () => {
      if (value) void hasReminderPermission().then((allowed) => {
        if (mounted) setDenied(!allowed);
      }).catch(() => { if (mounted) setError('مقدرناش نتحقق من إذن الإشعارات. جرّب مرة تانية.'); });
    };
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => { mounted = false; subscription.remove(); };
  }, [value]);

  const enable = async (enabled: boolean) => {
    setError(null);
    if (!enabled) { onChange(null); setShowPicker(false); setDenied(false); return; }
    setBusy(true);
    onBusyChange(true);
    try {
      const allowed = await requestReminderPermission();
      setDenied(!allowed);
      if (allowed) { onChange(value ?? '09:00'); setShowPicker(true); }
    } catch {
      setError('مقدرناش نفعّل الإشعارات. جرّب مرة تانية.');
    } finally { setBusy(false); onBusyChange(false); }
  };

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <AppText style={styles.title}>تذكير يومي</AppText>
        <Switch
          accessibilityLabel="تفعيل التذكير اليومي"
          value={value !== null}
          disabled={disabled || busy || Platform.OS === 'web'}
          onValueChange={(enabled) => void enable(enabled)}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.white}
        />
      </View>
      <AppText style={styles.helper}>
        {Platform.OS === 'web' ? 'التذكير متاح في تطبيق الموبايل.' : 'اختار وقتًا بتوقيت جهازك، ونفكّرك كل يوم بإشعار باسم العادة. محتاجين إذن الإشعارات.'}
      </AppText>
      {value ? (
        <>
          <AppButton
            label={`وقت التذكير: ${formatReminderTime(value)}`}
            variant="secondary"
            disabled={disabled || busy}
            onPress={() => setShowPicker(true)}
          />
          {showPicker && Platform.OS !== 'web' ? (
            <>
              <DateTimePicker
                value={dateFromTime(value)}
                mode="time"
                locale="ar"
                themeVariant="light"
                accentColor={colors.primary}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                presentation="dialog"
                positiveButton={{ label: 'اختيار' }}
                negativeButton={{ label: 'إلغاء' }}
                onDismiss={() => setShowPicker(false)}
                onValueChange={(_event, date) => {
                  onChange(timeFromDate(date));
                  if (Platform.OS === 'android') setShowPicker(false);
                }}
              />
              {Platform.OS === 'ios' ? <AppButton label="تم" variant="ghost" onPress={() => setShowPicker(false)} /> : null}
            </>
          ) : null}
        </>
      ) : null}
      {denied ? (
        <>
          <AppText accessibilityLiveRegion="polite" style={styles.error}>الإشعارات مقفولة. اسمح لنية بالإشعارات من إعدادات الجهاز، وبعدها فعّل التذكير.</AppText>
          <AppButton label="افتح الإعدادات" variant="ghost" onPress={() => {
            void Linking.openSettings().catch(() => setError('افتح إعدادات الجهاز واسمح لنية بالإشعارات.'));
          }} />
        </>
      ) : null}
      {value && Platform.OS === 'android' ? <AppText style={styles.helper}>لو التذكير بيتأخر، اسمح لنية بـ«المنبّهات والتذكيرات» من إعدادات الجهاز.</AppText> : null}
      {error ? <AppText accessibilityLiveRegion="polite" style={styles.error}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  helper: { color: colors.textSecondary, fontSize: 13, lineHeight: 21 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 21 },
});
