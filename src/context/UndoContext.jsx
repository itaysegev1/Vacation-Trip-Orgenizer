import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../lib/haptics';

const UNDO_MS = 5000;
const UndoCtx = createContext(null);

/**
 * Optimistic delete with a 5s undo window — supports MULTIPLE concurrent
 * pending deletes, each with its own timer + toast + undo button.
 *
 *  requestDelete(id, label, commit):
 *    - hides `id` (pages filter out `hiddenIds`)
 *    - shows a "נמחק / בטל" toast
 *    - after 5s with no undo, runs commit() (the real deleteDoc); the id is
 *      then removed from hiddenIds whether the write succeeds OR fails (on a
 *      rejected/offline write the item reappears instead of vanishing forever)
 *    - undo cancels the timer and un-hides immediately
 *
 * Pending timers are all cleared on unmount (e.g. logout) so no orphaned
 * deleteDoc fires after the user has left.
 */
export function UndoProvider({ children }) {
  const [hiddenIds, setHiddenIds] = useState(() => new Set());
  const [toasts, setToasts] = useState([]); // [{ id, label }]
  const timers = useRef(new Map());

  const unhide = useCallback((id) => {
    setHiddenIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const requestDelete = useCallback(
    (id, label, commit) => {
      setHiddenIds((prev) => new Set(prev).add(id));
      setToasts((arr) => [...arr.filter((t) => t.id !== id), { id, label }]);
      triggerHaptic('medium');

      const prev = timers.current.get(id);
      if (prev) clearTimeout(prev);
      const t = setTimeout(async () => {
        timers.current.delete(id);
        try {
          await commit(); // real deleteDoc
        } catch (e) {
          console.error('delete failed', e);
        } finally {
          setToasts((arr) => arr.filter((x) => x.id !== id));
          unhide(id); // clear whether it committed or failed (failed → reappears)
        }
      }, UNDO_MS);
      timers.current.set(id, t);
    },
    [unhide]
  );

  const undo = useCallback(
    (id) => {
      const t = timers.current.get(id);
      if (t) clearTimeout(t);
      timers.current.delete(id);
      setToasts((arr) => arr.filter((x) => x.id !== id));
      unhide(id);
      triggerHaptic('light');
    },
    [unhide]
  );

  // Cancel every pending delete on unmount (logout/teardown) — items stay.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  return (
    <UndoCtx.Provider value={{ requestDelete, hiddenIds }}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] mx-auto flex w-fit max-w-[92%] flex-col items-center gap-2 lg:bottom-8">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                layout
                initial={{ y: 90, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="pointer-events-auto relative flex items-center gap-4 overflow-hidden rounded-2xl bg-ink/90 px-5 py-3 text-white shadow-2xl backdrop-blur"
              >
                <span className="max-w-[14rem] truncate text-sm font-medium">
                  🗑️ נמחק{toast.label ? `: ${toast.label}` : ''}
                </span>
                <button
                  onClick={() => undo(toast.id)}
                  className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-sakura transition active:scale-95"
                >
                  בטל
                </button>
                <motion.span
                  key={`${toast.id}-bar`}
                  className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-white/40"
                  style={{ transformOrigin: 'right' }}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: UNDO_MS / 1000, ease: 'linear' }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </UndoCtx.Provider>
  );
}

export function useUndo() {
  const ctx = useContext(UndoCtx);
  if (!ctx) throw new Error('useUndo must be used within UndoProvider');
  return ctx;
}
