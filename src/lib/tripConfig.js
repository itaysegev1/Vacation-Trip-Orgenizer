// ─────────────────────────────────────────────────────────────
// DERIVED LAYER (white-label refactor — Step 1).
//
// The real data now lives in src/config/tripConfig.ts. This module turns that
// single config into the EXACT shapes the rest of the app already imports —
// every export name, value, object-key order and field shape is preserved, so
// no consumer needs to change. Later steps will move individual components onto
// the config directly (and generalize the two-leg / two-traveller assumptions).
// ─────────────────────────────────────────────────────────────
import config from '../config/tripConfig';
import { fmt } from '../config/content';

// Local YYYY-MM-DD (avoids the UTC shift that toISOString causes in +offset TZs)
export const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// UTC YYYY-MM-DD — a single, timezone-independent "day". Used ONLY for the
// global FX-rate snapshot id so two phones in different timezones (e.g. one in
// Tokyo, one on a layover) never create two docs for the same day. Trip/day
// logic keeps using local `ymd`.
export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);

// Parse a local "YYYY-MM-DD" into a LOCAL-midnight Date — identical instant to
// the old `new Date(year, monthIndex, day, 0, 0, 0)` form.
const toDate = (s) => new Date(`${s}T00:00:00`);

// Public version for display formatters: bare `new Date('YYYY-MM-DD')` parses
// as UTC midnight, which renders as the PREVIOUS day in UTC-negative timezones.
// Full datetimes (with a 'T') pass through untouched.
export const parseLocalDate = (s) =>
  s instanceof Date ? s : String(s).includes('T') ? new Date(s) : toDate(s);

// How often useToday() re-checks the local date (see settings.timings).
export const TODAY_REFRESH_MS = config.settings.timings.todayRefreshMs;

// Interaction timings (undo window, long-press, countdown ticks, toast duration).
export const TIMINGS = config.settings.timings;
// Locale for all date display formatters (money formatters read it via currency.js).
export const DATE_LOCALE = config.locale.dateLocale;
// Firestore collection/doc paths per feature — the single place they're named.
export const COLLECTIONS = config.infra.collections;
// URL scheme prepended to schemeless links (Apps / Ideas).
export const LINK_SCHEME = config.settings.linkScheme;
// Prefix for every localStorage key the app owns.
export const STORAGE_PREFIX = config.app.storageKeyPrefix;
// Wallet ticket theming (perforation pattern + per-card-type accents).
export const TICKET_THEME = config.theme.ticket;
// Decorative particle palettes/counts (petals, confetti).
export const EFFECTS = config.theme.effects;
// Task-page tabs (tasks / packing).
export const TASK_TYPES = config.taxonomies.taskTypes;

const dests = config.destinations;

// ── App-level white-label surfaces ──────────────────────────────────────────
export { fmt };
export const CONTENT = config.content;
export const MODE = config.mode;
export const isHoneymoon = !!config.mode.isHoneymoon;
// Feature switches — each gates its route/nav-tab/component (see Layout/BottomNav).
export const FEATURES = config.mode.features;
export const BRANDING = config.branding;

// ── Dates & milestones ──────────────────────────────────────────────────────
export const TRIP_YEAR = config.trip.year;

// Milestones with real Date targets, gated by mode flags (e.g. isHoneymoon
// hides the wedding), sorted chronologically. Drives the dual countdown + chip.
export const MILESTONES = config.milestones
  .filter((m) => !m.gatedBy || config.mode[m.gatedBy])
  .map((m) => ({ ...m, date: toDate(m.date) }))
  .sort((a, b) => a.date - b.date);

// First & last day shown in the itinerary (YYYY-MM-DD)
export const ITINERARY_START = config.trip.startDate;
export const ITINERARY_END = config.trip.endDate;

// Which destination a local "YYYY-MM-DD" falls in — works for ANY number of
// legs (no binary boundary). Returns a destination id. Dates before the trip
// clamp to the first leg; a gap day BETWEEN legs (e.g. a travel day in a
// non-contiguous config) belongs to the UPCOMING leg; dates after the trip
// clamp to the last leg.
export function destinationForDate(dateStr) {
  if (!dateStr) return dests[0].id;
  const hit = dests.find((d) => dateStr >= d.startDate && dateStr <= d.endDate);
  if (hit) return hit.id;
  const next = dests.find((d) => dateStr < d.startDate);
  return next ? next.id : dests[dests.length - 1].id;
}

