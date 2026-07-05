import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useCollection } from '../lib/useCollection';
import {
  DOC_TYPES,
  SEED_FLIGHTS,
  WALLET_TYPES,
  WALLET_TYPE_CHOOSER as TYPE_CHOOSER,
  WALLET_SECTIONS as SECTIONS,
  PER_PASSENGER_TYPES as PER_PASSENGER,
  TRAVELLERS,
  SHARED,
  seatKey,
  COLLECTIONS,
  CONTENT,
} from '../lib/tripConfig';
import { input, labelCls, btnPrimary } from '../lib/ui';
import { listContainer, listItem, tap } from '../lib/motionVariants';
import { diffMinutes, layoverText } from '../lib/flightUtils';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { BoardingPass, TrainTicket, Voucher, HotelCard } from '../components/WalletCards';

// Expand a doc into the passenger(s) it should render a card for.
function passengerCards(doc) {
  if (!PER_PASSENGER.has(doc.type)) return [null];
  const p = doc.fields?.passengers || SHARED.id;
  if (p === SHARED.id) return TRAVELLERS; // one card per traveller
  const one = TRAVELLERS.find((t) => t.id === p);
  return one ? [one] : TRAVELLERS;
}

function renderCard(doc, passenger, onEdit) {
  switch (doc.type) {
    case 'flight':
      return <BoardingPass doc={doc} passenger={passenger} onEdit={onEdit} />;
    case 'train':
      return <TrainTicket doc={doc} passenger={passenger} onEdit={onEdit} />;
    case 'attraction':
      return <Voucher kind="attraction" doc={doc} passenger={passenger} onEdit={onEdit} />;
    case 'restaurant':
      return <Voucher kind="restaurant" doc={doc} onEdit={onEdit} />;
    case 'accommodation':
      return <HotelCard doc={doc} onEdit={onEdit} />;
    default:
      return null;
  }
}

