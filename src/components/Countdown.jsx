import { useEffect, useState } from 'react';
import { MILESTONES, CONTENT, fmt } from '../lib/tripConfig';

function getParts(target) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    done: diff === 0,
  };
}

const PAD = (n) => String(n).padStart(2, '0');

function useParts(target) {
  const [t, setT] = useState(() => getParts(target));
  useEffect(() => {
    const id = setInterval(() => setT(getParts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

function MilestoneCard({ milestone }) {
  const t = useParts(milestone.date);
  return (
    <div className="rounded-2xl bg-white/70 p-3 text-center shadow-soft">
      <div className="text-sm font-semibold text-rose-deep">
        {milestone.emoji} {milestone.label}
      </div>
      {t.done ? (
        <div className="mt-2 font-display text-lg leading-tight text-rose">{milestone.doneMessage}</div>
      ) : (
        <>
          <div className="mt-1 font-display text-4xl leading-none text-rose-deep tabular-nums">
            {t.days}
          </div>
          <div className="text-[0.65rem] font-medium text-ink-soft">{CONTENT.common.daysUnit}</div>
          <div className="mt-1 text-xs text-ink-soft/80 tabular-nums" dir="ltr">
            {PAD(t.hours)}:{PAD(t.minutes)}:{PAD(t.seconds)}
          </div>
        </>
      )}
    </div>
  );
}

// Milestones shown in the countdown (e.g. the wedding is gated by isHoneymoon).
const COUNTDOWN_MILESTONES = MILESTONES.filter((m) => m.showInCountdown);

/** Dual (N) countdown — one card per configured countdown milestone. */
export default function Countdown() {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${COUNTDOWN_MILESTONES.length}, minmax(0, 1fr))` }}
    >
      {COUNTDOWN_MILESTONES.map((m) => (
        <MilestoneCard key={m.id} milestone={m} />
      ))}
    </div>
  );
}

/** Compact header chip: counts down to the nearest upcoming milestone. */
export function CountdownChip() {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const next = COUNTDOWN_MILESTONES.find((m) => m.date.getTime() > now);
  const cls =
    'inline-flex items-center gap-1 rounded-full bg-petal px-3 py-1 text-sm font-semibold text-rose-deep';

  if (next) {
    return (
      <span className={cls}>
        {next.emoji} {fmt(CONTENT.countdown.chipUpcoming, { days: getParts(next.date).days, unit: CONTENT.common.daysUnit })}
      </span>
    );
  }
  return <span className={cls}>{CONTENT.countdown.activeChip}</span>;
}
