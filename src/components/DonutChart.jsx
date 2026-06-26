import { motion } from 'motion/react';
import { prefersReducedMotion } from '../lib/motionVariants';

/**
 * Lightweight, zero-dependency animated donut chart (custom SVG + Framer Motion).
 * Each segment "draws in" with a staggered spring; center shows a label.
 *
 * data: [{ label, value, color }]
 */
export default function DonutChart({ data, size = 176, thickness = 26, centerValue, centerLabel }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;

  let acc = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const dash = (d.value / total) * circ;
      const seg = { ...d, dash, offset: acc };
      acc += dash;
      return seg;
    });

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* track */}
        <circle cx={c} cy={c} r={r} fill="none" stroke="#f0dde2" strokeWidth={thickness} />
        {segments.map((s, i) => (
          <motion.circle
            key={s.label}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDashoffset={-s.offset}
            initial={prefersReducedMotion ? false : { strokeDasharray: `0 ${circ}` }}
            animate={{ strokeDasharray: `${s.dash} ${circ - s.dash}` }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.7, delay: 0.1 + i * 0.12, ease: 'easeOut' }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {centerValue && <div className="font-display text-xl leading-tight text-rose-deep">{centerValue}</div>}
        {centerLabel && <div className="mt-0.5 text-xs text-ink-soft">{centerLabel}</div>}
      </div>
    </div>
  );
}
