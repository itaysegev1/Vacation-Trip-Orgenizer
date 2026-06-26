// ─────────────────────────────────────────────────────────────
// applyTheme — white-label refactor, Step 2.
//
// Injects the configured palette / fonts / shadows as CSS custom properties on
// <html> (:root) and sets the document's language + layout direction, all from
// src/config/tripConfig.ts. Run once at boot, BEFORE React renders.
//
// Why this works: Tailwind v4's `@theme` block in index.css emits each token as
// a :root variable (e.g. --color-sakura) and every utility (bg-sakura,
// text-rose-deep, shadow-soft, the .font-display class, the body background…)
// resolves through `var(--color-*)`. Setting those same variables INLINE on
// <html> overrides the stylesheet values at runtime — so changing the config
// re-themes the whole app with no rebuild. The defaults equal the @theme values,
// so today the result is pixel-identical; index.css remains the static fallback.
// ─────────────────────────────────────────────────────────────
import config from '../config/tripConfig';

// sakuraDeep → sakura-deep, inkSoft → ink-soft, gold → gold (CSS-var casing).
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export function applyTheme(cfg = config) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const theme = cfg.theme || {};

  // Palette → --color-*
  Object.entries(theme.colors || {}).forEach(([name, value]) => {
    root.style.setProperty(`--color-${kebab(name)}`, value);
  });
  // Fonts → --font-*
  Object.entries(theme.fonts || {}).forEach(([name, value]) => {
    root.style.setProperty(`--font-${kebab(name)}`, value);
  });
  // Elevation → --shadow-*
  Object.entries(theme.shadows || {}).forEach(([name, value]) => {
    root.style.setProperty(`--shadow-${kebab(name)}`, value);
  });

  // Locale & layout direction (was hardcoded lang="he" dir="rtl" in index.html)
  if (cfg.locale?.language) root.lang = cfg.locale.language;
  if (cfg.locale?.direction) root.dir = cfg.locale.direction;

  // Keep the browser-chrome theme-color in sync with the configured accent.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && cfg.branding?.themeColor) meta.setAttribute('content', cfg.branding.themeColor);

  // Document title + description from config (the build-time vite plugin also
  // writes these into index.html; this keeps them config-driven at runtime too).
  if (cfg.branding?.documentTitle) document.title = cfg.branding.documentTitle;
  const desc = document.querySelector('meta[name="description"]');
  if (desc && cfg.branding?.description) desc.setAttribute('content', cfg.branding.description);
}

export default applyTheme;
