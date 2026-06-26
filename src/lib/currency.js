import { useEffect, useState, useCallback } from 'react';
import config from '../config/tripConfig';

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
  const rates = { updatedAt: Date.now() };
  FOREIGN_CURRENCIES.forEach((c) => {
    rates[c.code] = json.rates?.[c.code] ?? FALLBACK_RATES[c.code];
  });
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

/**
 * Hook returning live exchange rates with localStorage caching.
 * { rates, loading, refresh }
 */
export function useRates() {
  const cached = readCache();
  const [rates, setRates] = useState(cached || FALLBACK_RATES);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRates(await fetchRates());
    } catch (e) {
      console.warn('Using fallback exchange rates:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fresh = cached && Date.now() - (cached.updatedAt || 0) < MAX_AGE_MS;
    if (!fresh) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rates, loading, refresh };
}