export default function Wallet() {
  const { docs, add, update, remove } = useCollection(COLLECTIONS.documents);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ type: 'flight', title: '', fields: {} });
  const [toDelete, setToDelete] = useState(null);

  const byType = useMemo(() => {
    const map = Object.fromEntries(WALLET_TYPES.map((t) => [t, []]));
    docs.forEach((d) => {
      if (map[d.type]) map[d.type].push(d);
    });
    return map;
  }, [docs]);

  const total = WALLET_TYPES.reduce((n, t) => n + byType[t].length, 0);

  const openNew = (type = 'flight') => {
    setForm({ type, title: '', fields: PER_PASSENGER.has(type) ? { passengers: SHARED.id } : {} });
    setEditing({});
  };
  // Switching type inside the open modal keeps the title the user already
  // typed; only the type-specific fields reset.
  const switchType = (type) =>
    setForm((fm) => ({
      type,
      title: fm.title,
      fields: PER_PASSENGER.has(type) ? { passengers: SHARED.id } : {},
    }));
  const openEdit = (doc) => {
    setForm({ type: doc.type, title: doc.title || '', fields: { ...(doc.fields || {}) } });
    setEditing(doc);
  };
  const close = () => setEditing(null);

  const setField = (k, v) => setForm((fm) => ({ ...fm, fields: { ...fm.fields, [k]: v } }));

  const save = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const data = { type: form.type, title: form.title.trim(), fields: form.fields };
    // Don't await — offline keeps the write pending; close optimistically.
    (editing?.id ? update(editing.id, data) : add(data)).catch((err) =>
      console.error('wallet save failed', err)
    );
    close();
  };

  const seedFlights = () => {
    SEED_FLIGHTS.forEach((f) =>
      add({ type: 'flight', ...f }).catch((err) => console.error('seed flight failed', err))
    );
  };

  const cfg = DOC_TYPES[form.type];
  const passengers = form.fields.passengers || SHARED.id;
  const isConn = !!form.fields.connection;
  const liveLayover = isConn
    ? layoverText(diffMinutes(form.fields.arrTimeLayover, form.fields.depTimeLayover))
    : '';

  // Bound, labeled input — a plain factory (NOT a component) so typing
  // never remounts the field and loses focus.
  const fld = ({ k, label, type = 'text', placeholder = '', dir }) => (
    <div key={k}>
      <label className={labelCls}>{label}</label>
      {type === 'textarea' ? (
        <textarea
          className={`${input} min-h-16 resize-none`}
          value={form.fields[k] || ''}
          onChange={(e) => setField(k, e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={input}
          type={type === 'tel' ? 'tel' : type}
          inputMode={type === 'number' ? 'numeric' : undefined}
          dir={dir || (['date', 'time', 'tel', 'number'].includes(type) ? 'ltr' : 'rtl')}
          value={form.fields[k] || ''}
          onChange={(e) => setField(k, e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl text-rose-deep">ארנק כרטיסים 🎫</h1>
          <p className="text-sm text-ink-soft">{total} כרטיסים · משותף, מותאם אישית</p>
        </div>
        <motion.button whileTap={tap} onClick={() => openNew('flight')} className={btnPrimary}>
          כרטיס +
        </motion.button>
      </div>

      {total === 0 ? (
        <EmptyState
          emoji="🎫"
          title="הארנק עוד ריק"
          subtitle={CONTENT.wallet.emptySubtitle}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={seedFlights} className="rounded-2xl bg-rose-deep px-4 py-2 font-semibold text-white shadow-soft active:scale-95 transition">
                ➕ הוספת 3 הטיסות הידועות
              </button>
              <button onClick={() => openNew('attraction')} className="rounded-2xl bg-petal px-4 py-2 font-semibold text-rose-deep active:scale-95 transition">
                🎟️ שובר אטרקציה
              </button>
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          {SECTIONS.map(({ type, title, cols }) => {
            const items = byType[type];
            const entries = items.flatMap((doc) =>
              passengerCards(doc).map((p) => ({ doc, p, key: doc.id + (p?.id || '') }))
            );
            return (
              <section key={type}>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-display text-xl text-rose-deep">{title}</h2>
                  <motion.button
                    whileTap={tap}
                    onClick={() => openNew(type)}
                    className="rounded-full bg-petal px-3 py-1 text-sm font-semibold text-rose-deep active:scale-95"
                  >
                    + הוספה
                  </motion.button>
                </div>
                {entries.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line bg-white/50 py-5 text-center text-sm text-ink-soft">
                    אין עדיין — הקישו על + להוספה
                  </p>
                ) : (
                  <motion.div
                    variants={listContainer}
                    initial="hidden"
                    animate="show"
                    className={cols ? 'grid gap-4 sm:grid-cols-2' : 'space-y-3'}
                  >
                    {entries.map(({ doc, p, key }) => (
                      <motion.div key={key} variants={listItem}>
                        {renderCard(doc, p, () => openEdit(doc))}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Add / edit ticket */}
      <Modal open={editing !== null} onClose={close} title={editing?.id ? `עריכת ${cfg?.label}` : 'כרטיס חדש 🎫'}>
        <form onSubmit={save} className="space-y-4">
          {!editing?.id && (
            <div>
              <label className={labelCls}>סוג כרטיס</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_CHOOSER.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => switchType(t.id)}
                    className={`rounded-2xl py-2.5 text-sm font-semibold transition active:scale-95 ${
                      form.type === t.id ? 'bg-sakura text-white' : 'bg-petal text-ink-soft'
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>{cfg?.titleLabel}</label>
            <input
              className={input}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={cfg?.titlePlaceholder}
              autoFocus
              required
            />
          </div>

          {/* Passengers (flight / train / attraction) */}
          {PER_PASSENGER.has(form.type) && (
            <div>
              <label className={labelCls}>נוסעים</label>
              <div className="flex gap-2">
                {[SHARED, ...TRAVELLERS].map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setField('passengers', p.id)}
                    className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition active:scale-95 ${
                      passengers === p.id ? 'bg-sakura text-white' : 'bg-petal text-ink-soft'
                    }`}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-ink-soft/80">
                {passengers === SHARED.id ? 'יוצגו שני כרטיסים — אחד לכל נוסע' : 'יוצג כרטיס אחד'}
              </p>
            </div>
          )}

          {/* Connection toggle (flight) */}
          {form.type === 'flight' && (
            <div className="flex items-center justify-between rounded-2xl bg-petal/60 px-4 py-3">
              <span className="font-semibold text-ink">טיסה עם קונקשן ✈️🔁</span>
              <button
                type="button"
                role="switch"
                aria-checked={isConn}
                aria-label="טיסה עם קונקשן"
                onClick={() => setField('connection', !isConn)}
                className={`relative h-6 w-11 rounded-full transition-colors ${isConn ? 'bg-sakura' : 'bg-ink/15'}`}
              >
                <span
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                  style={isConn ? { left: 2 } : { right: 2 }}
                />
              </button>
            </div>
          )}

          {/* Flight fields */}
          {form.type === 'flight' &&
            (isConn ? (
              <>
                {fld({ k: 'origin', label: 'מוצא', placeholder: CONTENT.wallet.flightPlaceholders.origin })}
                {fld({ k: 'layoverCity', label: 'יעד אמצע (קונקשן)', placeholder: CONTENT.wallet.flightPlaceholders.layoverCity })}
                {fld({ k: 'finalDestination', label: 'יעד סופי', placeholder: CONTENT.wallet.flightPlaceholders.finalDestination })}
                <div className="grid grid-cols-2 gap-2">
                  {fld({ k: 'date', label: 'תאריך המראה', type: 'date' })}
                  {fld({ k: 'arrivalDate', label: 'תאריך נחיתה', type: 'date' })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {fld({ k: 'depTimeOrigin', label: 'המראה ממוצא', type: 'time' })}
                  {fld({ k: 'arrTimeLayover', label: 'נחיתה בקונקשן', type: 'time' })}
                  {fld({ k: 'depTimeLayover', label: 'המראה מקונקשן', type: 'time' })}
                  {fld({ k: 'arrTimeFinal', label: 'נחיתה סופית', type: 'time' })}
                </div>
                {liveLayover && (
                  <p className="rounded-xl bg-jade-soft px-3 py-2 text-center text-sm text-ink">
                    ⏱️ זמן מעבר: <b>{liveLayover}</b>
                  </p>
                )}
                {fld({ k: 'flightNo', label: 'מספרי טיסה', placeholder: CONTENT.wallet.flightPlaceholders.flightNo, dir: 'ltr' })}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {fld({ k: 'date', label: 'תאריך המראה', type: 'date' })}
                  {fld({ k: 'time', label: 'שעת המראה', type: 'time' })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {fld({ k: 'arrivalDate', label: 'תאריך נחיתה', type: 'date' })}
                  {fld({ k: 'arrivalTime', label: 'שעת נחיתה', type: 'time' })}
                </div>
                {fld({ k: 'flightNo', label: 'מס׳ טיסה', dir: 'ltr' })}
              </>
            ))}

          {/* Baggage (flight) */}
          {form.type === 'flight' && fld({ k: 'baggageKg', label: 'משקל מזוודה מותר (ק"ג)', type: 'number', placeholder: '23' })}

          {/* Train fields */}
          {form.type === 'train' && (
            <>
              {fld({ k: 'date', label: 'תאריך', type: 'date' })}
              {fld({ k: 'time', label: 'שעה', type: 'time' })}
              {fld({ k: 'trainNo', label: 'רכבת / שינקנסן', placeholder: CONTENT.wallet.trainNoPlaceholder, dir: 'ltr' })}
              {fld({ k: 'car', label: 'קרון', dir: 'ltr' })}
            </>
          )}

          {/* Seats (flight / train) */}
          {(form.type === 'flight' || form.type === 'train') &&
            (passengers === SHARED.id ? (
              <div className="grid grid-cols-2 gap-2">
                {TRAVELLERS.map((t) =>
                  fld({ k: seatKey(t.id), label: `מושב — ${t.label} ${t.emoji}`, dir: 'ltr' })
                )}
              </div>
            ) : (
              fld({ k: 'seat', label: 'מושב', dir: 'ltr' })
            ))}

          {/* Attraction fields */}
          {form.type === 'attraction' && (
            <>
              {fld({ k: 'date', label: 'תאריך', type: 'date' })}
              {fld({ k: 'time', label: 'שעת כניסה', type: 'time' })}
              {fld({ k: 'address', label: 'כתובת', placeholder: 'שם / כתובת המקום' })}
              {fld({ k: 'addressLocal', label: 'כתובת בשפה המקומית', type: 'textarea' })}
            </>
          )}

          {/* Restaurant fields */}
          {form.type === 'restaurant' && (
            <>
              {fld({ k: 'date', label: 'תאריך', type: 'date' })}
              {fld({ k: 'time', label: 'שעת הזמנה', type: 'time' })}
              {fld({ k: 'partySize', label: 'מספר סועדים', type: 'number', placeholder: '2' })}
              {fld({ k: 'address', label: 'כתובת', placeholder: 'שם / כתובת המסעדה' })}
              {fld({ k: 'addressLocal', label: 'כתובת בשפה המקומית', type: 'textarea' })}
            </>
          )}

          {/* Accommodation fields */}
          {form.type === 'accommodation' && (
            <>
              {fld({ k: 'address', label: 'כתובת' })}
              {fld({ k: 'addressLocal', label: 'כתובת בשפה המקומית (לנהג מונית)', type: 'textarea' })}
              <div className="grid grid-cols-2 gap-2">
                {fld({ k: 'checkIn', label: 'צ׳ק-אין', type: 'date' })}
                {fld({ k: 'checkOut', label: 'צ׳ק-אאוט', type: 'date' })}
              </div>
              {fld({ k: 'phone', label: 'טלפון', type: 'tel' })}
            </>
          )}

          {/* Common */}
          {fld({
            k: 'confirmation',
            label: ['accommodation', 'attraction', 'restaurant'].includes(form.type) ? 'מס׳ הזמנה' : 'אסמכתא',
            dir: 'ltr',
          })}
          {fld({ k: 'notes', label: 'הערות', type: 'textarea' })}

          <div className="flex gap-3 pt-1">
            {editing?.id && (
              <button
                type="button"
                onClick={() => setToDelete(editing)}
                className="rounded-2xl bg-petal px-4 py-2.5 font-semibold text-rose-deep transition active:scale-95"
              >
                מחיקה 🗑️
              </button>
            )}
            <button type="submit" className={`${btnPrimary} flex-1`}>
              שמירה 💾
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="למחוק את הכרטיס?"
        message={toDelete?.title}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          remove(toDelete.id).catch((err) => console.error('delete failed', err));
          setToDelete(null);
          close();
        }}
      />
    </div>
  );
}
