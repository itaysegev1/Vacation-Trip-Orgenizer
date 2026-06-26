# CLAUDE.md — working rules for this repo

This is a **white-label, config-driven** trip-organizer PWA (React 19 + Vite + Tailwind v4 +
Firebase Firestore/Auth, runs on the free Spark tier, demo mode via `VITE_DEMO`). Read
`README.md` for the full picture. The two rules below are **non-negotiable** — follow them
on every change so the app stays re-skinnable and the docs stay true.

## Rule 1 — Nothing trip-specific is hard-coded; it lives in the config

The single source of truth is **`src/config/tripConfig.ts`** (data + types) and
**`src/config/content.ts`** (all user-facing strings, via `fmt('{x}', {x})`). Components
consume the **derived** layer `src/lib/tripConfig.js`, never raw literals.

When you add anything, put the data/value/string in the config and surface it through the
derived layer — do **not** bake it into a component. This includes:

- trip facts: traveller names/ids, destinations, dates, currencies, emails
- taxonomies: categories, statuses, slots, document types, app categories
- copy/labels (→ `content.ts`), thresholds, URLs/endpoints, colours/theme tokens
- feature switches: gate each new feature behind an `enabled` flag in the config

Then:
- **Add a derived export** in `src/lib/tripConfig.js` (mirror the existing pattern, e.g.
  `GEOCODER`, `RATE_HISTORY`) and import from there.
- **Mirror it in `src/lib/demoStore.js`** — any new Firestore collection/doc or stored field
  must be seeded so demo mode (`npm run dev:demo`) keeps working with no network. Demo
  structural values derive from the config (ids/dates/currencies); only sample text is literal.
- **Secrets stay in `.env`** (e.g. `VITE_ALLOWED_EMAILS`), never in tracked files. `firestore.rules`
  is generated (`npm run generate-rules`) — never hand-edit it.

Quick self-check before finishing: `grep` your new value — if a trip-specific string/number
appears literally in a component instead of coming from `tripConfig`/`content`, move it.

## Rule 2 — When you add something, update the README

`README.md` documents the app for a newcomer (config reference, setup, screenshots). Any
time you add or change a **feature, page, config section, script, or env var**, update the
relevant README section in the same change. If the UI changed, regenerate the screenshots in
`docs/screenshots/` (headless capture from `npm run dev:demo`). The README must never lag
behind what the app actually does.

## Other established constraints (keep consistent)

- **Stay on Firebase Spark ($0):** no Cloud Functions / Blaze / cron / Cloud Storage. Shared
  state coordinates through small Firestore docs ("first client past the TTL writes, others read").
- **Never `await` a Firestore write before updating the UI** (offline would freeze); guard
  against writing `undefined`.
- **Verify before declaring done:** `npm run build` green, then exercise the change in the
  demo preview (no console errors).
- Match the surrounding code's style, Hebrew/RTL copy, and the sakura theme.
