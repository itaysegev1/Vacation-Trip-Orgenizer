import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { listItem } from '../lib/motionVariants';
import { SwipeCancelContext } from '../lib/useLongPress';

const OPEN_X = -76; // resting position when locked open
const TRIGGER = -52; // drag past this (or fling) locks open

const spring = { type: 'spring', stiffness: 500, damping: 40 };

/**
 * Native-feeling swipe-to-delete. Drag the content left to reveal a red
 * trash button on the right; snaps back if not dragged far enough, locks
 * open past the threshold. Tapping the open content closes it.
 *
 * Participates in list stagger (listItem variant) and AnimatePresence exit.
 */
export default function SwipeableRow({ children, onDelete, className = '' }) {
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);
  const longPressCancel = useRef(null); // a child long-press registers its canceller here

  const trashOpacity = useTransform(x, [-6, OPEN_X], [0, 1]);
  const trashScale = useTransform(x, [0, OPEN_X], [0.5, 1]);

  const close = () => {
    animate(x, 0, spring);
    setOpen(false);
  };
  const openRow = () => {
    animate(x, OPEN_X, spring);
    setOpen(true);
  };

  return (
    <SwipeCancelContext.Provider value={longPressCancel}>
    <motion.div
      variants={listItem}
      layout
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.22 } }}
      className={`relative ${className}`}
    >
      {/* Trash button revealed underneath, on the right. Normally invisible
          (opacity follows the drag), but keyboard focus reveals the row —
          otherwise Tab would land on a fully invisible button. */}
      <motion.div
        style={{ opacity: trashOpacity }}
        className="pointer-events-none absolute inset-y-0 right-0 flex items-center pe-1"
      >
        <motion.button
          type="button"
          style={{ scale: trashScale }}
          onClick={onDelete}
          onFocus={openRow}
          onBlur={() => close()}
          aria-label="מחיקה"
          className="pointer-events-auto grid min-h-12 w-16 place-items-center self-stretch rounded-2xl bg-rose-deep text-2xl text-white shadow-soft transition active:brightness-90"
        >
          🗑️
        </motion.button>
      </motion.div>

      {/* Draggable content */}
      <motion.div
        drag="x"
        style={{ x }}
        dragConstraints={{ left: OPEN_X, right: 0 }}
        dragElastic={0.08}
        onDragStart={() => longPressCancel.current?.()}
        onDragEnd={(_, info) => {
          if (info.offset.x < TRIGGER || info.velocity.x < -400) openRow();
          else close();
        }}
        className="relative z-10"
      >
        {children}
        {open && (
          <div
            className="absolute inset-0 z-20"
            onClick={close}
            aria-hidden="true"
          />
        )}
      </motion.div>
    </motion.div>
    </SwipeCancelContext.Provider>
  );
}
