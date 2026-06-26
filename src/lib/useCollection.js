import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isDemo } from './firebase';
import * as demo from './demoStore';

/**
 * Real-time subscription to a whole Firestore collection.
 * Our data volume is tiny (one honeymoon), so we fetch the full
 * collection and sort/filter client-side — no composite indexes needed.
 *
 * Returns { docs, loading, error, add, update, remove }.
 */
export function useCollection(path) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isDemo) {
      const unsub = demo.demoSubColl(path, (d) => {
        setDocs(d);
        setLoading(false);
      });
      return unsub;
    }
    if (!db) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      collection(db, path),
      (snap) => {
        setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`useCollection(${path})`, err);
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [path]);

  const add = useCallback(
    (data) =>
      isDemo
        ? demo.demoAdd(path, data)
        : addDoc(collection(db, path), { ...data, createdAt: serverTimestamp() }),
    [path]
  );
  const update = useCallback(
    (id, data) =>
      isDemo
        ? demo.demoUpdate(path, id, data)
        : updateDoc(doc(db, path, id), { ...data, updatedAt: serverTimestamp() }),
    [path]
  );
  const remove = useCallback(
    (id) => (isDemo ? demo.demoRemove(path, id) : deleteDoc(doc(db, path, id))),
    [path]
  );

  return { docs, loading, error, add, update, remove };
}

/**
 * Real-time subscription to a single document, e.g. 'settings/config'.
 * Returns { data, loading, save } where save(merge) upserts the doc.
 */
export function useDocument(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      const unsub = demo.demoSubDoc(path, (d) => {
        setData(d);
        setLoading(false);
      });
      return unsub;
    }
    if (!db) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, path),
      (snap) => {
        setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      (err) => {
        console.error(`useDocument(${path})`, err);
        setLoading(false);
      }
    );
    return unsub;
  }, [path]);

  const save = useCallback(
    (d) =>
      isDemo
        ? demo.demoSaveDoc(path, d)
        : setDoc(doc(db, path), { ...d, updatedAt: serverTimestamp() }, { merge: true }),
    [path]
  );

  return { data, loading, save };
}
