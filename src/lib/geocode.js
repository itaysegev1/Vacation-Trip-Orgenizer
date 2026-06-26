// ─────────────────────────────────────────────────────────────
// geocode — address → {lat,lng} via free, no-key Nominatim (OpenStreetMap),
// CLIENT-SIDE and FAIL-SOFT. Called only on explicit save (low volume).
//
// Hard rules (see plan): it must NEVER block or fail the calling save, and must
// degrade silently when blocked. Privacy browsers (Safari/Brave/content
// blockers) may strip the Referer Nominatim relies on or block the host — that
// is treated as a normal "no result" (returns null). Browsers also can't set a
// custom User-Agent (a forbidden header), so we rely on the automatic Referer
// for the low-volume identifier the policy expects. An AbortController timeout
// keeps a blocked/hanging request from lingering.
// ─────────────────────────────────────────────────────────────
import { isDemo } from './firebase';
import { GEOCODER } from './tripConfig';

let lastCall = 0; // module-level rate-limit clock (Nominatim policy ≤ 1 req/sec)

const memoKey = (q) => `${GEOCODER.cachePrefix}:${q}`;

function readMemo(q) {
  try {
    const raw = localStorage.getItem(memoKey(q));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeMemo(q, val) {
  try {
    localStorage.setItem(memoKey(q), JSON.stringify(val));
  } catch {
    /* ignore quota */
  }
}

/**
 * Resolve an address to {lat,lng}, or null on any miss/error. Never throws.
 * @param biasCountryCodes optional ISO codes (e.g. 'jp') to bias the search to a
 *   specific country — more accurate than biasing to every trip country at once.
 */
export async function geocode(address, biasCountryCodes) {
  const q = (address || '').trim().toLowerCase();
  if (!q || !GEOCODER.enabled || isDemo) return null; // demo: never touch the network

  const cached = readMemo(q);
  if (cached) return cached.none ? null : cached; // memoized hit (or memoized miss)

  // Client-side rate-limit so we honor the public-Nominatim usage policy.
  const wait = Math.max(0, GEOCODER.minIntervalMs - (Date.now() - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    let url = GEOCODER.urlTemplate.replace('{query}', encodeURIComponent(address.trim()));
    const cc = (biasCountryCodes || GEOCODER.countryCodes || '').trim();
    if (cc) url += `&countrycodes=${encodeURIComponent(cc)}`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const arr = await res.json();
    const hit = Array.isArray(arr) ? arr[0] : null;
    const lat = hit ? Number(hit.lat) : NaN;
    const lng = hit ? Number(hit.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      writeMemo(q, { none: true }); // remember the miss so we don't re-hit it
      return null;
    }
    const coords = { lat, lng };
    writeMemo(q, coords);
    return coords;
  } catch {
    // blocked / aborted / offline / parse error → fail-soft, no memo (retry later)
    return null;
  } finally {
    clearTimeout(timer);
  }
}
