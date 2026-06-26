import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useLocation } from 'react-router-dom';

const PETAL_CHARS = ['🌸', '🌸', '🌷', '💮'];

function Burst() {
  const petals = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.18,
        duration: 0.7 + Math.random() * 0.5,
        size: 14 + Math.random() * 18,
        drift: (Math.random() - 0.5) * 140,
        rotate: (Math.random() - 0.5) * 420,
        char: PETAL_CHARS[Math.floor(Math.random() * PETAL_CHARS.length)],
      })),
    []
  );

  return (
    <>
      {petals.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 will-change-transform select-none"
          style={{ left: `${p.left}%`, fontSize: p.size }}
          initial={{ y: '-14vh', x: 0, opacity: 0, rotate: 0 }}
          animate={{ y: '116vh', x: p.drift, opacity: [0, 0.95, 0.95, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        >
          {p.char}
        </motion.span>
      ))}
    </>
  );
}

/**
 * Fires a short sakura shower on every route change — the on-brand
 * analog of the reel's particle dispersion. Silent under reduced motion.
 */
export default function PetalBurst() {
  const location = useLocation();
  const reduced = useReducedMotion();
  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey((k) => k + 1);
  }, [location.pathname]);

  if (reduced) return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 20 }} aria-hidden="true">
      <AnimatePresence>{key > 0 && <Burst key={key} />}</AnimatePresence>
    </div>
  );
}
