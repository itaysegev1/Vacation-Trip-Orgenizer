// ─────────────────────────────────────────────────────────────
// geo — pure client-side distance helpers over stored {lat,lng}. No API, no
// network. Great-circle (haversine) distances — approximate "as the crow flies",
// fine for sort order and rough walking estimates.
// ─────────────────────────────────────────────────────────────
const R_KM = 6371;
const toRad = (x) => (x * Math.PI) / 180;

export const hasCoords = (d) => !!d && d.lat != null && d.lng != null && Number.isFinite(d.lat) && Number.isFinite(d.lng);

export function haversineKm(a, b) {
  if (!hasCoords(a) || !hasCoords(b)) return null;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

export const distanceFrom = (origin, item) =>
  hasCoords(origin) && hasCoords(item) ? haversineKm(origin, item) : null;

// Sort by distance from origin; items without coords sink to the end.
export function sortByDistance(items, origin) {
  if (!hasCoords(origin)) return [...items];
  return [...items]
    .map((it) => ({ it, d: hasCoords(it) ? haversineKm(origin, it) : Infinity }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.it);
}

export function nearby(items, origin, radiusKm) {
  if (!hasCoords(origin)) return [];
  return items.filter((it) => hasCoords(it) && haversineKm(origin, it) <= radiusKm);
}

// Total path length over an ordered list of coord points (skips gaps).
export function totalPathKm(points) {
  let sum = 0;
  for (let i = 1; i < points.length; i += 1) {
    const d = haversineKm(points[i - 1], points[i]);
    if (d != null) sum += d;
  }
  return sum;
}

export const walkingMinutes = (km, kmh = 4.5) => (km == null ? null : Math.round((km / kmh) * 60));

export function fmtDistance(km) {
  if (km == null) return '';
  return km < 1 ? `${Math.round(km * 1000)} מ׳` : `${km.toFixed(1)} ק״מ`;
}

export function fmtWalk(min) {
  if (min == null) return '';
  if (min < 60) return `${min} דק׳ הליכה`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ש׳ ${m} דק׳ הליכה` : `${h} ש׳ הליכה`;
}
