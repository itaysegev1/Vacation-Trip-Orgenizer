import { useEffect, useState, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import config from '../config/tripConfig';
import { db, isDemo } from './firebase';
import { SHARED_RATES } from './tripConfig';
import * as demo from './demoStore';

// ─────────────────────────────────────────────────────────────
// Currency layer — fully config-driven (white-label refactor, Step 4).
//
// The base currency, the active foreign currencies, the rate-API endpoint,
// cache key, max age and fallback rates all come from src/config/tripConfig.ts.
// Rates are expressed as "foreign units per 1 base" (e.g. JPY 53.9 → 1 ₪ = 53.9 ¥).
// Adding a destination currency to the config now flows end-to-end: it is
// fetched, cached, converted and formatted with no code change here.
// ─────────────────────────────────────────────────────────────

const CURRENCY_LIST = config.currencies;
const BY_CODE = Object.fromEntries(CURRENCY_LIST.map((c) => [c.code, c]));

export const currencyByCode = (code) => BY_CODE[code];
export const BASE_CURRENCY = CURRENCY_LIST.find((c) => c.isBase) || CURRENCY_LIST[0];
export const FOREIGN_CURRENCIES = CURRENCY_LIST.filter((c) => !c.isBase);

const BASE = BASE_CURRENCY.code;
const LOCALE = config.locale.dateLocale;

const { urlTemplate, cacheKey: CACHE_KEY, maxAgeMs: MAX_AGE_MS } = config.budget.exchangeRateApi;
// Human-readable source label for the shared rates doc — the API's hostname.
const RATE_SOURCE = (() => {
  try {
    return new URL(urlTemplate).hostname;
  } catch {
    return 'api';
  }
})();
const API_URL = urlTemplate.replace('{base}', BASE);

// Offline fallback (foreign-per-1-base), straight from config + a 0 timestamp.
export const FALLBACK_RATES = { ...config.budget.fallbackRates, updatedAt: 0 };

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function fetchRates() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error('rate fetch failed');
  const json = await res.json();
  if (json.result !== 'success') throw new Error('rate api error');
  // Pull a rate for EVERY configured foreign currency (no hardcoded keys).
  // Flag the result `partial` if the API omitted any currency (we then fall back
  // to the offline value) so we don't snapshot a non-real rate into history.
  const rates = { updatedAt: Date.now() };
  let partial = false;
  FOREIGN_CURRENCIES.forEach((c) => {
    const v = json.rates?.[c.code];
    if (v == null) partial = true;
    rates[c.code] = v ?? FALLBACK_RATES[c.code];
  });
  if (partial) rates.partial = true;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rates));
  } catch {
    /* ignore quota */
  }
  return rates;
}

/** Convert any supported currency to the BASE currency. Returns a number. */
export function convertToILS(amount, currency, rates) {
  const n = Number(amount) || 0;
  if (currency === BASE) return n;
  const rate = rates?.[currency];
  if (!rate) return n; // unknown — show as-is rather than zeroing it out
  return n / rate;
}
// Forward-compatible alias (base is configurable, not necessarily ILS).
export const convertToBase = convertToILS;

export function formatILS(amount) {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: BASE,
    maximumFractionDigits: BASE_CURRENCY.fractionDigits,
  }).format(Math.round(Number(amount) || 0));
}
export const formatBase = formatILS;

export function formatMoney(amount, currency) {
  const digits = currencyByCode(currency)?.fractionDigits ?? 2;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    maximumFractionDigits: digits,
  }).format(Number(amount) || 0);
}

function writeLocal(r) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(r));
  } catch {
    /* ignore quota */
  }
}

// Push freshly-fetched rates to the shared L2 doc so the other phone reads the
// same value without its own API call. Best-effort, never awaited (offline-safe).
function writeSharedRates(fresh) {
  if (!db) return;
  // Never share partial results: the payload below drops the `partial` flag, so
  // a fallback rate would masquerade as a real one on the other phone (and get
  // snapshotted into the permanent rateHistory). Shared doc = real API rates only.
  if (fresh.partial) return;
  const payload = { base: BASE, source: RATE_SOURCE, updatedAt: fresh.updatedAt || Date.now() };
  FOREIGN_CURRENCIES.forEach((c) => {
    payload[c.code] = fresh[c.code];
  });
  try {
    setDoc(doc(db, SHARED_RATES.docPath), payload, { merge: true }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/**
 * Live exchange rates with a 3-layer cache:
 *   L1 localStorage (instant paint) → L2 shared Firestore doc `meta/rates`
 *   (one client fetches, both read) → L3 the rate API (last resort).
 * Returns the same { rates, loading, refresh } contract as before.
 */
export function useRates() {
  const cached = readCache();
  const [rates, setRates] = useState(cached || FALLBACK_RATES);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false); // ensure only one L3 fetch per mount
  const heldUpdatedAtRef = useRef(cached?.updatedAt || 0); // freshness of the rates we hold

  const refresh = useCallback(async () => {
    if (isDemo) return; // demo rates are seeded in-memory; never hit the network
    setLoading(true);
    try {
      const fresh = await fetchRates(); // also writes L1
      setRates(fresh);
      heldUpdatedAtRef.current = Math.max(heldUpdatedAtRef.current, fresh.updatedAt || Date.now());
      if (SHARED_RATES.enabled) writeSharedRates(fresh); // push to L2
    } catch (e) {
      console.warn('Using fallback exchange rates:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Demo: read the seeded shared doc from the in-memory store, no network.
    if (isDemo) {
      if (!SHARED_RATES.enabled) return undefined;
      return demo.demoSubDoc(SHARED_RATES.docPath, (d) => {
        if (d) setRates(d);
      });
    }
    // Shared disabled or Firebase not configured → original local-only behavior.
    if (!SHARED_RATES.enabled || !db) {
      const fresh = cached && Date.now() - (cached.updatedAt || 0) < MAX_AGE_MS;
      if (!fresh) refresh();
      return undefined;
    }
    // Shared enabled: subscribe to L2. Adopt it when fresher; if it's missing or
    // older than the TTL, exactly one client fetches L3 and writes L2.
    const unsub = onSnapshot(
      doc(db, SHARED_RATES.docPath),
      (snap) => {
        const shared = snap.exists() ? snap.data() : null;
        const validBase = shared && shared.base === BASE;
        if (validBase) {
          setRates((prev) => ((shared.updatedAt || 0) >= (prev.updatedAt || 0) ? shared : prev));
          writeLocal(shared);
          heldUpdatedAtRef.current = Math.max(heldUpdatedAtRef.current, shared.updatedAt || 0);
        }
        // Fetch only when neither the shared doc NOR the rates we already hold are
        // fresh — a device with a fresh L1 cache shouldn't re-hit the API.
        const effectiveFresh =
          heldUpdatedAtRef.current > 0 && Date.now() - heldUpdatedAtRef.current < MAX_AGE_MS;
        if (!effectiveFresh && !fetchedRef.current) {
          fetchedRef.current = true;
          refresh();
        }
      },
      (err) => console.warn('shared rates snapshot:', err.message)
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rates, loading, refresh };
}
