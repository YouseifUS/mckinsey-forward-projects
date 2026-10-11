import Storage from 'expo-sqlite/kv-store';
import { getReactNativePersistence, getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseApp } from './firebase-config';
function initializeSession() {
  if (!firebaseApp) return null;
  try { return initializeAuth(firebaseApp, { persistence: getReactNativePersistence(Storage) }); }
  catch (error) {
    if ((error as { code?: string }).code === 'auth/already-initialized') return getAuth(firebaseApp);
    throw error;
  }
}
export const auth = initializeSession();
export const firestore = firebaseApp ? getFirestore(firebaseApp) : null;
