import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';
// Firebase 13's generic types omit this native-only export. Metro resolves the
// React Native implementation, whose public signature is declared here.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
