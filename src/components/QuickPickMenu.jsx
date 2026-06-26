import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

const MENU_W = 248;

/**
 * Generic long-press / tap quick-pick popover. Floats near the press point
 * (clamped on-screen), fades+scales in, dims the rest with a dismiss backdrop.
 * Portaled to <body> so page transforms can't shift it.
 *
 * options: [{ id, label, bg, dot }]
 */
export default function QuickPickMenu({ open, x = 0, y = 0, title, options = [], currentId, onSelect, onClose }) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 380;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const menuH = 64 + options.length * 50; // header + rows, for clamping

  const left = Math.max(8, Math.min(x - MENU_W / 2, vw - MENU_W - 8));
  const placeBelow = y + 12 + menuH <= vh - 8;
  const top = Math.max(8, Math.min(placeBelow ? y + 12 : y - menuH - 12, vh - menuH - 8));

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[55]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

          <motion.div
            role="menu"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 440, damping: 30 }}
            style={{
              position: 'absolute',
              left,
              top,
              width: MENU_W,
              transformOrigin: `center ${placeBelow ? 'top' : 'bottom'}`,
            }}
            className="rounded-2xl bg-cream p-2 shadow-2xl ring-1 ring-line"
          >
            {title && (
              <div className="px-2 pb-1 pt-0.5 text-center text-xs font-semibold text-ink-soft">{title}</div>
            )}
            <div className="space-y-1">
              {options.map((o) => {
                const active = o.id === currentId;
                return (
                  <button
                    key={o.id}
                    role="menuitem"
                    onClick={() => onSelect(o.id)}
                    style={{ background: o.bg }}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-right text-sm font-semibold text-ink transition active:scale-[0.97] ${
                      active ? 'ring-2 ring-rose ring-offset-1 ring-offset-cream' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {o.dot && <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: o.dot }} />}
                      {o.label}
                    </span>
                    {active && <span className="text-rose-deep">✓</span>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
