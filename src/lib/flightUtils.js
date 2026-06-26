// Flight helpers — layover duration math shared by the Wallet form
// (live preview as you type) and the boarding-pass card (display).

// Minutes between two "HH:MM" times; wraps past midnight (e.g. 23:30 → 01:00).
export function diffMinutes(arrival, departure) {
  if (!arrival || !departure) return null;
  const [ah, am] = arrival.split(':').map(Number);
  const [dh, dm] = departure.split(':').map(Number);
  if ([ah, am, dh, dm].some((n) => Number.isNaN(n))) return null;
  let d = dh * 60 + dm - (ah * 60 + am);
  if (d < 0) d += 24 * 60;
  return d;
}

// "2 שעות ו-35 דקות" (Hebrew, with singular/plural handling).
export function layoverText(minutes) {
  if (minutes == null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? 'שעה' : 'שעות'}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? 'דקה' : 'דקות'}`);
  if (!parts.length) return '0 דקות';
  return parts.join(' ו-');
}

// Convenience: layover text straight from a flight's fields.
export function layoverFromFields(fields = {}) {
  const min = diffMinutes(fields.arrTimeLayover, fields.depTimeLayover);
  return min == null ? '' : layoverText(min);
}
