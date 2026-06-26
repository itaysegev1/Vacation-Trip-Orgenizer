import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { flipTransition } from '../lib/motionVariants';
import { triggerHaptic } from '../lib/haptics';
import { mapsUrl } from '../lib/maps';
import { layoverFromFields } from '../lib/flightUtils';
import { seatKey } from '../lib/tripConfig';

const fmtDate = (s) =>
  s ? new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' }).format(new Date(s)) : '';

// Split "🇮🇱 ישראל → יפן 🇯🇵" into its two endpoints.
function route(title = '') {
  const parts = title.split(/→|->|⟶/);
  if (parts.length >= 2) return { from: parts[0].trim(), to: parts.slice(1).join('→').trim() };
  return { from: title.trim(), to: '' };
}

// Per-passenger seat: seatItay / seatEitan, falling back to the shared seat.
const seatFor = (f, passenger) => {
  if (!passenger) return f.seat || '';
  return f[seatKey(passenger.id)] || f.seat || '';
};

// Deterministic faux barcode so it never reflows between renders.
const hashSeed = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};
const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function Barcode({ seed, className = '' }) {
  const bars = useMemo(() => {
    const rnd = mulberry32(hashSeed(String(seed || 'x')));
    return Array.from({ length: 34 }, () => 1 + Math.round(rnd() * 3));
  }, [seed]);
  return (
    <div className={`flex items-stretch gap-[2px] ${className}`} aria-hidden="true">
      {bars.map((w, i) => (
        <span key={i} style={{ width: `${w}px` }} className="bg-ink/80" />
      ))}
    </div>
  );
}

// Two punched-out notches on the horizontal perforation line.
function Notches() {
  return (
    <>
      <span className="ticket-notch" style={{ left: -11, top: -11 }} />
      <span className="ticket-notch" style={{ right: -11, top: -11 }} />
    </>
  );
}

function Meta({ label, value, ltr = false }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <div className="text-[0.6rem] uppercase tracking-wide text-ink-soft/70">{label}</div>
      <div dir={ltr ? 'ltr' : undefined} className="truncate text-sm font-semibold text-ink">
        {value}
      </div>
    </div>
  );
}

