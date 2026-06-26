import { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useCollection, useDocument } from '../lib/useCollection';
import {
  ITINERARY_START,
  ITINERARY_END,
  SLOTS,
  COUNTRIES,
  byId,
  ymd,
  destinationForDate,
  themeFor,
  NEUTRAL_ACCENT,
  GEO_SETTINGS,
} from '../lib/tripConfig';
import { hasCoords, haversineKm, fmtDistance, fmtWalk } from '../lib/geo';
import { nearestNeighborOrder, dayStats } from '../lib/optimizeDay';
import { input, labelCls, btnPrimary } from '../lib/ui';
import { listContainer, tap } from '../lib/motionVariants';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ItineraryItem from '../components/ItineraryItem';
import QuickPickMenu from '../components/QuickPickMenu';
import { celebrate } from '../lib/confetti';
import { triggerHaptic } from '../lib/haptics';

const SLOT_DOTS = { morning: 'var(--color-gold)', afternoon: 'var(--color-sakura)', evening: 'var(--color-jade)' };
const SLOT_OPTIONS = SLOTS.map((s) => ({ id: s.id, label: `${s.emoji} ${s.label}`, bg: '#ffffff', dot: SLOT_DOTS[s.id] }));

const weekday = (d) => new Intl.DateTimeFormat('he-IL', { weekday: 'short' }).format(d);
const longDate = (d) =>
  new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);

