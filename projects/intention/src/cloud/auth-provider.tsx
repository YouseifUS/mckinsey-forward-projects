import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { auth } from './firebase';

type Session = { user: User | null; loading: boolean; configured: boolean; error: string | null };
const Context = createContext<Session>({ user: null, loading: true, configured: !!auth, error: null });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, loading: !!auth, configured: !!auth, error: null });
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (user) => setSession({ user, loading: false, configured: true, error: null }),
      () => setSession({ user: null, loading: false, configured: true, error: 'تعذر استعادة حسابك. أعد تشغيل التطبيق وحاول مرة أخرى.' }));
  }, []);
  return <Context.Provider value={session}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);
function requireAuth() {
  if (!auth) throw new Error('تسجيل الدخول سيكون متاحًا بعد إعداد Firebase. يمكنك استخدام التطبيق محليًا الآن.');
  return auth;
}
export async function login(email: string, password: string, register = false) {
  const service = requireAuth();
  if (register) await createUserWithEmailAndPassword(service, email.trim(), password);
  else await signInWithEmailAndPassword(service, email.trim(), password);
}
export async function logout() { await signOut(requireAuth()); }
export async function resetPassword(email: string) { await sendPasswordResetEmail(requireAuth(), email.trim()); }
export function authError(error: unknown) {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    'auth/invalid-email': 'اكتب بريدًا إلكترونيًا صحيحًا.',
    'auth/weak-password': 'استخدم كلمة مرور من ٦ أحرف على الأقل.',
    'auth/email-already-in-use': 'البريد مستخدم بالفعل. جرّب تسجيل الدخول.',
    'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة.',
    'auth/network-request-failed': 'تسجيل الدخول يحتاج اتصالًا بالإنترنت. عاداتك المحلية متاحة.',
    'auth/too-many-requests': 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.',
  };
  return messages[code ?? ''] ?? 'تعذر إكمال الطلب. تحقق من الاتصال وإعدادات الحساب وحاول مرة أخرى.';
}
