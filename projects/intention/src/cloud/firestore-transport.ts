import { collection, doc, getDocsFromServer, runTransaction, type Firestore } from 'firebase/firestore';
import type { CloudTransport } from './sync-engine';
import type { CloudRecord, CompletionRecord } from './sync-store';

export function firestoreTransport(db: Firestore, uid: string): CloudTransport {
  const path = (kind: CloudRecord['kind']) => kind === 'habit' ? 'habits' : 'completions';
  return {
    async read() {
      const snapshots = await Promise.all(['habit', 'completion'].map(async (kind) => {
        const result = await getDocsFromServer(collection(db, 'users', uid, path(kind as CloudRecord['kind'])));
        return result.docs.map((item) => ({ kind, id: item.id, data: item.data() }) as CloudRecord);
      }));
      return snapshots.flat();
    },
    async write(record, mutationId) {
      const reference = doc(db, 'users', uid, path(record.kind), record.id);
      // Transactions fail offline instead of persisting a second, SDK-owned write queue.
      await runTransaction(db, async (tx) => {
        const existing = await tx.get(reference);
        if (existing.data()?.mutationId === mutationId) return;
        // Import fills gaps; it never replaces an existing cloud habit or undo.
        if (mutationId.startsWith('import:') && existing.exists()) return;
        // A stale offline edit cannot resurrect a deleted habit.
        if (record.kind === 'habit' && existing.data()?.deleted) return;
        if (record.kind === 'completion' && !record.data.deleted) {
          const parent = await tx.get(doc(db, 'users', uid, 'habits', (record.data as CompletionRecord).habitId));
          if (!parent.exists() || parent.data().deleted) return;
        }
        tx.set(reference, { ...record.data, mutationId });
      });
    },
  };
}
