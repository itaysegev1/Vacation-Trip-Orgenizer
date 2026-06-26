import { useState } from 'react';
import { motion } from 'motion/react';
import Modal from './Modal';
import { useTripData } from '../context/TripDataContext';
import { mapsUrl } from '../lib/maps';
import { triggerHaptic } from '../lib/haptics';
import { btnPrimary } from '../lib/ui';

const fmtRange = (ci, co) => {
  if (!ci) return '';
  const f = (s) => new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' }).format(new Date(s));
  return co ? `${f(ci)} – ${f(co)}` : f(ci);
};

/** Global "take me home" FAB — opens a sheet with tonight's hotel + a maps button. */
export default function HomeFab() {
  const { hotel } = useTripData();
  const [open, setOpen] = useState(false);

  const mapQuery = hotel ? hotel.addressLocal || hotel.address || hotel.name : '';

  return (
    <>
      <motion.button
        onClick={() => {
          triggerHaptic('light');
          setOpen(true);
        }}
        whileTap={{ scale: 0.9 }}
        aria-label="המלון שלנו הלילה"
        className="glass fixed bottom-[5.75rem] start-4 z-30 grid h-14 w-14 place-items-center rounded-full text-2xl shadow-soft ring-1 ring-white/40 lg:bottom-8"
      >
        🏨
      </motion.button>

      <Modal open={open} onClose={() => setOpen(false)} title="איפה ישנים? 🏨">
        {hotel ? (
          <div className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-bl from-petal to-white p-4 text-center shadow-soft">
              <div className="text-xs font-semibold text-rose-deep">
                {hotel.isTonight ? '🌙 הלילה אנחנו ב־' : '➡️ המלון הקרוב'}
              </div>
              <div className="mt-1 font-display text-2xl text-ink">{hotel.name}</div>
              {(hotel.checkIn || hotel.checkOut) && (
                <div className="mt-1 text-sm text-ink-soft">{fmtRange(hotel.checkIn, hotel.checkOut)}</div>
              )}
            </div>

            {hotel.addressLocal && (
              <div className="rounded-2xl border border-gold-soft bg-gold-soft/30 p-3">
                <div className="mb-1 text-xs font-semibold text-ink-soft">כתובת להראות לנהג מונית 🗺️</div>
                <div className="text-base text-ink">{hotel.addressLocal}</div>
              </div>
            )}
            {hotel.address && <div className="text-center text-sm text-ink-soft">📍 {hotel.address}</div>}

            {mapQuery && (
              <a
                href={mapsUrl(mapQuery)}
                target="_blank"
                rel="noreferrer"
                onClick={() => triggerHaptic('medium')}
                className={`${btnPrimary} w-full`}
              >
                פתחו במפות 🗺️
              </a>
            )}
          </div>
        ) : (
          <div className="py-6 text-center">
            <div className="text-4xl">🏨</div>
            <p className="mt-2 text-sm text-ink-soft">
              עדיין לא הוגדר מלון. הוסיפו לינה בעמוד <b>מסמכים</b> (עם תאריכי צ׳ק-אין/אאוט),
              והכפתור הזה ידע תמיד לאן לקחת אתכם הביתה. 💕
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
