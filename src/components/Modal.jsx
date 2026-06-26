import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { sheetVariants } from '../lib/motionVariants';

/**
 * Mobile-first bottom-sheet (centers as a card on larger screens).
 * Spring slide-up, frosted backdrop, drag-down-to-close, Esc-to-close,
 * and body-scroll lock while open.
 */
export default function Modal({ open, onClose, title, children }) {
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-ink/30 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-cream shadow-2xl sm:rounded-[2rem]"
            variants={sheetVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            {/* Drag handle + header — only this strip starts the dismiss drag,
                so the form body below scrolls natively on touch. */}
            <div
              className="glass sticky top-0 z-10 px-5 pt-3 pb-3"
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: 'none', cursor: 'grab' }}
            >
              <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-blush" />
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl text-rose-deep">{title}</h2>
                <button
                  onClick={onClose}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="סגירה"
                  className="grid h-9 w-9 place-items-center rounded-full bg-petal text-rose-deep text-lg active:scale-90 transition"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-5 pb-8 pt-1">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
