// Centralized Framer Motion variants so the whole app moves consistently.
// Everything degrades to simple fades under prefers-reduced-motion.

export const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const spring = { type: 'spring', stiffness: 260, damping: 30 };
export const softSpring = { type: 'spring', stiffness: 200, damping: 26 };
export const snappy = { type: 'spring', stiffness: 420, damping: 32 };

// Headline route transition: a subtle, native fade + slide-up.
// Content glides gently upward as it fades — no harsh cuts.
export const pageVariants = prefersReducedMotion
  ? {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.18 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    }
  : {
      initial: { opacity: 0, y: 14 },
      animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.34, ease: [0.22, 0.61, 0.36, 1] },
      },
      exit: {
        opacity: 0,
        y: -8,
        transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
      },
    };

// Staggered list "bloom-in".
export const listContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: prefersReducedMotion ? 0 : 0.045, delayChildren: 0.03 },
  },
};

export const listItem = prefersReducedMotion
  ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
  : {
      hidden: { opacity: 0, y: 16, scale: 0.97 },
      show: { opacity: 1, y: 0, scale: 1, transition: softSpring },
    };

// Bottom-sheet modal.
export const sheetVariants = prefersReducedMotion
  ? {
      hidden: { opacity: 0 },
      show: { opacity: 1 },
      exit: { opacity: 0 },
    }
  : {
      hidden: { y: '100%', opacity: 0.4 },
      show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 320, damping: 34 } },
      exit: { y: '100%', opacity: 0.4, transition: { duration: 0.25, ease: 'easeIn' } },
    };

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
};

// Tap feedback shorthand.
export const tap = prefersReducedMotion ? {} : { scale: 0.96 };

// 3D card flip (Travel Wallet) — instant under reduced motion.
export const flipTransition = prefersReducedMotion
  ? { duration: 0 }
  : { type: 'spring', stiffness: 260, damping: 26 };

// Playful "pop" the active bottom-nav icon does when selected.
export const navPop = prefersReducedMotion
  ? { scale: 1 }
  : { scale: [1, 1.28, 1], transition: { duration: 0.42, ease: 'easeOut' } };
