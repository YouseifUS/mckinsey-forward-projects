import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useDatabase } from '@/database/use-database';
import { observeDatabase } from '@/database/access';
import { firestore } from './firebase';
import { useAuth } from './auth-provider';
import { createSyncEngine } from './sync-engine';
import { firestoreTransport } from './firestore-transport';
const Context = createContext({ status: 'بياناتك محفوظة على جهازك.', sync: async () => {} });
export const useSync = () => useContext(Context);
export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useDatabase();
  const { user } = useAuth();
  const uid = user?.uid;
  const [status, setStatus] = useState('بياناتك محفوظة على جهازك.');
  const syncRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    if (!uid || !firestore) return;
    // Create the session within the effect so Strict Mode can safely stop/restart it.
    const engine = createSyncEngine(db, firestoreTransport(firestore, uid), setStatus);
    let applying = false;
    const sync = async () => {
      if (applying || AppState.currentState === 'background') return;
      applying = true;
      try { await engine.sync(); }
      finally { applying = false; }
    };
    syncRef.current = sync;
    void sync();
    const interval = setInterval(() => void sync(), 30_000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void sync(); });
    const unsubscribe = observeDatabase(db, () => { if (!applying) void sync(); });
    return () => {
      engine.stop(); syncRef.current = async () => {};
      clearInterval(interval); subscription.remove(); unsubscribe();
    };
  }, [db, uid]);
  return <Context.Provider value={{ status, sync: () => syncRef.current() }}>{children}</Context.Provider>;
}
