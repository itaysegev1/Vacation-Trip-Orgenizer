import { motion } from 'motion/react';
import { prefersReducedMotion } from '../lib/motionVariants';

/**
 * Premium empty state — a large, soft-colored emoji floating in a gradient
 * halo, with playful Hebrew micro-copy and an optional call-to-action.
 */
export default function EmptyState({
  emoji = '🌸',
  title,
  subtitle,
  action,
  gradient = 'radial-gradient(circle at 50% 38%, #ffe4ec 0%, #ffd9e4 55%, #ffe7d4 100%)',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center rounded-2xl border border-white/70 bg-white/60 px-6 py-14 text-center shadow-soft"
    >
      <div className="relative mb-4">
        {/* Soft glow halo behind the emoji */}
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-0 scale-125 rounded-full blur-2xl"
          style={{ background: gradient, opacity: 0.7 }}
        />
        <motion.div
          animate={prefersReducedMotion ? {} : { y: [0, -9, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative grid h-24 w-24 place-items-center rounded-full"
          style={{ background: gradient }}
        >
          <span className="text-5xl drop-shadow-sm">{emoji}</span>
        </motion.div>
      </div>
      <h3 className="font-display text-xl text-rose-deep">{title}</h3>
      {subtitle && <p className="mt-1.5 max-w-[18rem] text-sm leading-relaxed text-ink-soft">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