function buildDays() {
  const days = [];
  const start = new Date(`${ITINERARY_START}T00:00:00`);
  const end = new Date(`${ITINERARY_END}T00:00:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = ymd(d);
    const country = COUNTRIES[destinationForDate(dateStr)];
    days.push({ dateStr, date: new Date(d), country });
  }
  return days;
}

const EMPTY = { title: '', location: '', slot: 'morning', notes: '', linkedIdeaId: '' };

export default function Itinerary() {
  const { docs, add, update, remove } = useCollection('itinerary');
  const { docs: ideas } = useCollection('ideas');
  const { data: dayNames, save: saveDayNames } = useDocument('settings/dayNames');

  const days = useMemo(buildDays, []);
  const todayStr = ymd(new Date());
  const defaultDay =
    days.find((d) => d.dateStr === todayStr)?.dateStr || days[0]?.dateStr || ITINERARY_START;
  const [selected, setSelected] = useState(defaultDay);
  const [leg, setLeg] = useState('all'); // 'all' | a destination id (from config)

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [toDelete, setToDelete] = useState(null);
  const [nameModal, setNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [slotMenu, setSlotMenu] = useState(null); // { item, x, y } — long-press move-to-slot
  const [showRoute, setShowRoute] = useState(false); // expand the recommended day route

  const openSlotMenu = (item, pos) => {
    if (navigator.vibrate) navigator.vibrate(60);
    setSlotMenu({ item, x: pos.x, y: pos.y });
  };
  const changeSlot = (slotId) => {
    if (slotMenu) {
      update(slotMenu.item.id, { slot: slotId }).catch((e) => console.error('slot update failed', e));
    }
    triggerHaptic('light');
    setSlotMenu(null);
  };

  const visibleDays = leg === 'all' ? days : days.filter((d) => d.country.id === leg);
  const selectedDay = days.find((d) => d.dateStr === selected) || days[0];
  const selectedName = dayNames?.[selected] || '';
  // Accent follows the destination of the day you're viewing.
  const dayTheme = themeFor(selectedDay?.country.id);

  const switchLeg = (id) => {
    setLeg(id);
    const list = id === 'all' ? days : days.filter((d) => d.country.id === id);
    if (list.length && !list.some((d) => d.dateStr === selected)) setSelected(list[0].dateStr);
  };

  const itemsBySlot = useMemo(() => {
    const map = { morning: [], afternoon: [], evening: [] };
    docs
      .filter((d) => d.date === selected)
      .forEach((d) => (map[d.slot] || map.morning).push(d));
    // Sort by an immediate client timestamp (populated on the local snapshot,
    // unlike serverTimestamp which is null until the server responds), with an
    // id tiebreak so two devices adding to the same slot never collide.
    const ms = (d) => d.createdAtMs ?? (d.createdAt?.seconds ?? 0) * 1000;
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => ms(a) - ms(b) || a.id.localeCompare(b.id))
    );
    return map;
  }, [docs, selected]);

  const dayCounts = useMemo(() => {
    const c = {};
    docs.forEach((d) => (c[d.date] = (c[d.date] || 0) + 1));
    return c;
  }, [docs]);

  // Recommended walking route for the selected day: collect the day's stops that
  // have coordinates (the item's own, or its linked idea's), order them by
  // proximity, and estimate total distance / walking time. Display-only.
  const dayRoute = useMemo(() => {
    const all = SLOTS.flatMap((s) => itemsBySlot[s.id] || []);
    // Collect the day's LOCATED stops (item's own coords or its linked idea's).
    // Items without a location (e.g. "rest", or an airport with no coords) are
    // simply skipped; a route shows whenever ≥2 stops are located.
    const stops = all
      .map((it) => {
        const linked = it.linkedIdeaId && ideas.find((i) => i.id === it.linkedIdeaId);
        const src = hasCoords(it) ? it : hasCoords(linked) ? linked : null;
        return src ? { id: it.id, title: it.title, lat: src.lat, lng: src.lng } : null;
      })
      .filter(Boolean);
    if (stops.length < 2) return null;
    const ordered = nearestNeighborOrder(stops, null);
    return {
      ordered,
      stats: dayStats(ordered, {
        kmh: GEO_SETTINGS.walkingSpeedKmh,
        maxWalkLegKm: GEO_SETTINGS.maxWalkLegKm,
      }),
    };
  }, [itemsBySlot, ideas]);

  // Collapse the route panel when switching days, so it doesn't carry over.
  useEffect(() => setShowRoute(false), [selected]);

  const openNew = (slot) => {
    setForm({ ...EMPTY, slot });
    setEditing({});
  };
  const openEdit = (item) => {
    setForm({ ...EMPTY, ...item });
    setEditing(item);
  };
  const close = () => setEditing(null);

  const save = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const data = {
      date: selected,
      slot: form.slot,
      title: form.title.trim(),
      location: form.location.trim(),
      notes: form.notes.trim(),
      linkedIdeaId: form.linkedIdeaId || '',
    };
    if (editing?.id) {
      update(editing.id, data).catch((err) => console.error('itinerary save failed', err));
    } else {
      // Celebrate if this new item fills the day's last empty slot 🎉
      const wasEmpty = (itemsBySlot[form.slot]?.length || 0) === 0;
      const othersFilled = SLOTS.filter((s) => s.id !== form.slot).every(
        (s) => (itemsBySlot[s.id]?.length || 0) > 0
      );
      add({ ...data, createdAtMs: Date.now() }).catch((err) => console.error('itinerary save failed', err));
      if (wasEmpty && othersFilled) {
        celebrate();
        triggerHaptic('success');
      }
    }
    close();
  };

  return (
    <div>
      <div className="mb-3">
        <motion.h1
          className="font-display text-3xl"
          animate={{ color: dayTheme.accentStrong }}
          transition={{ duration: 0.5 }}
        >
          לוח זמנים 🗓️
        </motion.h1>
        <p className="text-sm text-ink-soft">
          {selectedDay?.country.flag} {selectedDay && longDate(selectedDay.date)}
        </p>
      </div>

      {/* Leg filter: All + one tab per destination */}
      <div className="mb-2 flex gap-2">
        {[{ id: 'all', label: 'הכל', flag: '✨' }, ...Object.values(COUNTRIES)].map((o) => (
          <button
            key={o.id}
            onClick={() => switchLeg(o.id)}
            style={
              leg === o.id
                ? { backgroundColor: o.id === 'all' ? NEUTRAL_ACCENT : themeFor(o.id).chip }
                : undefined
            }
            className={`flex-1 rounded-2xl py-2 text-sm font-semibold transition active:scale-95 ${
              leg === o.id ? 'text-white shadow-soft' : 'bg-white/70 text-ink-soft'
            }`}
          >
            {o.flag} {o.label}
          </button>
        ))}
      </div>

      {/* Day strip */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {visibleDays.map((d) => {
          const active = d.dateStr === selected;
          const has = dayCounts[d.dateStr] > 0;
          return (
            <button
              key={d.dateStr}
              onClick={() => setSelected(d.dateStr)}
              style={active ? { backgroundColor: themeFor(d.country.id).accentStrong } : undefined}
              className={`relative flex w-14 shrink-0 flex-col items-center rounded-2xl py-2 transition active:scale-95 ${
                active ? 'text-white shadow-soft' : 'bg-white/70 text-ink-soft'
              }`}
            >
              <span className="text-[0.65rem]">{weekday(d.date)}</span>
              <span className="font-display text-lg leading-tight">{d.date.getDate()}</span>
              <span className="text-[0.6rem]">{d.country.flag}</span>
              {has && (
                <span
                  className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                    active ? 'bg-white' : 'bg-sakura'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Per-day name / where you're staying */}
      <button
        onClick={() => {
          setNameInput(selectedName);
          setNameModal(true);
        }}
        className="mt-3 flex w-full items-center justify-between gap-2 rounded-2xl bg-gradient-to-bl from-petal to-white px-4 py-2.5 text-right shadow-soft active:scale-[0.98] transition"
      >
        <span className={`font-display text-lg ${selectedName ? 'text-ink' : 'text-ink-soft/70'}`}>
          {selectedName ? `🏨 ${selectedName}` : '📍 הוסיפו שם / מקום לינה ליום'}
        </span>
        <span className="text-rose-deep">✏️</span>
      </button>

      {/* Recommended walking route for the day (only when ≥2 stops have coords) */}
      {dayRoute && (
        <div className="mt-3 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-soft">
          <button
            onClick={() => setShowRoute((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-right"
          >
            <span className="font-display text-rose-deep">🗺️ מסלול מומלץ ליום</span>
            <span className="text-sm text-ink-soft">
              {fmtDistance(dayRoute.stats.totalKm)}
              {dayRoute.stats.walkMin > 0 ? ` · ~${fmtWalk(dayRoute.stats.walkMin)}` : ''}
              {dayRoute.stats.hasTransit ? ' · כולל מעבר 🚆' : ''} {showRoute ? '▴' : '▾'}
            </span>
          </button>
          {showRoute && (
            <ol className="mt-2 space-y-1 text-sm text-ink">
              {dayRoute.ordered.map((s, i) => {
                const leg = i > 0 ? haversineKm(dayRoute.ordered[i - 1], s) : null;
                const transit = leg != null && leg > GEO_SETTINGS.maxWalkLegKm;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {i + 1}. {s.title}
                    </span>
                    {leg != null && (
                      <span className="shrink-0 text-xs text-ink-soft">
                        {transit ? '🚆' : '🚶'} {fmtDistance(leg)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {/* Slots */}
      <div className="mt-3 space-y-4 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
        {SLOTS.map((slot) => (
          <section key={slot.id} className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-soft">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg text-rose-deep">
                {slot.emoji} {slot.label}
              </h2>
              <motion.button
                whileTap={tap}
                onClick={() => openNew(slot.id)}
                className="rounded-full bg-petal px-3 py-1 text-sm font-semibold text-rose-deep active:scale-95"
              >
                + הוספה
              </motion.button>
            </div>

            {itemsBySlot[slot.id].length === 0 ? (
              <p className="py-2 text-center text-sm text-ink-soft/70">— אין פעילויות —</p>
            ) : (
              <motion.ul variants={listContainer} initial="hidden" animate="show" className="space-y-2">
                {itemsBySlot[slot.id].map((item) => {
                  const linked = item.linkedIdeaId && ideas.find((i) => i.id === item.linkedIdeaId);
                  return (
                    <ItineraryItem
                      key={item.id}
                      item={item}
                      linkedName={linked ? linked.name : ''}
                      accent={dayTheme.accent}
                      onEdit={() => openEdit(item)}
                      onLongPress={(pos) => openSlotMenu(item, pos)}
                    />
                  );
                })}
              </motion.ul>
            )}
          </section>
        ))}
      </div>

      {/* Add / edit */}
      <Modal
        open={editing !== null}
        onClose={close}
        title={editing?.id ? 'עריכת פעילות' : 'פעילות חדשה ✨'}
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className={labelCls}>מה עושים?</label>
            <input
              className={input}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="ארוחת בוקר, מקדש, שייט…"
              autoFocus
              required
            />
          </div>
          <div>
            <label className={labelCls}>חלק מהיום</label>
            <div className="flex gap-2">
              {SLOTS.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setForm({ ...form, slot: s.id })}
                  className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition active:scale-95 ${
                    form.slot === s.id ? 'bg-sakura text-white' : 'bg-petal text-ink-soft'
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>מיקום</label>
            <input
              className={input}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="כתובת / שם מקום"
            />
          </div>
          <div>
            <label className={labelCls}>קישור לרעיון (אופציונלי)</label>
            <select
              className={input}
              value={form.linkedIdeaId}
              onChange={(e) => setForm({ ...form, linkedIdeaId: e.target.value })}
            >
              <option value="">— ללא —</option>
              {ideas.map((i) => (
                <option key={i.id} value={i.id}>
                  {byId(Object.values(COUNTRIES), i.country)?.flag} {i.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>הערות</label>
            <textarea
              className={`${input} min-h-20 resize-none`}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="שעות, הזמנה, טיפים…"
            />
          </div>
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

      {/* Day name / accommodation */}
      <Modal open={nameModal} onClose={() => setNameModal(false)} title="שם היום / לינה 🏨">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveDayNames({ [selected]: nameInput.trim() }).catch((err) =>
              console.error('day name save failed', err)
            );
            setNameModal(false);
          }}
          className="space-y-4"
        >
          <p className="text-sm text-ink-soft">
            {selectedDay && longDate(selectedDay.date)} {selectedDay?.country.flag}
          </p>
          <div>
            <label className={labelCls}>איפה ישנים / כותרת ליום</label>
            <input
              className={input}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="מלון פארק קיוטו / יום בטוקיו…"
              autoFocus
            />
          </div>
          <button type="submit" className={`${btnPrimary} w-full`}>
            שמירה 💾
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="למחוק את הפעילות?"
        message={toDelete?.title}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          remove(toDelete.id).catch((err) => console.error('delete failed', err));
          setToDelete(null);
          close();
        }}
      />

      {/* Long-press: move activity to another time slot */}
      <QuickPickMenu
        open={!!slotMenu}
        x={slotMenu?.x}
        y={slotMenu?.y}
        title="העברה לחלק אחר ביום"
        options={SLOT_OPTIONS}
        currentId={slotMenu?.item?.slot}
        onSelect={changeSlot}
        onClose={() => setSlotMenu(null)}
      />
    </div>
  );
}
