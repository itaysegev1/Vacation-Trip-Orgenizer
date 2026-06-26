import { useMemo } from 'react';
import { motion } from 'motion/react';
import { prefersReducedMotion } from '../lib/motionVariants';

// ─────────────────────────────────────────────────────────────
// LineChart — a small, zero-dependency line chart WITH AXES (custom SVG +
// Framer Motion). Unlike a bare sparkline it shows a Y scale (value labels +
// gridlines) and an X scale (date labels), so the line maps to real numbers.
//
// props:
//   values    number[]  chronological (oldest → newest)
//   labels    string[]  same length; x-axis labels (only ~3 ticks rendered)
//   color     string
//   formatY   (n)=>string  Y-tick + latest-value formatter
//   title     string    small caption
//   zeroBased bool       Y axis starts at 0 (spend) vs at the series min (FX)
//   animate   bool       draw-in once (off → static, for "updates once a day" data)
// ─────────────────────────────────────────────────────────────
export default function LineChart({
  values = [],
  labels = [],
  color = 'var(--color-rose-deep)',
  formatY = (v) => String(Math.round(v)),
  title,
  height = 132,
  width = 320,
  zeroBased = false,
  animate = true,
}) {
  const W = width;
  const H = height;
  const padL = 46;
  const padR = 12;
  const padT = 10;
  const padB = 20;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const { pts, yTicks, xTicks, last } = useMemo(() => {
    const n = values.length;
    if (n === 0) return { pts: [], yTicks: [], xTicks: [], last: null };
    const min = zeroBased ? Math.min(0, ...values) : Math.min(...values);
    const max = Math.max(...values);
    const flat = max === min; // single point, or all-equal values
    const span = max - min || 1;
    const x = (i) => padL + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
    const y = (v) => (flat ? padT + plotH / 2 : padT + (1 - (v - min) / span) * plotH);
    const points = values.map((v, i) => ({ x: x(i), y: y(v), v, i }));
    // Flat/single-point: one centered reference line instead of 3 fabricated ticks.
    const yt = flat ? [{ v: min, y: padT + plotH / 2 }] : [min, min + span / 2, max].map((v) => ({ v, y: y(v) }));
    const idxs = n === 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];
    const xt = [...new Set(idxs)].map((i) => ({ i, x: x(i), label: labels[i] || '' }));
    return { pts: points, yTicks: yt, xTicks: xt, last: points[points.length - 1] };
  }, [values, labels, zeroBased, plotW, plotH]);

  if (pts.length === 0) return null;
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const drawIn = animate && !prefersReducedMotion;

  return (
    <div className="w-full" dir="ltr">
      {title && (
        <div className="mb-0.5 text-right text-xs font-semibold text-ink-soft" dir="rtl">
          {title}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" preserveAspectRatio="none">
        {/* Y gridlines + labels */}
        {yTicks.map((t, i) => (
          <g key={`y${i}`}>
            <line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke="var(--color-line)" strokeWidth="1" />
            <text x={padL - 6} y={t.y + 3} textAnchor="end" fontSize="10" fill="var(--color-ink-soft)">
              {formatY(t.v)}
            </text>
          </g>
        ))}
        {/* X labels */}
        {xTicks.map((t, i) => (
          <text
            key={`x${i}`}
            x={t.x}
            y={H - 6}
            textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
            fontSize="10"
            fill="var(--color-ink-soft)"
          >
            {t.label}
          </text>
        ))}
        {/* The line */}
        {pts.length > 1 && (
          <motion.path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={drawIn ? { pathLength: 0 } : false}
            animate={drawIn ? { pathLength: 1 } : undefined}
            transition={drawIn ? { duration: 0.7, ease: 'easeOut' } : undefined}
          />
        )}
        {/* Latest point + its value (clamped inside the plot, below the point near the top) */}
        <circle cx={last.x} cy={last.y} r="3" fill={color} />
        <text
          x={last.x - 5}
          y={last.y < padT + 14 ? last.y + 13 : last.y - 6}
          textAnchor="end"
          fontSize="10"
          fontWeight="700"
          fill={color}
        >
          {formatY(last.v)}
        </text>
      </svg>
    </div>
  );
}
