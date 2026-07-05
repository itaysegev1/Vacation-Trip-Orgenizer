import { useEffect, useMemo, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, isDemo } from './firebase';
import * as demo from './demoStore';
import { useCollection } from './useCollection';
import { FOREIGN_CURRENCIES, BASE_CURRENCY } from './currency';
import { RATE_HISTORY, utcDay, legTheme } from './tripConfig';

// ─────────────────────────────────────────────────────────────
// useRateHistory(rates) — daily FX snapshots for the Budget history charts.
//
// Takes `rates` from the page's single useRates() (so the Budget page doesn't
// open a second meta/rates subscription). Writes today's snapshot at most once
// per UTC day: the write is gated on the collection having LOADED (otherwise the
// empty-docs race would rewrite today's doc on every page open) and on real (not
// fallback) rates. Doc id = utcDay() → timezone-independent + idempotent.
//
// Returns one chart series per foreign currency, each carrying its own aligned
// `dates` so LineChart can label the X axis.
// ─────────────────────────────────────────────────────────────
export function useRateHistory(rates) {
  const { docs, loading } = useCollection(RATE_HISTORY.collection);
  // Latch by DAY (not a boolean) so a page kept mounted across UTC midnight
  // still writes the new day's snapshot on the next rates/docs update.
  const wroteForDayRef = useRef('');

  useEffect(() => {
    const today = utcDay();
    if (!RATE_HISTORY.enabled || wroteForDayRef.current === today) return;
    if (loading) return; // wait for the collection so we don't rewrite today every open
    if (!rates || !rates.updatedAt || rates.partial) return; // never snapshot fallback/partial rates
    if (docs.some((d) => d.date === today)) {
      wroteForDayRef.current = today;
      return;
    }
    wroteForDayRef.current = today;
    const payload = { date: today, base: BASE_CURRENCY.code };
    FOREIGN_CURRENCIES.forEach((c) => {
      if (rates[c.code] != null) payload[c.code] = rates[c.code];
    });
    if (isDemo) demo.demoAdd(RATE_HISTORY.collection, payload);
    else if (db) setDoc(doc(db, RATE_HISTORY.collection, today), payload, { merge: true }).catch(() => {});
  }, [rates, docs, loading]);

  const series = useMemo(() => {
    const sorted = [...docs]
      .filter((d) => d.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      // Enforce the configured cap — chart the most recent N days only.
      .slice(-RATE_HISTORY.maxPoints);
    return FOREIGN_CURRENCIES.map((c) => {
      const pts = sorted.filter((d) => d[c.code] != null);
      return {
        key: c.code,
        symbol: c.symbol,
        flag: c.flag,
        label: `${c.flag} ${c.label}`,
        color: legTheme(c.linkedDestinationId).accentStrong,
        rateDigits: c.rateDigits ?? 1,
        values: pts.map((d) => d[c.code]),
        dates: pts.map((d) => d.date),
      };
    }).filter((s) => s.values.length > 0);
  }, [docs]);

  const points = series.reduce((m, s) => Math.max(m, s.values.length), 0);
  return { series, points };
}
