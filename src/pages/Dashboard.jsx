import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import Countdown from '../components/Countdown';
import { useCollection, useDocument } from '../lib/useCollection';
import { useRates, convertToILS, formatILS } from '../lib/currency';
import { useAuth } from '../context/AuthContext';
import {
  DEFAULT_BUDGET_ILS,
  DESTINATIONS,
  APPROVED_STATUS_IDS,
  ITINERARY_START,
  ITINERARY_END,
  NUDGES,
  BUDGET_WARN_THRESHOLD,
  BAR_COLORS,
  destinationForDate,
  ymd,
  CONTENT,
  fmt,
  STORAGE_PREFIX,
  DATE_LOCALE,
  COLLECTIONS,
} from '../lib/tripConfig';
import { summarizeTaskUrgency, budgetLevel } from '../lib/nudges';
import { useToday } from '../lib/useToday';
import { listContainer, listItem } from '../lib/motionVariants';

const fmtDate = (d) =>
  new Intl.DateTimeFormat(DATE_LOCALE, { day: 'numeric', month: 'long' }).format(d);
const toDate = (s) => new Date(`${s}T00:00:00`);

// Current trip phase → hero copy. Derived from the destinations' date ranges
// and the content templates (no fixed Japan/Thailand conditional ladder).
function currentLeg() {
  const todayStr = ymd(new Date());
  const C = CONTENT.dashboard;
  if (todayStr < ITINERARY_START) {
    return {
      emoji: C.preTripHero.emoji,
      text: fmt(C.preTripHero.textTemplate, { destination: DESTINATIONS[0]?.name }),
      sub: C.preTripHero.sub,
    };
  }
  if (todayStr > ITINERARY_END) {
    return { emoji: C.postTripHero.emoji, text: C.postTripHero.text, sub: C.postTripHero.sub };
  }
  const idx = DESTINATIONS.findIndex((d) => d.id === destinationForDate(todayStr));
  const D = DESTINATIONS[Math.max(0, idx)];
  const nextStart = DESTINATIONS[idx + 1]?.startDate;
  const sub = fmt(D.legHero.subTemplate, {
    nextDate: nextStart ? fmtDate(toDate(nextStart)) : '',
    returnDate: fmtDate(toDate(ITINERARY_END)),
  });
  return { emoji: D.legHero.emoji, text: D.legHero.text, sub };
}

