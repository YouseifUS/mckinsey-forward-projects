import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { openDatabaseAsync } from 'expo-sqlite';
import { router } from 'expo-router';
import { useAuth, authError, login, logout, resetPassword } from '@/cloud/auth-provider';
import { useSync } from '@/cloud/sync-provider';
import { importGuestData } from '@/cloud/sync-store';
import { initializeDatabase } from '@/database/schema';
import { useDatabase } from '@/database/use-database';
import { Screen } from '@/components/screen';
import { PageHeader } from '@/components/page-header';
import { AppText } from '@/components/app-text';
import { AppButton } from '@/components/app-button';
import { TextField } from '@/components/text-field';
import { colors, spacing } from '@/theme/theme';

export default function AccountScreen() {
  const { user, configured, error } = useAuth();
  const { status, sync } = useSync();
  const db = useDatabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const action = async (task: () => Promise<void>) => {
    setBusy(true); setMessage(null);
    try { await task(); } catch (e) { setMessage(authError(e)); }
    finally { setBusy(false); }
  };
  const migrate = async () => {
    const guest = await openDatabaseAsync('intention.db');
    try {
      await initializeDatabase(guest);
      const count = await importGuestData(guest, db);
      setMessage(count ? `تم نقل ${count} عادة. النسخة الأصلية ما زالت محفوظة على الجهاز.` : 'تمت مراجعة النقل؛ العادات الموجودة لم تتكرر.');
      await sync();
    } finally { await guest.closeAsync(); }
  };
  return <Screen>
    <PageHeader title="حسابك في نية" onBack={() => router.replace('/')} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {!configured ? <AppText>تسجيل الدخول يحتاج إعداد Firebase. عاداتك محفوظة ويمكنك متابعة استخدام التطبيق على الجهاز.</AppText> : user ? <>
        <AppText>{user.email}</AppText>
        <AppText accessibilityLiveRegion="polite">{status}</AppText>
        <AppButton label="مزامنة الآن" disabled={busy} onPress={() => void action(sync)} />
        <View style={styles.section}>
          <AppText>عاداتك القديمة على هذا الجهاز منفصلة عن الحساب. يمكنك نسخها وسجل إنجازها إلى هذا الحساب مرة واحدة، مع الاحتفاظ بالأصل. لو عندك بيانات في الحساب، يُفضّل إكمال المزامنة أولًا.</AppText>
          <AppButton label="نسخ عادات هذا الجهاز إلى حسابي" variant="secondary" disabled={busy} onPress={() => void action(migrate)} />
        </View>
        <AppText>عند تسجيل الخروج ترجع لعادات الجهاز. تغييرات الحساب غير المتزامنة تظل محفوظة حتى تسجيل الدخول لنفس الحساب. حذف التطبيق قبل اكتمال المزامنة قد يفقدها.</AppText>
        <AppButton label="تسجيل الخروج" variant="ghost" disabled={busy} onPress={() => void action(logout)} />
      </> : <>
        <AppText>احفظ عاداتك في حسابك واستعدها على جهاز آخر بعد اكتمال المزامنة. يمكنك متابعة العادات دون إنترنت بعد تسجيل الدخول.</AppText>
        <TextField label="البريد الإلكتروني" multiline={false} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!busy} />
        <TextField label="كلمة المرور" multiline={false} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={register ? 'new-password' : 'current-password'} editable={!busy} />
        <AppButton label={register ? 'إنشاء حساب' : 'تسجيل الدخول'} loading={busy} disabled={!email.trim() || !password} onPress={() => void action(async () => { await login(email, password, register); })} />
        <AppButton label={register ? 'عندي حساب بالفعل' : 'إنشاء حساب جديد'} variant="ghost" disabled={busy} onPress={() => setRegister(!register)} />
        <AppButton label="نسيت كلمة المرور" variant="ghost" disabled={busy || !email.trim()} onPress={() => void action(async () => { await resetPassword(email); setMessage('لو البريد مسجل، هتوصلك رسالة لاستعادة كلمة المرور.'); })} />
      </>}
      {message || error ? <AppText accessibilityLiveRegion="polite" style={styles.message}>{message ?? error}</AppText> : null}
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  section: { gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderColor: colors.border },
  message: { color: colors.primaryDark },
});
