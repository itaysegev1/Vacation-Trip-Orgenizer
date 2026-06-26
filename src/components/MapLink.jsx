import { mapsUrl } from '../lib/maps';

/**
 * Renders a location string as a tappable link that opens the native maps app.
 * stopPropagation so tapping it inside a clickable card doesn't also open the card.
 */
export default function MapLink({ query, label, className = '' }) {
  const q = (query || '').trim();
  if (!q) return null;
  return (
    <a
      href={mapsUrl(q)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 text-jade underline-offset-2 hover:underline ${className}`}
    >
      📍 {label || q}
    </a>
  );
}
