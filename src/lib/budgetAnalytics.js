// ─────────────────────────────────────────────────────────────
// budgetAnalytics — pure, client-side derivations over the expenses we already
// have (no Firestore, no network). Powers the burn-rate / projection card and
// the spend-per-day trend on the Budget page.
//
// Dates are local "YYYY-MM-DD" strings; ISO lexical compare == chronological.
// ─────────────────────────────────────────────────────────────

// Whole days between two YYYY-MM-DD strings (b - a); local-midnight parse.
export function daysBetween(a, b) {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  return Math.round((db - da) / 86400000);
}

/**
 * @param expenses visible expenses
 * @param opts { today, tripStart, tripEnd, budget, ilsOf, warnThreshold }
 * @returns analytics object (see fields below); `null` when there are no expenses.
 */
export function computeBudgetAnalytics(expenses, { today, tripStart, tripEnd, budget, ilsOf, warnThreshold = 0.8 }) {
  if (!expenses || expenses.length === 0) return null;

  const spent = expenses.reduce((s, e) => s + ilsOf(e), 0);

  // Spend grouped by day → chronological series for the sparkline.
  const byDay = {};
  expenses.forEach((e) => {
    const d = e.date || today;
    byDay[d] = (byDay[d] || 0) + ilsOf(e);
  });
  const dailySeries = Object.keys(byDay)
    .sort()
    .map((date) => ({ date, total: byDay[date] }));

  const totalDays = Math.max(1, daysBetween(tripStart, tripEnd) + 1);
  const phase = today < tripStart ? 'pre' : today <= tripEnd ? 'during' : 'post';

  const base = {
    phase,
    spent,
    budget,
    totalDays,
    dailySeries,
    pct: budget > 0 ? spent / budget : 0,
  };

  if (phase === 'pre') {
    return {
      ...base,
      daysUntilTrip: Math.max(0, daysBetween(today, tripStart)),
      // Pre-trip we deliberately DON'T project trip spending from booking spend.
      projectedTotal: null,
      verdict: spent > budget ? 'over' : spent >= budget * warnThreshold ? 'warn' : 'ok',
    };
  }

  if (phase === 'post') {
    return {
      ...base,
      daysElapsed: totalDays,
      daysRemaining: 0,
      burnPerDay: spent / totalDays,
      projectedTotal: spent,
      verdict: spent > budget ? 'over' : 'ok',
    };
  }

  // during
  const daysElapsed = Math.max(1, daysBetween(tripStart, today) + 1);
  const daysRemaining = Math.max(0, daysBetween(today, tripEnd));
  // Burn rate is based on IN-TRIP spend only — a JR Pass / hotel booked & paid
  // before departure is committed spend, not a daily pace, so it must not be
  // divided across elapsed days and re-projected as if it recurs.
  const tripSpent = expenses
    .filter((e) => {
      const d = e.date || today;
      return d >= tripStart && d <= tripEnd;
    })
    .reduce((s, e) => s + ilsOf(e), 0);
  const burnPerDay = tripSpent / daysElapsed;
  // Already-spent total stays fixed; only the in-trip daily burn extrapolates.
  const projectedTotal = spent + burnPerDay * daysRemaining;
  const safeDaily = Math.max(0, budget - spent) / Math.max(1, daysRemaining);
  return {
    ...base,
    daysElapsed,
    daysRemaining,
    burnPerDay,
    projectedTotal,
    safeDaily,
    verdict: projectedTotal > budget ? 'over' : projectedTotal >= budget * warnThreshold ? 'warn' : 'ok',
  };
}
