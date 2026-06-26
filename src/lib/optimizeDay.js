// ─────────────────────────────────────────────────────────────
// optimizeDay — order a day's stops by proximity (greedy nearest-neighbor) and
// estimate total walking distance/time. Pure client-side over stored {lat,lng}.
// A heuristic ("recommended route"), not an optimal TSP. Stops without coords
// keep their original relative order, appended after the routed ones.
// ─────────────────────────────────────────────────────────────
import { haversineKm, walkingMinutes, hasCoords } from './geo';

export function nearestNeighborOrder(stops, start) {
  const withCoords = stops.filter(hasCoords);
  const without = stops.filter((s) => !hasCoords(s));
  if (withCoords.length <= 1) return [...stops];

  const remaining = [...withCoords];
  const ordered = [];
  let current;
  if (hasCoords(start)) {
    current = start; // external origin (e.g. the accommodation) — seeds, not listed
  } else {
    current = remaining.shift();
    ordered.push(current);
  }
  while (remaining.length) {
    let bestI = 0;
    let bestD = Infinity;
    remaining.forEach((s, i) => {
      const d = haversineKm(current, s);
      if (d != null && d < bestD) {
        bestD = d;
        bestI = i;
      }
    });
    current = remaining.splice(bestI, 1)[0];
    ordered.push(current);
  }
  return [...ordered, ...without];
}

// Walk/transit-aware day stats. Legs longer than maxWalkLegKm are treated as a
// transit hop (e.g. airport→city), NOT walking — so we never claim a 14h "walk".
// Returns walkable totals (for the "X walking" estimate) separately from transit.
export function dayStats(orderedStops, { kmh = 4.5, maxWalkLegKm = 4, origin = null } = {}) {
  const pts = [origin, ...orderedStops].filter(hasCoords);
  let walkKm = 0;
  let transitKm = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const km = haversineKm(pts[i - 1], pts[i]);
    if (km == null) continue;
    if (km <= maxWalkLegKm) walkKm += km;
    else transitKm += km;
  }
  return {
    totalKm: walkKm + transitKm,
    walkKm,
    walkMin: walkingMinutes(walkKm, kmh),
    transitKm,
    hasTransit: transitKm > 0,
    stops: pts.length,
  };
}
