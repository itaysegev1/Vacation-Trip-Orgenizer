import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useCollection, useDocument } from '../lib/useCollection';
import {
  useRates,
  convertToILS,
  formatILS,
  formatMoney,
  BASE_CURRENCY,
  FOREIGN_CURRENCIES,
} from '../lib/currency';
import { useAuth } from '../context/AuthContext';
import {
  CURRENCIES,
  EXPENSE_CATEGORIES,
  COUNTRIES,
  COUPLE,
  TRAVELLERS,
  SHARED,
  SETTLEMENT_THRESHOLD,
  DEFAULT_BUDGET_ILS,
  DESTINATIONS,
  LEG_THEMES,
  destinationForDate,
  ITINERARY_START,
  ITINERARY_END,
  ANALYTICS,
  BAR_COLORS,
  BUDGET_WARN_THRESHOLD,
  ymd,
  byId,
  parseLocalDate,
  COLLECTIONS,
  DATE_LOCALE,
  CONTENT,
} from '../lib/tripConfig';
import { useToday } from '../lib/useToday';
import { input, labelCls, btnPrimary } from '../lib/ui';
import { listContainer, tap } from '../lib/motionVariants';
import { AnimatePresence } from 'motion/react';
import Modal from '../components/Modal';
import SwipeableRow from '../components/SwipeableRow';
import DonutChart from '../components/DonutChart';
import LineChart from '../components/LineChart';
import EmptyState from '../components/EmptyState';
import { computeBudgetAnalytics } from '../lib/budgetAnalytics';
import { useRateHistory } from '../lib/useRateHistory';
import { useUndo } from '../context/UndoContext';

const todayStr = () => ymd(new Date()); // local date (avoids UTC day-shift)
const fmtDate = (s) =>
  new Intl.DateTimeFormat(DATE_LOCALE, { day: 'numeric', month: 'short' }).format(parseLocalDate(s));
// Short numeric date for chart X-axis labels (local-midnight parse).
const shortDate = (s) =>
  new Intl.DateTimeFormat(DATE_LOCALE, { day: 'numeric', month: 'numeric' }).format(new Date(`${s}T00:00:00`));

// Minimal "who owes whom" settlement: greedily match debtors to creditors.
// For two travellers this yields exactly one transaction (or none if balanced).
function settle(balances, threshold) {
  const creditors = balances
    .filter((b) => b.balance > threshold)
    .map((b) => ({ ...b, rem: b.balance }))
    .sort((a, b) => b.rem - a.rem);
  const debtors = balances
    .filter((b) => b.balance < -threshold)
    .map((b) => ({ ...b, rem: -b.balance }))
    .sort((a, b) => b.rem - a.rem);
  const tx = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].rem, creditors[j].rem);
    tx.push({ from: debtors[i], to: creditors[j], amount });
    debtors[i].rem -= amount;
    creditors[j].rem -= amount;
    if (debtors[i].rem <= threshold) i += 1;
    if (creditors[j].rem <= threshold) j += 1;
  }
  return tx;
}