// "שם הנוסע: איתי 🦊" — issued-to label shown on every personalized ticket.
function PassengerTag({ passenger, onLight = false }) {
  if (!passenger) return null;
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${
        onLight ? 'bg-white/25 text-white' : 'bg-petal text-rose-deep'
      }`}
    >
      שם הנוסע: {passenger.label} {passenger.emoji}
    </span>
  );
}

function BaggageTag({ kg }) {
  if (!kg) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold text-ink-soft">
      🧳 {kg} ק"ג
    </span>
  );
}

/* ──────────────────────────── Boarding pass (flight) ──────────────────────────── */
export function BoardingPass({ doc, passenger, onEdit }) {
  const f = doc.fields || {};
  const conn = !!f.connection;
  const r = route(doc.title);
  const from = conn ? f.origin || r.from : r.from || doc.title;
  const to = conn ? f.finalDestination || r.to : r.to;
  const seat = seatFor(f, passenger);
  const accent = '#b85574';
  const soft = '#f4a6b8';
  const layover = conn ? layoverFromFields(f) : '';
  // Departure vs landing (connection uses origin/final-segment times).
  const depTime = conn ? f.depTimeOrigin : f.time;
  const arrTime = conn ? f.arrTimeFinal : f.arrivalTime;
  const depDate = f.date;
  const arrDate = f.arrivalDate;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onEdit}
      className="block w-full overflow-hidden rounded-2xl border border-white/70 bg-white text-right shadow-soft"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-2 text-white"
        style={{ background: `linear-gradient(120deg, ${accent} 0%, ${soft} 130%)` }}
      >
        <span className="shrink-0 text-sm font-semibold">✈️ כרטיס עלייה למטוס</span>
        <PassengerTag passenger={passenger} onLight />
      </div>

      {/* Route — each endpoint shows its own date + time (departure → landing) */}
      <div className="flex items-start gap-2 px-4 pb-1 pt-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg text-ink">{from}</div>
          <div className="text-[0.6rem] uppercase tracking-wide text-ink-soft/70">המראה</div>
          <div className="text-xs text-ink-soft">
            {depTime && <b dir="ltr" className="text-ink">{depTime}</b>}
            {depTime && depDate ? ' · ' : ''}
            {depDate ? fmtDate(depDate) : ''}
          </div>
        </div>
        {to && (
          <>
            <span className="shrink-0 self-center text-lg" style={{ color: accent }}>✈️</span>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate font-display text-lg text-ink">{to}</div>
              <div className="text-[0.6rem] uppercase tracking-wide text-ink-soft/70">נחיתה</div>
              <div className="text-xs text-ink-soft">
                {arrTime && <b dir="ltr" className="text-ink">{arrTime}</b>}
                {arrTime && arrDate ? ' · ' : ''}
                {arrDate ? fmtDate(arrDate) : ''}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Connection / layover banner */}
      {conn && (
        <div className="mx-4 mt-2 rounded-xl border border-dashed px-3 py-2 text-sm" style={{ borderColor: soft, background: soft + '22' }}>
          <div className="font-semibold" style={{ color: accent }}>
            🛬 קונקשן ב{f.layoverCity || '—'}
          </div>
          {layover && (
            <div className="text-ink">
              ⏱️ זמן מעבר: <b>{layover}</b>
              {f.arrTimeLayover && f.depTimeLayover && (
                <span dir="ltr" className="text-ink-soft/80"> ({f.arrTimeLayover}–{f.depTimeLayover})</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Flight no. / seat / baggage */}
      <div className="flex items-end justify-between gap-3 px-4 pb-2 pt-3">
        <div className="flex gap-5">
          <Meta label="טיסה" value={f.flightNo} ltr />
          <Meta label="מושב" value={seat} ltr />
        </div>
        <BaggageTag kg={f.baggageKg} />
      </div>

      {/* Perforation + stub */}
      <div className="relative border-t border-dashed" style={{ borderColor: '#e7d4da' }}>
        <Notches />
        <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: soft + '55' }}>
          <Barcode seed={(doc.id || '') + (passenger?.id || '')} className="h-9 flex-1 opacity-80" />
          {f.confirmation && (
            <div className="shrink-0 text-left">
              <div className="text-[0.6rem] uppercase tracking-wide text-ink-soft/70">אסמכתא</div>
              <div dir="ltr" className="font-mono text-sm font-bold text-ink">{f.confirmation}</div>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ──────────────────────────── Train (Shinkansen) ──────────────────────────── */
export function TrainTicket({ doc, passenger, onEdit }) {
  const f = doc.fields || {};
  const { from, to } = route(doc.title);
  const seat = seatFor(f, passenger);
  const accent = '#1f7a6f';
  const soft = '#2fa395';

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onEdit}
      className="block w-full overflow-hidden rounded-2xl border border-white/70 bg-white text-right shadow-soft"
    >
      <div
        className="flex items-center justify-between gap-2 px-4 py-2 text-white"
        style={{ background: `linear-gradient(120deg, ${accent} 0%, ${soft} 130%)` }}
      >
        <span className="shrink-0 text-sm font-semibold">🚄 כרטיס רכבת / שינקנסן</span>
        <PassengerTag passenger={passenger} onLight />
      </div>

      <div className="flex items-center gap-2 px-4 pb-1 pt-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg text-ink">{from || doc.title}</div>
        </div>
        {to && (
          <>
            <span className="shrink-0 text-lg" style={{ color: accent }}>🚄</span>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate font-display text-lg text-ink">{to}</div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 px-4 pb-3 pt-2">
        <Meta label="תאריך" value={fmtDate(f.date)} />
        <Meta label="שעה" value={f.time} ltr />
        <Meta label="רכבת" value={f.trainNo} ltr />
        <Meta label="קרון/מושב" value={[f.car, seat].filter(Boolean).join(' · ')} ltr />
      </div>

      <div className="relative border-t border-dashed" style={{ borderColor: '#d6ece8' }}>
        <Notches />
        <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: soft + '33' }}>
          <Barcode seed={(doc.id || '') + (passenger?.id || '')} className="h-9 flex-1 opacity-80" />
          {f.confirmation && (
            <div className="shrink-0 text-left">
              <div className="text-[0.6rem] uppercase tracking-wide text-ink-soft/70">אסמכתא</div>
              <div dir="ltr" className="font-mono text-sm font-bold text-ink">{f.confirmation}</div>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ──────────────────────────── Voucher (attraction / restaurant) ────────────────────────────
   Distinct from boarding passes: a soft tinted card with a coloured side stub
   instead of a bold header band. */
const VOUCHER_STYLES = {
  attraction: { icon: '🎟️', kicker: 'כרטיס כניסה', accent: '#3a8f84', tint: '#eaf5f2' },
  restaurant: { icon: '🍽️', kicker: 'שובר הזמנה', accent: '#c79a4e', tint: '#faf3e3' },
};

export function Voucher({ doc, passenger, kind = 'attraction', onEdit }) {
  const f = doc.fields || {};
  const s = VOUCHER_STYLES[kind] || VOUCHER_STYLES.attraction;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onEdit}
      className="relative flex w-full overflow-hidden rounded-2xl border border-white/70 text-right shadow-soft"
      style={{ background: s.tint }}
    >
      {/* Punched notches on the vertical perforation between stub and body */}
      <span className="ticket-notch" style={{ right: '3.5rem', top: -11, transform: 'translateX(50%)' }} />
      <span className="ticket-notch" style={{ right: '3.5rem', bottom: -11, transform: 'translateX(50%)' }} />

      {/* Body */}
      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-display text-lg text-ink">{doc.title}</h3>
          <PassengerTag passenger={passenger} />
        </div>

        {/* Reservation time — prominent */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {f.date && <span className="font-semibold text-ink">📅 {fmtDate(f.date)}</span>}
          {f.time && (
            <span dir="ltr" className="rounded-full px-2 py-0.5 font-bold text-white" style={{ background: s.accent }}>
              🕐 {f.time}
            </span>
          )}
          {kind === 'restaurant' && f.partySize && (
            <span className="font-semibold text-ink-soft">👥 {f.partySize} סועדים</span>
          )}
        </div>

        {/* Address */}
        {f.address && (
          <a
            href={mapsUrl(f.address)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-2 block truncate text-sm text-jade"
          >
            📍 {f.address}
          </a>
        )}
        {f.addressLocal && (
          <a
            href={mapsUrl(f.addressLocal)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1 block rounded-lg border border-white/80 bg-white/60 px-2 py-1 text-sm text-ink"
          >
            🗺️ {f.addressLocal}
          </a>
        )}

        {/* Confirmation + barcode */}
        <div className="mt-2 flex items-center justify-between gap-3">
          <Barcode seed={(doc.id || '') + (passenger?.id || '')} className="h-7 w-24 opacity-70" />
          {f.confirmation && (
            <div className="text-left">
              <div className="text-[0.6rem] uppercase tracking-wide text-ink-soft/70">מס׳ הזמנה</div>
              <div dir="ltr" className="font-mono text-sm font-bold text-ink">{f.confirmation}</div>
            </div>
          )}
        </div>
      </div>

      {/* Side stub */}
      <div
        className="relative flex w-14 shrink-0 flex-col items-center justify-center gap-1 border-r border-dashed text-white"
        style={{ background: s.accent, borderColor: 'rgba(255,255,255,0.6)' }}
      >
        <span className="text-2xl">{s.icon}</span>
        <span className="text-[0.6rem] font-bold leading-tight">{s.kicker}</span>
      </div>
    </motion.button>
  );
}

/* ──────────────────────────── Hotel reservation (3D flip) ──────────────────────────── */
export function HotelCard({ doc, onEdit }) {
  const [flipped, setFlipped] = useState(false);
  const f = doc.fields || {};
  const accent = '#b8860b';
  const gold = '#d4af7a';

  const face = 'absolute inset-0 backface-hidden overflow-hidden rounded-2xl border border-white/70 shadow-soft';

  return (
    <div className="flip-scene h-56">
      <motion.div
        className="relative h-full w-full flip-3d"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={flipTransition}
      >
        {/* FRONT */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setFlipped(true);
          }}
          className={`${face} bg-white text-right`}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5 text-white"
            style={{ background: `linear-gradient(120deg, ${accent} 0%, ${gold} 130%)` }}
          >
            <span className="text-sm font-semibold">🏨 שובר לינה</span>
            <span className="text-lg">🛎️</span>
          </div>
          <div className="px-4 pt-3">
            <div className="font-display text-xl text-ink">{doc.title}</div>
            {f.address && <div className="mt-0.5 truncate text-sm text-ink-soft">📍 {f.address}</div>}
          </div>
          <div className="grid grid-cols-2 gap-2 px-4 pt-3">
            <Meta label="צ׳ק-אין" value={fmtDate(f.checkIn)} />
            <Meta label="צ׳ק-אאוט" value={fmtDate(f.checkOut)} />
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-dashed px-4 py-2.5" style={{ borderColor: '#eadfc4', background: '#f7efdd99' }}>
            <Barcode seed={doc.id} className="h-7 flex-1 opacity-80" />
            <span className="shrink-0 text-[0.7rem] font-semibold" style={{ color: accent }}>הקישו לכתובת ↻</span>
          </div>
        </button>

        {/* BACK (role=button div so the inner map link + edit button are valid —
            interactive elements can't nest in <button>) */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`${doc.title} — צד אחורי`}
          onClick={() => {
            triggerHaptic('light');
            setFlipped(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              triggerHaptic('light');
              setFlipped(false);
            }
          }}
          className={`${face} bg-cream text-right`}
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 text-white" style={{ background: `linear-gradient(120deg, ${gold} 0%, ${accent} 130%)` }}>
            <span className="text-sm font-semibold">🗺️ כתובת להצגה לנהג</span>
            <span className="text-lg">🚕</span>
          </div>
          <div className="flex h-[calc(100%-2.75rem)] flex-col px-4 pb-3 pt-3">
            {f.addressLocal ? (
              <a
                href={mapsUrl(f.addressLocal)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-xl border border-gold-soft bg-white/70 p-2.5 text-center text-base leading-snug text-ink active:scale-[0.99] transition"
              >
                {f.addressLocal}
              </a>
            ) : (
              <p className="rounded-xl border border-dashed border-gold-soft bg-white/50 p-2.5 text-center text-sm text-ink-soft">
                הוסיפו כתובת בשפה המקומית כדי להראות לנהג מונית 🚕
              </p>
            )}
            <div className="mt-auto flex items-end justify-between gap-2 pt-2">
              <div className="min-w-0">
                {f.confirmation && (
                  <>
                    <div className="text-[0.6rem] uppercase tracking-wide text-ink-soft/70">מס׳ הזמנה</div>
                    <div dir="ltr" className="font-mono text-sm font-bold text-ink">{f.confirmation}</div>
                  </>
                )}
                {f.phone && (
                  <a href={`tel:${f.phone}`} dir="ltr" onClick={(e) => e.stopPropagation()} className="mt-0.5 block text-sm font-semibold text-jade">
                    📞 {f.phone}
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="shrink-0 rounded-full bg-petal px-3 py-1.5 text-sm font-semibold text-rose-deep active:scale-95 transition"
              >
                ✏️ עריכה
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