function StatCard({ to, emoji, value, label, tint }) {
  return (
    <motion.div variants={listItem}>
      <Link
        to={to}
        className="flex h-full flex-col justify-between rounded-2xl border border-white/70 bg-white/85 p-4 shadow-soft active:scale-95 transition"
      >
        <div className="text-2xl">{emoji}</div>
        <div className="mt-2">
          <div className="font-display text-2xl leading-none" style={{ color: tint }}>
            {value}
          </div>
          <div className="mt-1 text-sm text-ink-soft">{label}</div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { rates } = useRates();
  const { docs: expenses } = useCollection(COLLECTIONS.expenses);
  const { docs: ideas } = useCollection(COLLECTIONS.ideas);
  const { docs: itinerary } = useCollection(COLLECTIONS.itinerary);
  const { docs: tasks } = useCollection(COLLECTIONS.tasks);
  const { data: config } = useDocument(COLLECTIONS.settingsConfig);

  const leg = currentLeg();

  const spent = useMemo(
    () =>
      expenses.reduce(
        (sum, e) =>
          sum + (e.amountILS != null ? e.amountILS : convertToILS(e.amount, e.currency, rates)),
        0
      ),
    [expenses, rates]
  );
  const budget = config?.budgetTotalILS || DEFAULT_BUDGET_ILS;
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  const overBudget = spent > budget;
  const barColor = overBudget
    ? BAR_COLORS.over
    : spent / budget >= BUDGET_WARN_THRESHOLD
      ? BAR_COLORS.warn
      : BAR_COLORS.ok;

  const approvedCount = ideas.filter((i) => APPROVED_STATUS_IDS.includes(i.status)).length;
  const plannedDays = new Set(itinerary.map((i) => i.date)).size;
  const todoTasks = tasks.filter((t) => t.type === 'task');
  const packing = tasks.filter((t) => t.type === 'packing');
  const todoDone = todoTasks.filter((t) => t.done).length;
  const packDone = packing.filter((t) => t.done).length;

  const today = useToday(); // reactive — rolls over at midnight while the PWA stays alive
  const nextTask = useMemo(() => {
    const open = todoTasks.filter((t) => !t.done);
    const upcoming = open
      .filter((t) => t.dueDate)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const future = upcoming.find((t) => t.dueDate >= today);
    return future || upcoming[0] || open[0] || null;
  }, [todoTasks, today]);

  const statValues = {
    ideas: approvedCount,
    days: plannedDays,
    tasks: `${todoDone}/${todoTasks.length}`,
    packing: `${packDone}/${packing.length}`,
  };

  // In-app nudges (no push): overdue/soon tasks + budget pressure.
  const nudgeMessages = useMemo(() => {
    if (!NUDGES.enabled) return [];
    const msgs = [];
    const urg = summarizeTaskUrgency(tasks, today, NUDGES.taskDueSoonDays);
    if (urg.overdue > 0) msgs.push({ key: 'overdue', tone: 'over', text: fmt(CONTENT.nudges.overdue, { count: urg.overdue }) });
    else if (urg.soon > 0) msgs.push({ key: 'soon', tone: 'warn', text: fmt(CONTENT.nudges.dueSoon, { count: urg.soon }) });
    const bl = budgetLevel(spent, budget, BUDGET_WARN_THRESHOLD);
    if (bl === 'over') msgs.push({ key: 'budget', tone: 'over', text: fmt(CONTENT.nudges.overBudget, { amount: formatILS(spent - budget) }) });
    else if (bl === 'warn') msgs.push({ key: 'budget', tone: 'warn', text: CONTENT.nudges.nearBudget });
    return msgs;
  }, [tasks, today, spent, budget]);

  // Dismissal is keyed by a signature of the current nudges (+ the day), so a
  // NEW or more-urgent nudge re-appears even if an earlier one was dismissed today.
  const nudgeSig = nudgeMessages.map((m) => `${m.key}:${m.tone}`).join('|');
  const dismissKey = `${STORAGE_PREFIX}_nudge_dismissed_${today}`;
  const [dismissedSig, setDismissedSig] = useState('');
  // Re-read whenever the day (and so the key) changes — a dismissal is per-day,
  // and must not survive a midnight rollover while the app stays mounted.
  useEffect(() => {
    try {
      setDismissedSig(localStorage.getItem(dismissKey) || '');
    } catch {
      setDismissedSig('');
    }
  }, [dismissKey]);
  const showNudges = nudgeMessages.length > 0 && dismissedSig !== nudgeSig;
  const dismissNudges = () => {
    try {
      // Drop stale per-day keys so they don't accumulate forever.
      Object.keys(localStorage)
        .filter((k) => k.startsWith(`${STORAGE_PREFIX}_nudge_dismissed_`) && k !== dismissKey)
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(dismissKey, nudgeSig);
    } catch {
      /* ignore */
    }
    setDismissedSig(nudgeSig);
  };

  return (
    <div>
      {/* In-app nudge banner (dismissible for the day) */}
      {showNudges && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-start gap-2 rounded-2xl border border-white/70 bg-white/85 p-3 shadow-soft"
        >
          <div className="min-w-0 flex-1 space-y-1">
            {nudgeMessages.map((m) => (
              <p
                key={m.key}
                className="text-sm font-medium"
                style={{ color: m.tone === 'over' ? BAR_COLORS.over : BAR_COLORS.warn }}
              >
                {m.text}
              </p>
            ))}
          </div>
          <button
            onClick={dismissNudges}
            aria-label={CONTENT.nudges.dismiss}
            className="shrink-0 rounded-full bg-petal px-2 py-0.5 text-xs font-semibold text-ink-soft active:scale-95 transition"
          >
            ✕
          </button>
        </motion.div>
      )}
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="rounded-[2rem] border border-white/70 bg-gradient-to-bl from-petal to-white p-5 text-center shadow-soft"
      >
        <p className="text-sm text-ink-soft">
          {fmt(CONTENT.dashboard.heroGreeting, { name: profile?.label, emoji: profile?.emoji })}
        </p>
        <h1 className="mt-1 font-display text-2xl text-rose-deep">
          {leg.emoji} {leg.text}
        </h1>
        <p className="mb-4 text-sm text-ink-soft">{leg.sub}</p>
        <Countdown />
      </motion.section>

      {/* Budget + next task */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Link to="/budget" className="block rounded-2xl border border-white/70 bg-white/85 p-4 shadow-soft active:scale-[0.98] transition">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-rose-deep">{CONTENT.dashboard.budgetCard.title}</h2>
          <span className="text-sm font-semibold" style={{ color: barColor }}>
            {pct}%{overBudget ? ' ⚠️' : ''}
          </span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-petal">
          <motion.div
            className="h-full rounded-full"
            style={{ background: barColor }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
        <div className="mt-2 flex justify-between text-sm text-ink-soft">
          <span>{CONTENT.dashboard.budgetCard.spent} <b className="text-ink">{formatILS(spent)}</b></span>
          <span>{CONTENT.dashboard.budgetCard.of} {formatILS(budget)}</span>
        </div>
      </Link>

      {/* Next task */}
      <Link to="/tasks" className="block rounded-2xl border border-white/70 bg-white/85 p-4 shadow-soft active:scale-[0.98] transition">
        <h2 className="font-display text-lg text-rose-deep">{CONTENT.dashboard.nextTaskCard.title}</h2>
        {nextTask ? (
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="font-medium text-ink">{nextTask.title}</span>
            {nextTask.dueDate && (
              <span className="shrink-0 rounded-full bg-petal px-2.5 py-0.5 text-xs font-semibold text-rose-deep">
                {fmtDate(toDate(nextTask.dueDate))}
              </span>
            )}
          </div>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">{CONTENT.dashboard.nextTaskCard.none}</p>
        )}
      </Link>
      </div>

      {/* Quick stats */}
      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {CONTENT.dashboard.stats.map((s) => (
          <StatCard key={s.id} to={s.to} emoji={s.emoji} value={statValues[s.id]} label={s.label} tint={s.tint} />
        ))}
      </motion.div>

      {/* Travel Wallet shortcut */}
      <Link
        to="/wallet"
        className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-gradient-to-bl from-gold-soft/60 to-white p-4 shadow-soft active:scale-[0.99] transition"
      >
        <div>
          <div className="font-display text-lg text-rose-deep">{CONTENT.dashboard.walletShortcut.title}</div>
          <div className="text-sm text-ink-soft">{CONTENT.dashboard.walletShortcut.subtitle}</div>
        </div>
        <span className="text-2xl text-gold">←</span>
      </Link>
    </div>
  );
}
