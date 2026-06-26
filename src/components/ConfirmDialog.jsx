import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { prefersReducedMotion } from '../lib/motionVariants';

const pop = prefersReducedMotion
  ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
  : {
      initial: { scale: 0.9, opacity: 0, y: 10 },
      animate: { scale: 1, opacity: 1, y: 0 },
      exit: { scale: 0.95, opacity: 0 },
      transition: { type: 'spring', stiffness: 360, damping: 28 },
    };

export default function ConfirmDialog({
  open,
  title = 'בטוחים?',
  message,
  confirmLabel = 'מחיקה',
  cancelLabel = 'ביטול',
  danger = true,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;
    // Capture phase + stopImmediatePropagation so a single Escape closes only
    // this (top-most) dialog, not an underlying Modal that also listens.
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onCancel]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-md" onClick={onCancel} aria-hidden="true" />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="relative z-10 w-full max-w-xs rounded-3xl bg-cream p-6 text-center shadow-2xl"
            {...pop}
          >
            <div className="mb-1 text-3xl">{danger ? '🥀' : '🌸'}</div>
            <h3 className="font-display text-xl text-rose-deep">{title}</h3>
            {message && <p className="mt-1 text-sm text-ink-soft">{message}</p>}
            <div className="mt-5 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-2xl bg-petal py-2.5 font-medium text-rose-deep active:scale-95 transition"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 rounded-2xl py-2.5 font-semibold text-white active:scale-95 transition ${
                  danger ? 'bg-rose-deep' : 'bg-jade'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
