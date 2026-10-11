import { getApp, getApps, initializeApp } from 'firebase/app';
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const firebaseApp = Object.values(firebaseConfig).every(Boolean)
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
