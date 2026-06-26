import { motion } from 'motion/react';
import StatusBadge from './StatusBadge';
import MapLink from './MapLink';
import { COUNTRIES, IDEA_CATEGORIES, byId, themeFor } from '../lib/tripConfig';
import { tap } from '../lib/motionVariants';
import { useLongPress } from '../lib/useLongPress';

/**
 * A single Idea card. Tap the main area to edit; LONG-PRESS it to open the
 * quick status menu (onLongPress receives the press {x, y}). Action chips
 * (schedule / map / link) sit below.
 */
export default function IdeaCard({ idea, onEdit, onSchedule, onLongPress, onBadgeTap }) {
  const country = byId(Object.values(COUNTRIES), idea.country) || Object.values(COUNTRIES)[0];
  const cat = byId(IDEA_CATEGORIES, idea.category);
  const longPress = useLongPress((pos) => onLongPress(pos));

  const accent = themeFor(idea.country).chip;

  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        {/* Tap = edit · long-press = status menu */}
        <motion.button
          whileTap={tap}
          onClick={onEdit}
          onContextMenu={(e) => e.preventDefault()}
          {...longPress}
          style={{ WebkitTouchCallout: 'none' }}
          className="block min-w-0 flex-1 select-none text-right"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{country.flag}</span>
            <h3 className="truncate font-display text-lg text-ink">{idea.name}</h3>
          </div>
          <p className="mt-0.5 truncate text-sm text-ink-soft">
            {cat ? `${cat.emoji} ${cat.label}` : ''}
            {idea.city ? ` · ${idea.city}` : ''}
          </p>
          {idea.notes && <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{idea.notes}</p>}
        </motion.button>

        {/* Status badge = sibling button (keyboard-activatable shortcut to the menu) */}
        <button
          type="button"
          aria-label="שינוי סטטוס"
          onClick={(e) => {
            e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            onBadgeTap({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
          }}
          className="shrink-0 rounded-full transition active:scale-90"
        >
          <StatusBadge status={idea.status} />
        </button>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={onSchedule}
          style={{ backgroundColor: accent }}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-white transition active:scale-95"
        >
          🗓️ שבץ בלו״ז
        </button>
        {idea.address?.trim() ? (
          <MapLink
            query={idea.address}
            label="מפות"
            className="rounded-full bg-jade-soft px-3 py-1.5 text-sm font-semibold"
          />
        ) : idea.city ? (
          <MapLink
            query={`${idea.name} ${idea.city}`}
            label="מפה"
            className="rounded-full bg-jade-soft px-3 py-1.5 text-sm font-semibold"
          />
        ) : null}
        {idea.link && (
          <a
            href={idea.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-petal px-3 py-1.5 text-sm font-semibold text-rose-deep transition active:scale-95"
          >
            🔗 קישור
          </a>
        )}
      </div>
    </div>
  );
}