// Every day of the trip: { dateStr, label, countryId } — shared by the
// itinerary and the "Add to Itinerary" date picker.
export function tripDays() {
  const out = [];
  const start = toDate(ITINERARY_START);
  const end = toDate(ITINERARY_END);
  const fmt = new Intl.DateTimeFormat(config.locale.dateLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = ymd(d);
    out.push({
      dateStr,
      label: fmt.format(d),
      countryId: destinationForDate(dateStr),
    });
  }
  return out;
}

// ── Travellers → COUPLE (object keyed by id; Object.values order: travellers then shared) ──
const personEntry = (p) => ({ id: p.id, label: p.name, emoji: p.emoji });
export const COUPLE = {};
config.travellers.forEach((t) => {
  COUPLE[t.id] = personEntry(t);
});
COUPLE[config.sharedParty.id] = personEntry(config.sharedParty);

// Ordered traveller list (excludes the shared/"everyone" pseudo-traveller) and
// the shared party itself — for N-way budget splits, passenger expansion, etc.
export const TRAVELLERS = config.travellers.map(personEntry);
export const SHARED = personEntry(config.sharedParty);

// Per-traveller Wallet seat field key (seatItay / seatEitan …). Single source
// shared by the Wallet form and the ticket card so the stored shape stays in sync.
export const seatKey = (id) => 'seat' + String(id).charAt(0).toUpperCase() + String(id).slice(1);

// ── Destinations → COUNTRIES (object keyed by id, in config order) ──
export const COUNTRIES = {};
dests.forEach((d) => {
  COUNTRIES[d.id] = { id: d.id, label: d.name, flag: d.flag, accent: d.accentToken };
});

// ── Per-destination accent palette → LEG_THEMES (object keyed by id) ──
export const LEG_THEMES = {};
dests.forEach((d) => {
  LEG_THEMES[d.id] = {
    id: d.id,
    label: d.name,
    emoji: d.theme.emoji,
    accent: d.theme.accent,
    accentStrong: d.theme.accentStrong,
    chip: d.theme.chip,
    soft: d.theme.soft,
    ring: d.theme.ring,
    gradient: d.theme.gradient,
  };
});

export const legTheme = (id) =>
  LEG_THEMES[id] || LEG_THEMES[config.theme.fallbackAccentDestinationId];

// Canonical name going forward (legTheme kept as a back-compat alias).
export const themeFor = legTheme;

// Accent for the "all" / no-destination filter tab.
export const NEUTRAL_ACCENT = config.theme.neutralAccent;

// Ordered destinations (rich): leg hero copy, date ranges, emergency numbers,
// embassy and phrasebook — for the Dashboard phases and the Documents page.
export const DESTINATIONS = config.destinations.map((d) => ({
  id: d.id,
  name: d.name,
  label: d.name,
  flag: d.flag,
  iso: d.iso,
  startDate: d.startDate,
  endDate: d.endDate,
  currencyCode: d.currencyCode,
  legHero: d.legHero,
  emergencyNumbers: d.emergencyNumbers || [],
  embassy: d.embassy,
  phrasebookLang: d.phrasebookLang,
  phrasebook: d.phrasebook || [],
}));

// ── Taxonomies ──────────────────────────────────────────────────────────────
export const IDEA_CATEGORIES = config.taxonomies.ideaCategories.map((c) => ({
  id: c.id,
  label: c.label,
  emoji: c.emoji,
}));

// color = theme color-token name (consumed as var(--color-${color}))
export const IDEA_STATUSES = config.taxonomies.ideaStatuses.map((s) => ({
  id: s.id,
  label: s.label,
  color: s.color,
  bg: s.bg,
}));

// Idea-status ids that count as "approved" for the Dashboard metric.
export const APPROVED_STATUS_IDS = config.taxonomies.ideaStatuses
  .filter((s) => s.countsAsApproved)
  .map((s) => s.id);

export const SLOTS = config.taxonomies.slots.map((s) => ({
  id: s.id,
  label: s.label,
  emoji: s.emoji,
}));

export const EXPENSE_CATEGORIES = config.taxonomies.expenseCategories.map((c) => ({
  id: c.id,
  label: c.label,
  emoji: c.emoji,
  color: c.color,
}));

export const PACKING_CATEGORIES = config.taxonomies.packingCategories.map((c) => ({
  id: c.id,
  label: c.label,
  emoji: c.emoji,
}));

export const APP_CATEGORIES = config.taxonomies.appCategories.map((c) => ({
  id: c.id,
  label: c.label,
  emoji: c.emoji,
}));

