import { motion } from 'motion/react';
import MapLink from './MapLink';
import { listItem } from '../lib/motionVariants';
import { useLongPress } from '../lib/useLongPress';
import { themeFor } from '../lib/tripConfig';

/**
 * A single itinerary activity. Tap = edit; LONG-PRESS = quick move to another
 * time slot (onLongPress receives the press {x, y}).
 */
export default function ItineraryItem({ item, linkedName, accent, onEdit, onLongPress }) {
  const longPress = useLongPress((pos) => onLongPress(pos));

  return (
    <motion.li variants={listItem} layout>
      <div className="rounded-2xl border border-white/70 bg-white p-3 shadow-soft">
        <motion.button
          onClick={onEdit}
          onContextMenu={(e) => e.preventDefault()}
          {...longPress}
          style={{ WebkitTouchCallout: 'none' }}
          className="block w-full select-none text-right transition active:scale-[0.98]"
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5" style={{ color: accent || themeFor().accent }}>●</span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-ink">{item.title}</div>
              {item.notes && <div className="mt-0.5 text-sm text-ink-soft/80">{item.notes}</div>}
              {linkedName && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-petal px-2 py-0.5 text-xs font-medium text-rose-deep">
                  💡 {linkedName}
                </div>
              )}
            </div>
          </div>
        </motion.button>
        {item.location && (
          <div className="mt-1.5 pr-5">
            <MapLink query={item.location} className="text-sm font-medium" />
          </div>
        )}
      </div>
    </motion.li>
  );
}
