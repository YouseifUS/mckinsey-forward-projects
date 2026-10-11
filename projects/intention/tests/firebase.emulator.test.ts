import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, type Firestore } from 'firebase/firestore';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firestoreTransport } from '@/cloud/firestore-transport';
import { createSyncEngine } from '@/cloud/sync-engine';
import { initializeDatabase } from '@/database/schema';
import { initializeSyncStore, importGuestData, pendingRecords } from '@/cloud/sync-store';
import { completeHabit, createHabit, getHabit, getHabitDetails, updateHabit, deleteHabit, undoCompletion } from '@/database/habit-repository';
import { NodeTestDatabase } from './helpers/node-database';

const enabled = !!process.env.FIRESTORE_EMULATOR_HOST && !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
describe.skipIf(!enabled)('Firebase emulators: ownership, auth and real Firestore transport', () => {
  let env: RulesTestEnvironment;
  let app: FirebaseApp;
  const input = { name: 'قراءة', intention: 'تعلم', meaning: 'نمو', cue: 'صباح', routine: 'صفحة', reward: 'شاي' };
  const habit = { ...input, id: 'habit_test', reminderTime: null, createdAt: '2026-10-11', updatedAt: '2026-10-11', isArchived: false, deleted: false, mutationId: 'test:1' };
  const databases: NodeTestDatabase[] = [];
  async function local(account = true) {
    const db = new NodeTestDatabase(); databases.push(db);
    await initializeDatabase(db); if (account) await initializeSyncStore(db);
    return db;
  }
  beforeAll(async () => {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    env = await initializeTestEnvironment({ projectId: 'demo-neyya', firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') } });
    app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-neyya' }, 'auth-test');
    connectAuthEmulator(getAuth(app), `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  });
  beforeEach(async () => { await env.clearFirestore(); });
  afterAll(async () => { databases.forEach((db) => db.close()); await env.cleanup(); await deleteApp(app); });
  it('allows only the owner to read, list or write habits and history', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    const bob = env.authenticatedContext('bob').firestore();
    const guest = env.unauthenticatedContext().firestore();
    const ref = doc(alice, 'users/alice/habits/habit_test');
    await assertSucceeds(setDoc(ref, habit));
    await assertSucceeds(getDocs(collection(alice, 'users/alice/habits')));
    for (const db of [bob, guest]) {
      await assertFails(getDoc(doc(db, ref.path)));
      await assertFails(getDocs(collection(db, 'users/alice/habits')));
      await assertFails(setDoc(doc(db, ref.path), habit));
    }
    const c = { habitId: 'habit_test', date: '2026-10-01', createdAt: 'now', deleted: false, mutationId: 'test:2' };
    await assertSucceeds(setDoc(doc(alice, 'users/alice/completions/habit_test_2026-10-01'), c));
    await assertFails(getDocs(collection(bob, 'users/alice/completions')));
    await assertFails(setDoc(doc(bob, 'users/alice/completions/habit_test_2026-10-01'), c));
    await assertFails(setDoc(doc(guest, 'users/alice/completions/habit_test_2026-10-01'), c));
  });
  it('rejects invalid schema, unrelated paths and physical deletion', async () => {
    const db = env.authenticatedContext('alice').firestore(), ref = doc(db, 'users/alice/habits/habit_test');
    await assertFails(setDoc(ref, { ...habit, isArchived: 'yes' }));
    await assertFails(setDoc(ref, { ...habit, surprise: 'field' }));
    await assertFails(setDoc(ref, { ...habit, reminderTime: '27:30' }));
    await assertFails(setDoc(ref, { ...habit, id: 'different' }));
    await assertFails(setDoc(doc(db, 'other/doc'), { value: true }));
    await assertFails(setDoc(doc(db, 'users/alice/completions/missing_2026-10-01'), { habitId: 'missing', date: '2026-10-01', createdAt: 'now', deleted: false, mutationId: 'm:1' }));
    await assertSucceeds(setDoc(ref, habit));
    await assertFails(deleteDoc(ref));
    await assertSucceeds(setDoc(ref, { id: habit.id, deleted: true, mutationId: 'm:2' }));
    await assertFails(setDoc(ref, habit));
  });
  it('creates an account, signs out, rejects a bad password and signs in again', async () => {
    const auth = getAuth(app), email = `test-${Date.now()}@example.com`;
    const { user } = await createUserWithEmailAndPassword(auth, email, 'test-password');
    await signOut(auth); expect(auth.currentUser).toBeNull();
    await expect(signInWithEmailAndPassword(auth, email, 'incorrect')).rejects.toThrow();
    expect((await signInWithEmailAndPassword(auth, email, 'test-password')).user.uid).toBe(user.uid);
    await signOut(auth);
  });
  it('syncs two devices, undo and tombstones through the production transport', async () => {
    const remote = firestoreTransport(env.authenticatedContext('alice').firestore() as unknown as Firestore, 'alice');
    const a = await local(), b = await local();
    const h = await createHabit(a, input); await completeHabit(a, h.id, '2026-10-01');
    await createSyncEngine(a, remote, () => {}).sync();
    expect(await pendingRecords(a)).toHaveLength(0);
    await createSyncEngine(b, remote, () => {}).sync();
    expect((await getHabitDetails(b, h.id))?.completionDates).toEqual(['2026-10-01']);
    await undoCompletion(a, h.id, '2026-10-01');
    await createSyncEngine(a, remote, () => {}).sync();
    await createSyncEngine(b, remote, () => {}).sync();
    expect((await getHabitDetails(b, h.id))?.completionDates).toEqual([]);
    await deleteHabit(a, h.id); await updateHabit(b, h.id, { ...input, name: 'stale offline edit' });
    await createSyncEngine(a, remote, () => {}).sync();
    await createSyncEngine(b, remote, () => {}).sync();
    expect(await getHabit(b, h.id)).toBeNull();
  });
  it('offline guest imports fill gaps without replacing existing server edits or undo', async () => {
    const guest = await local(false), account = await local();
    const h = await createHabit(guest, input); await completeHabit(guest, h.id, '2026-10-01');
    const remote = firestoreTransport(env.authenticatedContext('alice').firestore() as unknown as Firestore, 'alice');
    await remote.write({ kind: 'habit', id: h.id, data: { ...h, name: 'server value', deleted: false } }, 'server:1');
    await remote.write({ kind: 'completion', id: `${h.id}_2026-10-01`, data: { habitId: h.id, date: '2026-10-01', createdAt: 'now', deleted: true } }, 'server:2');
    await importGuestData(guest, account);
    await createSyncEngine(account, remote, () => {}).sync();
    expect(await pendingRecords(account)).toHaveLength(0);
    expect((await getHabitDetails(account, h.id))).toMatchObject({ name: 'server value', completionDates: [] });
  });
});