export default function Budget() {
  const { docs, add, update, remove } = useCollection(COLLECTIONS.expenses);
  const { data: config, save: saveConfig } = useDocument(COLLECTIONS.settingsConfig);
  const { rates, loading: ratesLoading, refresh } = useRates();
  const { series: rateSeries, points: ratePoints } = useRateHistory(rates);
  const { profile } = useAuth();
  const { requestDelete, hiddenIds } = useUndo();
  const today = useToday(); // reactive — rolls over at midnight while the PWA stays alive

  const budget = config?.budgetTotalILS || DEFAULT_BUDGET_ILS;

  // Exclude optimistically-deleted (pending-undo) expenses from every view.
  const visible = useMemo(() => docs.filter((d) => !hiddenIds.has(d.id)), [docs, hiddenIds]);

  const EMPTY = useMemo(
    () => ({
      title: '',
      amount: '',
      currency: FOREIGN_CURRENCIES[0]?.code || 'JPY',
      category: EXPENSE_CATEGORIES[0]?.id || 'food',
      paidBy: profile?.id || SHARED.id,
      date: today,
      linkedDestination: destinationForDate(today),
      linkedActivity: '',
    }),
    [profile, today]
  );

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(budget));

  const ilsOf = (e) => (e.amountILS != null ? e.amountILS : convertToILS(e.amount, e.currency, rates));
  const deleteExpense = (e) => requestDelete(e.id, e.title, () => remove(e.id));

  const spent = useMemo(() => visible.reduce((s, e) => s + ilsOf(e), 0), [visible, rates]);
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  const over = spent > budget;
  const barColor = over
    ? BAR_COLORS.over
    : spent / budget >= BUDGET_WARN_THRESHOLD
      ? BAR_COLORS.warn
      : BAR_COLORS.ok;

  const byCategory = useMemo(() => {
    const map = {};
    visible.forEach((e) => (map[e.category] = (map[e.category] || 0) + ilsOf(e)));
    return EXPENSE_CATEGORIES.map((c) => ({ ...c, total: map[c.id] || 0 })).filter((c) => c.total > 0);
  }, [visible, rates]);

  // Client-side burn-rate / projection + spend-per-day trend (no backend).
  const analytics = useMemo(
    () =>
      ANALYTICS.enabled
        ? computeBudgetAnalytics(visible, {
            today,
            tripStart: ITINERARY_START,
            tripEnd: ITINERARY_END,
            budget,
            ilsOf,
            warnThreshold: BUDGET_WARN_THRESHOLD,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, rates, budget, today]
  );

  // Spend per destination — manual link wins, else fall back to the date.
  // Keyed by destination id (config-driven), so it generalizes to any N legs.
  const byLeg = useMemo(() => {
    const totals = Object.fromEntries(DESTINATIONS.map((d) => [d.id, 0]));
    visible.forEach((e) => {
      const id = e.linkedDestination || destinationForDate(e.date);
      if (totals[id] != null) totals[id] += ilsOf(e);
    });
    return { totals, max: Math.max(1, ...Object.values(totals)) };
  }, [visible, rates]);

  const split = useMemo(() => {
    // Per-traveller "paid" totals; a shared (or unknown-payer) expense is split
    // equally across all travellers. Generalizes to any N travellers.
    const paid = Object.fromEntries(TRAVELLERS.map((t) => [t.id, 0]));
    let total = 0;
    visible.forEach((e) => {
      const v = ilsOf(e);
      total += v;
      if (paid[e.paidBy] != null) paid[e.paidBy] += v;
      else TRAVELLERS.forEach((t) => (paid[t.id] += v / TRAVELLERS.length));
    });
    const fairShare = total / TRAVELLERS.length;
    const perTraveller = TRAVELLERS.map((t) => ({
      ...t,
      paid: paid[t.id],
      balance: paid[t.id] - fairShare, // >0 → others owe this traveller
    }));
    return { perTraveller, settlements: settle(perTraveller, SETTLEMENT_THRESHOLD) };
  }, [visible, rates]);

  const sorted = useMemo(
    () => [...visible].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [visible]
  );

  const openNew = () => {
    setForm(EMPTY);
    setEditing({});
  };
  const openEdit = (e) => {
    setForm({
      ...EMPTY,
      ...e,
      amount: String(e.amount ?? ''),
      linkedDestination: e.linkedDestination || destinationForDate(e.date),
      linkedActivity: e.linkedActivity || '',
    });
    setEditing(e);
  };
  const close = () => setEditing(null);

  const save = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !amount) return;
    // Firestore rejects `undefined`; fall back to null if a rate is missing.
    const rateUsed = form.currency === BASE_CURRENCY.code ? 1 : rates[form.currency] ?? null;
    const data = {
      title: form.title.trim(),
      amount,
      currency: form.currency,
      amountILS: convertToILS(amount, form.currency, rates),
      rateUsed,
      category: form.category,
      paidBy: form.paidBy,
      date: form.date || todayStr(),
      // Manual "related to" link (destination + specific activity).
      linkedDestination: form.linkedDestination || destinationForDate(form.date),
      linkedActivity: form.linkedActivity.trim(),
    };
    // Don't await: offline the write stays pending until reconnect; the local
    // cache already reflects it, so close immediately and surface real failures.
    (editing?.id ? update(editing.id, data) : add(data)).catch((err) =>
      console.error('expense save failed', err)
    );
    close();
  };

  return (
    <div>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl text-rose-deep">תקציב 💰</h1>
          <p className="text-sm text-ink-soft">{visible.length} הוצאות</p>
        </div>
        <motion.button whileTap={tap} onClick={openNew} className={btnPrimary}>
          הוצאה +
        </motion.button>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      {/* Summary column */}
      <div className="min-w-0">
      {/* Budget bar */}
      <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <span className="font-display text-2xl" style={{ color: barColor }}>
            {formatILS(spent)}
          </span>
          <button
            onClick={() => {
              setBudgetInput(String(budget));
              setBudgetModal(true);
            }}
            className="text-sm font-semibold text-ink-soft active:scale-95 transition"
          >
            מתוך {formatILS(budget)} ✏️
          </button>
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
        <div className="mt-2 flex items-center justify-between text-sm text-ink-soft">
          <span>{pct}% נוצל{over ? ' ⚠️ חריגה' : ''}</span>
          <button onClick={refresh} className="text-jade active:scale-95 transition">
            {ratesLoading ? (
              'מעדכן שער…'
            ) : (
              <>
                שער:{' '}
                <span dir="ltr">
                  1{BASE_CURRENCY.symbol} ={' '}
                  {FOREIGN_CURRENCIES.map(
                    (c) => `${rates[c.code]?.toFixed(c.rateDigits ?? 1)}${c.symbol}`
                  ).join(' · ')}
                </span>{' '}
                🔄
              </>
            )}
          </button>
        </div>
      </div>

      {/* FX rate trend — one axed chart per currency (¥/฿ have different scales).
          Shows from the first snapshot and fills into a trend over the coming days. */}
      {rateSeries.length > 0 && ratePoints >= 1 && (
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 p-4 shadow-soft">
          <h2 className="mb-1 font-display text-lg text-rose-deep">מגמת שער 📈</h2>
          <p className="mb-2 text-xs text-ink-soft">כמה {BASE_CURRENCY.symbol}1 שווה לאורך זמן</p>
          <div className="space-y-4">
            {rateSeries.map((s) => (
              <LineChart
                key={s.key}
                title={s.label}
                values={s.values}
                labels={s.dates.map(shortDate)}
                color={s.color}
                formatY={(v) => `${v.toFixed(s.rateDigits)}${s.symbol}`}
                animate={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pace / projection — client-side analytics */}
      {analytics && (
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 p-4 shadow-soft">
          <h2 className="mb-2 font-display text-lg text-rose-deep">קצב והערכה 📈</h2>
          {analytics.phase === 'pre' && (
            <p className="text-sm text-ink">
              עוד <b>{analytics.daysUntilTrip}</b> ימים לטיול · הוזמן עד כה{' '}
              <b style={{ color: BAR_COLORS[analytics.verdict] }}>{formatILS(analytics.spent)}</b> (
              {Math.round(analytics.pct * 100)}% מהתקציב)
            </p>
          )}
          {analytics.phase === 'during' && (
            <>
              <p className="text-sm text-ink">
                קצב: <b>{formatILS(analytics.burnPerDay)}</b>/יום · בקצב הזה עד סוף הטיול:{' '}
                <b style={{ color: BAR_COLORS[analytics.verdict] }}>{formatILS(analytics.projectedTotal)}</b> (
                {Math.round((analytics.projectedTotal / budget) * 100)}%
                {analytics.verdict === 'over' ? ' ⚠️' : ''})
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                נשארו {analytics.daysRemaining} ימים · {formatILS(analytics.safeDaily)}/יום כדי לעמוד ביעד
              </p>
            </>
          )}
          {analytics.phase === 'post' && (
            <p className="text-sm text-ink">
              סה״כ בטיול:{' '}
              <b style={{ color: BAR_COLORS[analytics.verdict] }}>{formatILS(analytics.spent)}</b> מתוך{' '}
              {formatILS(budget)}
            </p>
          )}
          {analytics.dailySeries.length >= 1 && (
            <div className="mt-3">
              <p className="mb-1 text-xs text-ink-soft">הוצאה יומית ({BASE_CURRENCY.symbol})</p>
              <LineChart
                values={analytics.dailySeries.map((d) => d.total)}
                labels={analytics.dailySeries.map((d) => shortDate(d.date))}
                color={BAR_COLORS[analytics.verdict]}
                formatY={(v) => formatILS(v)}
                zeroBased
              />
            </div>
          )}
        </div>
      )}

      {/* Split — one card per traveller */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {split.perTraveller.map((t) => (
          <div key={t.id} className="rounded-2xl border border-white/70 bg-white/85 p-4 text-center shadow-soft">
            <div className="text-2xl">{t.emoji}</div>
            <div className="font-display text-lg text-ink">{formatILS(t.paid)}</div>
            <div className="text-xs text-ink-soft">{t.label} שילם</div>
          </div>
        ))}
      </div>
      {split.settlements.map((s) => (
        <p
          key={`${s.from.id}->${s.to.id}`}
          className="mt-2 rounded-2xl bg-jade-soft px-4 py-2 text-center text-sm font-medium text-ink"
        >
          {`${s.from.label} חייב ל${s.to.label} ${formatILS(s.amount)} 💸`}
        </p>
      ))}

      {/* Category breakdown — animated donut + legend */}
      {byCategory.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 p-4 shadow-soft">
          <h2 className="mb-3 font-display text-lg text-rose-deep">לפי קטגוריה</h2>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
            <DonutChart
              data={byCategory.map((c) => ({ label: c.label, value: c.total, color: c.color }))}
              centerValue={formatILS(spent)}
              centerLabel="סה״כ"
            />
            <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2 sm:flex-1 sm:grid-cols-1">
              {byCategory.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                    <span className="truncate">{c.emoji} {c.label}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-ink">{formatILS(c.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Destination spend comparison — one bar per configured destination */}
      {Object.values(byLeg.totals).some((v) => v > 0) && (
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 p-4 shadow-soft">
          <h2 className="mb-3 font-display text-lg text-rose-deep">השוואת יעדים</h2>
          <div className="space-y-3">
            {DESTINATIONS.map((d) => (
              <div key={d.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{d.flag} {d.label}</span>
                  <span className="font-semibold text-ink">{formatILS(byLeg.totals[d.id] || 0)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-petal">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: LEG_THEMES[d.id]?.accent || 'var(--color-sakura)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${((byLeg.totals[d.id] || 0) / byLeg.max) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      </div>{/* /summary column */}

      {/* Expenses column */}
      <div className="min-w-0">
      {/* Expense list */}
      <h2 className="mt-5 mb-2 font-display text-lg text-rose-deep lg:mt-0">כל ההוצאות</h2>
      {sorted.length === 0 ? (
        <EmptyState
          emoji="💸"
          title={CONTENT.budget.emptyTitle}
          subtitle={CONTENT.budget.emptySubtitle}
          action={
            <button
              onClick={openNew}
              className="rounded-2xl bg-rose-deep px-4 py-2 font-semibold text-white shadow-soft active:scale-95 transition"
            >
              הוספת הוצאה ראשונה
            </button>
          }
        />
      ) : (
        <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-2">
          <AnimatePresence>
            {sorted.map((e) => {
              const cat = byId(EXPENSE_CATEGORIES, e.category);
              const payer = byId(Object.values(COUPLE), e.paidBy);
              return (
                <SwipeableRow key={e.id} onDelete={() => deleteExpense(e)}>
                  <button
                    type="button"
                    onClick={() => openEdit(e)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/90 p-3 text-right shadow-soft transition active:scale-[0.99]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-petal text-xl">
                        {cat?.emoji || '✨'}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-ink">{e.title}</div>
                        <div className="flex min-w-0 items-center gap-1.5 text-xs text-ink-soft">
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-petal text-[0.7rem]">
                            {payer?.emoji}
                          </span>
                          <span className="shrink-0">{fmtDate(e.date || todayStr())}</span>
                          {e.linkedActivity && <span className="truncate">· 🔗 {e.linkedActivity}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-left">
                      <div className="font-semibold text-ink">{formatILS(ilsOf(e))}</div>
                      {e.currency !== BASE_CURRENCY.code && (
                        <div className="text-xs text-ink-soft">{formatMoney(e.amount, e.currency)}</div>
                      )}
                    </div>
                  </button>
                </SwipeableRow>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
      </div>{/* /expenses column */}
      </div>{/* /2-col grid */}

      {/* Add / edit expense */}
      <Modal open={editing !== null} onClose={close} title={editing?.id ? 'עריכת הוצאה' : 'הוצאה חדשה 🧾'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className={labelCls}>על מה?</label>
            <input
              className={input}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="ארוחה, כרטיס רכבת, מלון…"
              autoFocus
              required
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>סכום</label>
              <input
                className={input}
                type="number"
                inputMode="decimal"
                dir="ltr"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className={labelCls}>מטבע</label>
              <div className="flex gap-1">
                {Object.values(CURRENCIES).map((c) => (
                  <button
                    type="button"
                    key={c.code}
                    onClick={() => setForm({ ...form, currency: c.code })}
                    className={`rounded-xl px-3 py-2.5 font-semibold transition active:scale-95 ${
                      form.currency === c.code ? 'bg-sakura text-white' : 'bg-petal text-ink-soft'
                    }`}
                  >
                    {c.symbol}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {form.currency !== BASE_CURRENCY.code && Number(form.amount) > 0 && (
            <p className="rounded-xl bg-jade-soft px-3 py-2 text-sm text-ink">
              ≈ {formatILS(convertToILS(form.amount, form.currency, rates))}
            </p>
          )}

          <div>
            <label className={labelCls}>קטגוריה</label>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setForm({ ...form, category: c.id })}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                    form.category === c.id ? 'bg-rose-deep text-white' : 'bg-petal text-ink-soft'
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>קשור ל-</label>
            <div className="grid grid-cols-[8rem_1fr] gap-2">
              <select
                className={input}
                value={form.linkedDestination}
                onChange={(e) => setForm({ ...form, linkedDestination: e.target.value })}
                aria-label="יעד"
              >
                {Object.values(COUNTRIES).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.flag} {c.label}
                  </option>
                ))}
              </select>
              <input
                className={input}
                value={form.linkedActivity}
                onChange={(e) => setForm({ ...form, linkedActivity: e.target.value })}
                placeholder="פעילות ספציפית (אופציונלי)"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>מי שילם</label>
            <div className="flex gap-2">
              {Object.values(COUPLE).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setForm({ ...form, paidBy: p.id })}
                  className={`flex-1 rounded-2xl py-2.5 font-semibold transition active:scale-95 ${
                    form.paidBy === p.id ? 'bg-sakura text-white' : 'bg-petal text-ink-soft'
                  }`}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>תאריך</label>
            <input
              className={input}
              type="date"
              dir="ltr"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-1">
            {editing?.id && (
              <button
                type="button"
                onClick={() => {
                  const target = editing;
                  close();
                  deleteExpense(target);
                }}
                className="rounded-2xl bg-petal px-4 py-2.5 font-semibold text-rose-deep transition active:scale-95"
              >
                מחיקה 🗑️
              </button>
            )}
            <button type="submit" className={`${btnPrimary} flex-1`}>
              שמירה 💾
            </button>
          </div>
        </form>
      </Modal>

      {/* Budget target */}
      <Modal open={budgetModal} onClose={() => setBudgetModal(false)} title="יעד תקציב 🎯">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveConfig({ budgetTotalILS: Number(budgetInput) || DEFAULT_BUDGET_ILS }).catch((err) =>
              console.error('budget save failed', err)
            );
            setBudgetModal(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className={labelCls}>תקציב כולל ({BASE_CURRENCY.symbol})</label>
            <input
              className={input}
              type="number"
              dir="ltr"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className={`${btnPrimary} w-full`}>
            שמירה 💾
          </button>
        </form>
      </Modal>
    </div>
  );
}
