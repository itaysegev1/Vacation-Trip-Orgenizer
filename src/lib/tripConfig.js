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

// Parse a local "YYYY-MM-DD" into a LOCAL-midnight Date — identical instant to
// the old `new Date(year, monthIndex, day, 0, 0, 0)` form.
const toDate = (s) => new Date(`${s}T00:00:00`);

const dests = config.destinations;
const milestoneDate = (id) => config.milestones.find((m) => m.id === id)?.date;

// ── App-level white-label surfaces ──────────────────────────────────────────
export { fmt };
export const CONTENT = config.content;
export const MODE = config.mode;
export const isHoneymoon = !!config.mode.isHoneymoon;
export const BRANDING = config.branding;

// ── Dates & milestones ──────────────────────────────────────────────────────
export const TRIP_YEAR = config.trip.year;

// Milestones with real Date targets, gated by mode flags (e.g. isHoneymoon
// hides the wedding), sorted chronologically. Drives the dual countdown + chip.
export const MILESTONES = config.milestones
  .filter((m) => !m.gatedBy || config.mode[m.gatedBy])
  .map((m) => ({ ...m, date: toDate(m.date) }))
  .sort((a, b) => a.date - b.date);

export const TRIP = {
  // The wedding 💍 (first countdown milestone)
  wedding: toDate(milestoneDate('wedding')),
  // Takeoff (the countdown target)
  takeoff: toDate(milestoneDate('takeoff')),
  // Landing in the first destination — itinerary starts here
  landJapan: toDate(dests[0].startDate),
  // First leg → second leg crossover
  toThailand: toDate(dests[1].startDate),
  // Return flight home — itinerary ends here
  return: toDate(milestoneDate('return')),
};

// First & last day shown in the itinerary (YYYY-MM-DD)
export const ITINERARY_START = config.trip.startDate;
export const ITINERARY_END = config.trip.endDate;
// First leg ends / second leg begins on this date (the single boundary used by
// the current two-destination logic; Step 3 generalizes this to N legs).
export const THAILAND_FROM = dests[1].startDate;

// Which destination a local "YYYY-MM-DD" falls in — replaces the old binary
// `< THAILAND_FROM` boundary so ANY number of legs Just Works. Returns a
// destination id. Dates outside every range clamp to the first / last leg.
export function destinationForDate(dateStr) {
  if (!dateStr) return dests[0].id;
  const hit = dests.find((d) => dateStr >= d.startDate && dateStr <= d.endDate);
  if (hit) return hit.id;
  return dateStr < dests[0].startDate ? dests[0].id : dests[dests.length - 1].id;
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

// Lookup helper
export const byId = (list, id) => list.find((x) => x.id === id);