// ── Useful-Apps surfaces (Apps page) — fully config-driven ──────────────────
// The per-destination tabs come straight from DESTINATIONS; the "all" and
// "general" (destination-agnostic) buckets come from content.apps. No literal
// japan/thailand anywhere.
export const APP_GENERAL = {
  id: 'general',
  label: config.content.apps.generalTab.label,
  flag: config.content.apps.generalTab.emoji,
};

// app.country → { flag, label } for the card byline + the form's country picker.
export const APP_COUNTRY = (() => {
  const m = {};
  DESTINATIONS.forEach((d) => {
    m[d.id] = { flag: d.flag, label: d.label };
  });
  m[APP_GENERAL.id] = { flag: APP_GENERAL.flag, label: APP_GENERAL.label };
  return m;
})();

// Segmented filter tabs: All · <each destination> · General.
export const APP_COUNTRY_TABS = [
  { id: 'all', label: config.content.apps.allTab.label, flag: config.content.apps.allTab.emoji },
  ...DESTINATIONS.map((d) => ({ id: d.id, label: d.label, flag: d.flag })),
  { id: APP_GENERAL.id, label: APP_GENERAL.label, flag: APP_GENERAL.flag },
];

// Recommended sample apps (one-tap seed) — from config.seed.apps.
export const SEED_APPS = config.seed.apps.map((a) => ({
  name: a.name,
  country: a.country,
  category: a.category,
  link: a.link,
}));

// ── Document types (single source of truth: config.taxonomies.documentTypes) ──
// Keyed object for form/preview lookups (Documents + Wallet).
export const DOC_TYPES = Object.fromEntries(
  config.taxonomies.documentTypes.map((t) => [t.id, t])
);
// Known flights (one-tap seed) — from config.seed.flights.
export const SEED_FLIGHTS = config.seed.flights.map((f) => ({ title: f.title, fields: f.fields }));

// Wallet surfaces, derived from the per-type `wallet` / `perPassenger` flags.
const walletDocTypes = config.taxonomies.documentTypes.filter((t) => t.wallet);
export const WALLET_TYPES = walletDocTypes.map((t) => t.id);
export const WALLET_TYPE_CHOOSER = walletDocTypes.map((t) => ({
  id: t.id,
  label: t.wallet.chooserLabel,
  emoji: t.emoji,
}));
export const WALLET_SECTIONS = walletDocTypes.map((t) => ({
  type: t.id,
  title: `${t.emoji} ${t.label}`,
  cols: t.wallet.twoCols,
}));
export const PER_PASSENGER_TYPES = new Set(
  config.taxonomies.documentTypes.filter((t) => t.perPassenger).map((t) => t.id)
);

// ── Currencies → object keyed by code (order: foreign-by-destination, then base) ──
export const CURRENCIES = {};
[
  ...dests
    .map((d) => config.currencies.find((c) => c.code === d.currencyCode))
    .filter(Boolean),
  ...config.currencies.filter((c) => c.isBase),
].forEach((c) => {
  CURRENCIES[c.code] = { code: c.code, symbol: c.symbol, label: c.label, flag: c.flag };
});

export const DEFAULT_BUDGET_ILS = config.budget.defaultTotal;

// Ignore settlement balances smaller than this (in base currency).
export const SETTLEMENT_THRESHOLD = config.budget.settlementThreshold;

// ── Smart-feature config surfaces (Spark-tier additions) ─────────────────────
// Shared FX rate doc (L2 cache) + daily history snapshots + budget analytics.
export const SHARED_RATES = config.budget.sharedRates;     // { docPath, enabled }
export const RATE_HISTORY = config.budget.rateHistory;     // { collection, maxPoints, enabled }
export const ANALYTICS = config.budget.analytics;          // { enabled }
export const SUMMARY_DOC = config.budget.summaryDoc;       // { path, enabled } — off by default

// Geocoder — countryCodes auto-derived from destinations[].iso when blank, so a
// re-skinned trip biases to its own countries with no extra config.
export const GEOCODER = {
  ...config.infra.geocoder,
  countryCodes:
    config.infra.geocoder.countryCodes ||
    dests.map((d) => String(d.iso || '').toLowerCase()).filter(Boolean).join(','),
};

// Walking-speed / nearby-radius for itinerary optimization; in-app nudge config.
export const GEO_SETTINGS = config.settings.geo;           // { walkingSpeedKmh, nearbyRadiusKm }
export const NUDGES = config.settings.nudges;              // { enabled, taskDueSoonDays }
export const BUDGET_WARN_THRESHOLD = config.budget.warnThreshold;
export const BAR_COLORS = config.budget.barColors;         // { over, warn, ok }

// Lookup helper
export const byId = (list, id) => list.find((x) => x.id === id);
