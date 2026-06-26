import { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useCollection } from '../lib/useCollection';
import { useAuth } from '../context/AuthContext';
import {
  COUNTRIES,
  DESTINATIONS,
  IDEA_CATEGORIES,
  IDEA_STATUSES,
  SLOTS,
  tripDays,
  byId,
  themeFor,
  NEUTRAL_ACCENT,
  SHARED,
  CONTENT,
} from '../lib/tripConfig';
import { input, labelCls, btnPrimary, btnGhost } from '../lib/ui';
import { listContainer, tap } from '../lib/motionVariants';
import { geocode } from '../lib/geocode';
import { sortByDistance, distanceFrom, hasCoords } from '../lib/geo';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import SwipeableRow from '../components/SwipeableRow';
import IdeaCard from '../components/IdeaCard';
import QuickPickMenu from '../components/QuickPickMenu';
import { useUndo } from '../context/UndoContext';
import { triggerHaptic } from '../lib/haptics';

const STATUS_OPTIONS = IDEA_STATUSES.map((s) => ({
  id: s.id,
  label: s.label,
  bg: s.bg,
  dot: `var(--color-${s.color})`,
}));

const EMPTY = {
  name: '',
  country: Object.values(COUNTRIES)[0]?.id || '',
  city: '',
  address: '',
  category: IDEA_CATEGORIES[0]?.id || 'food',
  status: IDEA_STATUSES[0]?.id || 'idea',
  link: '',
  notes: '',
};

const normalizeUrl = (url) => {
  const u = (url || '').trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
};

const tsOf = (d) => d.createdAt?.seconds ?? Number.MAX_SAFE_INTEGER;

function ChipRow({ items, value, onChange, allLabel = 'הכל' }) {
  const options = [{ id: 'all', label: allLabel, emoji: '✨' }, ...items];
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
              active ? 'bg-rose-deep text-white shadow-soft' : 'bg-white/70 text-ink-soft'
            }`}
          >
            {o.emoji} {o.label}
          </button>
        );
      })}
    </div>
  );
}

const DAYS = tripDays();

export default function Ideas() {
  const { docs, loading, add, update, remove } = useCollection('ideas');
  const { add: addItineraryItem } = useCollection('itinerary');
  const { profile } = useAuth();
  const { requestDelete, hiddenIds } = useUndo();

  const [search, setSearch] = useState('');
  const [fCountry, setFCountry] = useState('all');
  const [fCategory, setFCategory] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [proximity, setProximity] = useState(false);
  const [originId, setOriginId] = useState('');

  const [editing, setEditing] = useState(null); // null | EMPTY-clone | existing idea
  const [form, setForm] = useState(EMPTY);

  // Long-press quick status menu: { idea, x, y } | null
  const [statusMenu, setStatusMenu] = useState(null);

  const deleteIdea = (idea) => requestDelete(idea.id, idea.name, () => remove(idea.id));

  const openStatusMenu = (idea, pos) => {
    if (navigator.vibrate) navigator.vibrate(60); // long-press activated
    setStatusMenu({ idea, x: pos.x, y: pos.y });
  };
  const changeStatus = (statusId) => {
    if (statusMenu) {
      update(statusMenu.idea.id, { status: statusId }).catch((e) => console.error('status update failed', e));
    }
    triggerHaptic('light');
    setStatusMenu(null);
  };

  // "Add to Itinerary" flow
  const [scheduling, setScheduling] = useState(null); // the idea being scheduled
  const [sched, setSched] = useState({ date: DAYS[0]?.dateStr || '', slot: 'morning' });
  const [toast, setToast] = useState('');

  const openSchedule = (idea) => {
    // Default the date to the idea's country leg start.
    const firstOfLeg = DAYS.find((d) => d.countryId === idea.country) || DAYS[0];
    setSched({ date: firstOfLeg?.dateStr || DAYS[0]?.dateStr || '', slot: 'morning' });
    setScheduling(idea);
  };

  const confirmSchedule = (e) => {
    e.preventDefault();
    if (!sched.date) return;
    addItineraryItem({
      date: sched.date,
      slot: sched.slot,
      title: scheduling.name,
      location: scheduling.city || '',
      notes: scheduling.notes || '',
      linkedIdeaId: scheduling.id,
      createdAtMs: Date.now(),
    }).catch((err) => console.error('schedule failed', err));
    const label = byId(SLOTS, sched.slot)?.label || '';
    setToast(`✓ "${scheduling.name}" שובץ ל${label} 🗓️`);
    setScheduling(null);
    setTimeout(() => setToast(''), 2800);
  };

  const openNew = () => {
    setForm(EMPTY);
    setEditing({});
  };
  const openEdit = (idea) => {
    setForm({ ...EMPTY, ...idea });
    setEditing(idea);
  };
  const close = () => setEditing(null);

  const isoFor = (countryId) => byId(DESTINATIONS, countryId)?.iso;

  // What we geocode for an idea: its exact address if given, else its city — so
  // ideas tagged only with a city (the common case) still get coordinates.
  const locationQuery = (idea) => (idea.address?.trim() || idea.city?.trim() || '');

  // Geocode AFTER the idea is saved. Fully decoupled and fail-soft: it can never
  // block, delay or fail the save (geocode() returns null on any error/block/
  // offline, and the follow-up write is best-effort).
  const geocodeInBackground = (id, idea, prevIdea) => {
    const q = locationQuery(idea);
    if (!id || !q) return;
    // Skip if the location is unchanged and we already have coordinates.
    if (prevIdea && prevIdea.geocodedAddress === q && prevIdea.lat != null) return;
    geocode(q, isoFor(idea.country))
      .then((coords) => {
        if (coords) {
          update(id, { lat: coords.lat, lng: coords.lng, geocodedAddress: q, geocodedAt: Date.now() }).catch(() => {});
        }
      })
      .catch(() => {});
  };

  // Lazy backfill: geocode existing ideas that have a location (address OR city)
  // but no coords yet (e.g. created before geocoding existed), so proximity works
  // on legacy data. Serialized + rate-limited inside geocode(); fail-soft; demo
  // no-op (those ideas already have coords). Each id is attempted at most once.
  const geocodeAttempted = useRef(new Set());
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pending = docs.filter(
        (d) => !hasCoords(d) && locationQuery(d) && !geocodeAttempted.current.has(d.id)
      );
      for (const idea of pending) {
        if (cancelled) break;
        geocodeAttempted.current.add(idea.id);
        const q = locationQuery(idea);
        const coords = await geocode(q, isoFor(idea.country));
        if (cancelled) break;
        if (coords) {
          update(idea.id, { lat: coords.lat, lng: coords.lng, geocodedAddress: q, geocodedAt: Date.now() }).catch(() => {});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs]);

  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const data = {
      name: form.name.trim(),
      country: form.country,
      city: form.city.trim(),
      address: form.address.trim(),
      category: form.category,
      status: form.status,
      link: normalizeUrl(form.link),
      notes: form.notes.trim(),
    };
    const editingId = editing?.id;
    const prevIdea = editing;
    close(); // optimistic: close immediately, write + geocode in the background
    Promise.resolve(
      editingId ? update(editingId, data) : add({ ...data, createdBy: profile?.id || SHARED.id })
    )
      .then((ref) => geocodeInBackground(editingId || ref?.id, data, prevIdea))
      .catch((err) => console.error('idea save failed', err));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs
      .filter((d) => !hiddenIds.has(d.id)) // optimistically-deleted (pending undo)
      .filter((d) => (fCountry === 'all' ? true : d.country === fCountry))
      .filter((d) => (fCategory === 'all' ? true : d.category === fCategory))
      .filter((d) => (fStatus === 'all' ? true : d.status === fStatus))
      .filter((d) =>
        q ? `${d.name} ${d.city}`.toLowerCase().includes(q) : true
      )
      .sort((a, b) => tsOf(b) - tsOf(a));
  }, [docs, search, fCountry, fCategory, fStatus, hiddenIds]);

  // Proximity sort (only meaningful within one country, with ≥2 geocoded ideas).
  const coordIdeas = useMemo(() => filtered.filter(hasCoords), [filtered]);
  // Discoverable (control is visible) whenever the view has ≥2 geocoded ideas;
  // applicable (sort can actually run) only within a single country, since
  // crow-flies sorting across Japan↔Thailand is meaningless.
  const proximityDiscoverable = coordIdeas.length >= 2;
  const proximityApplicable = fCountry !== 'all' && coordIdeas.length >= 2;
  const origin = useMemo(
    () => coordIdeas.find((i) => i.id === originId) || coordIdeas[0] || null,
    [coordIdeas, originId]
  );
  const showProximity = proximity && proximityApplicable && !!origin;
  const displayed = useMemo(
    () => (showProximity ? sortByDistance(filtered, origin) : filtered),
    [filtered, showProximity, origin]
  );

  // Dynamic accent: each destination's theme (falls back to the default leg).
  const theme = themeFor(fCountry);

  return (
    <div>
      {/* Page header */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <motion.h1
            className="font-display text-3xl"
            animate={{ color: theme.accentStrong }}
            transition={{ duration: 0.5 }}
          >
            בנק רעיונות 💡
          </motion.h1>
          <p className="text-sm text-ink-soft">
            {docs.length} רעיונות · {filtered.length} מוצגים
          </p>
        </div>
        <motion.button
          whileTap={tap}
          onClick={openNew}
          className={btnPrimary}
          animate={{ backgroundColor: theme.accentStrong }}
          transition={{ duration: 0.5 }}
        >
          הוספה +
        </motion.button>
      </div>

      {/* Search + filters */}
      <input
        className={`${input} mb-3`}
        placeholder="🔍 חיפוש לפי שם או עיר…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="mb-2 flex gap-2">
        {[{ id: 'all', label: 'הכל', flag: '✨' }, ...Object.values(COUNTRIES)].map((c) => {
          const active = fCountry === c.id;
          const activeColor = c.id === 'all' ? NEUTRAL_ACCENT : themeFor(c.id).chip;
          return (
            <button
              key={c.id}
              onClick={() => setFCountry(c.id)}
              style={active ? { backgroundColor: activeColor } : undefined}
              className={`flex-1 rounded-2xl py-2 text-sm font-semibold transition active:scale-95 ${
                active ? 'text-white shadow-soft' : 'bg-white/70 text-ink-soft'
              }`}
            >
              {c.flag} {c.label}
            </button>
          );
        })}
      </div>
      <ChipRow items={IDEA_CATEGORIES} value={fCategory} onChange={setFCategory} />
      <div className="mt-1">
        <ChipRow items={IDEA_STATUSES} value={fStatus} onChange={setFStatus} />
      </div>

      {/* Proximity sort — visible whenever ≥2 ideas in view are geocoded. On the
          "all" view it's shown but disabled with a hint (sort needs one country). */}
      {proximityDiscoverable && (
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => proximityApplicable && setProximity((p) => !p)}
            disabled={!proximityApplicable}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${
              !proximityApplicable
                ? 'bg-white/50 text-ink-soft/60'
                : proximity
                  ? 'bg-rose-deep text-white shadow-soft'
                  : 'bg-white/70 text-ink-soft'
            }`}
          >
            {CONTENT.ideas.proximityLabel}
          </button>
          {!proximityApplicable ? (
            <span className="text-xs text-ink-soft">{CONTENT.ideas.proximityHint}</span>
          ) : (
            proximity && (
              <select
                className={`${input} min-w-0 flex-1`}
                value={origin?.id || ''}
                onChange={(e) => setOriginId(e.target.value)}
                aria-label="נקודת מוצא"
              >
                {coordIdeas.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            )
          )}
        </div>
      )}

      {/* List */}
      <div className="mt-4">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-24 rounded-3xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          docs.length === 0 ? (
            <EmptyState
              emoji="🍣"
              title="עוד לא הוספתם רעיונות!"
              subtitle="זמן לחפש סושי, מקדשים וחופים — הוסיפו את החלום הראשון שלכם ⛩️🏝️"
              action={
                <button onClick={openNew} className={btnPrimary}>
                  הוספת רעיון ראשון
                </button>
              }
            />
          ) : (
            <EmptyState
              emoji="🔍"
              title="לא נמצאו רעיונות"
              subtitle="נסו לשנות את החיפוש או הסינון"
              action={
                <button
                  onClick={() => {
                    setSearch('');
                    setFCountry('all');
                    setFCategory('all');
                    setFStatus('all');
                  }}
                  className={btnGhost}
                >
                  ניקוי סינון
                </button>
              }
            />
          )
        ) : (
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3"
          >
            <AnimatePresence>
              {displayed.map((idea) => (
                <SwipeableRow key={idea.id} onDelete={() => deleteIdea(idea)}>
                  <IdeaCard
                    idea={idea}
                    onEdit={() => openEdit(idea)}
                    onSchedule={() => openSchedule(idea)}
                    onLongPress={(pos) => openStatusMenu(idea, pos)}
                    onBadgeTap={(pos) => openStatusMenu(idea, pos)}
                    distanceKm={showProximity ? distanceFrom(origin, idea) : undefined}
                  />
                </SwipeableRow>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Add / edit sheet */}
      <Modal
        open={editing !== null}
        onClose={close}
        title={editing?.id ? 'עריכת רעיון' : 'רעיון חדש 🌸'}
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className={labelCls}>שם הפעילות / המקום</label>
            <input
              className={input}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="למשל: מקדש פושימי אינארי"
              autoFocus
              required
            />
          </div>

          <div>
            <label className={labelCls}>מדינה</label>
            <div className="flex gap-2">
              {Object.values(COUNTRIES).map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setForm({ ...form, country: c.id })}
                  className={`flex-1 rounded-2xl py-2.5 font-semibold transition active:scale-95 ${
                    form.country === c.id ? 'bg-sakura text-white' : 'bg-petal text-ink-soft'
                  }`}
                >
                  {c.flag} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>עיר</label>
            <input
              className={input}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="קיוטו, טוקיו, בנגקוק…"
            />
          </div>

          <div>
            <label className={labelCls}>כתובת / מיקום</label>
            <input
              className={input}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="כתובת מדויקת לניווט במפות…"
            />
          </div>

          <div>
            <label className={labelCls}>קטגוריה</label>
            <div className="flex flex-wrap gap-2">
              {IDEA_CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setForm({ ...form, category: c.id })}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                    form.category === c.id ? 'bg-rose-deep text-white' : 'bg-petal text-ink-soft'
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>סטטוס</label>
            <div className="flex flex-wrap gap-2">
              {IDEA_STATUSES.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setForm({ ...form, status: s.id })}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold transition active:scale-95"
                  style={
                    form.status === s.id
                      ? { background: s.bg, outline: '2px solid var(--color-rose)' }
                      : { background: '#f6eef0', color: 'var(--color-ink-soft)' }
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>קישור (אופציונלי)</label>
            <input
              className={input}
              dir="ltr"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://…"
            />
          </div>

          <div>
            <label className={labelCls}>הערות</label>
            <textarea
              className={`${input} min-h-20 resize-none`}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="פרטים, מחיר, שעות פתיחה…"
            />
          </div>

          <div className="flex gap-3 pt-1">
            {editing?.id && (
              <button
                type="button"
                onClick={() => {
                  const target = editing;
                  close();
                  deleteIdea(target);
                }}
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

      {/* Add to Itinerary */}
      <Modal
        open={!!scheduling}
        onClose={() => setScheduling(null)}
        title={`שיבוץ בלו״ז 🗓️`}
      >
        <form onSubmit={confirmSchedule} className="space-y-4">
          <p className="text-sm text-ink-soft">
            {byId(Object.values(COUNTRIES), scheduling?.country)?.flag}{' '}
            <b className="text-ink">{scheduling?.name}</b>
            {scheduling?.city ? ` · ${scheduling.city}` : ''}
          </p>
          <div>
            <label className={labelCls}>תאריך</label>
            <select
              className={input}
              value={sched.date}
              onChange={(e) => setSched({ ...sched, date: e.target.value })}
            >
              {DAYS.map((d) => (
                <option key={d.dateStr} value={d.dateStr}>
                  {COUNTRIES[d.countryId]?.flag} {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>חלק מהיום</label>
            <div className="flex gap-2">
              {SLOTS.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSched({ ...sched, slot: s.id })}
                  className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition active:scale-95 ${
                    sched.slot === s.id ? 'bg-sakura text-white' : 'bg-petal text-ink-soft'
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className={`${btnPrimary} w-full`}>
            הוספה ללו״ז 🗓️
          </button>
        </form>
      </Modal>

      {/* Long-press / badge-tap quick status menu */}
      <QuickPickMenu
        open={!!statusMenu}
        x={statusMenu?.x}
        y={statusMenu?.y}
        title="שינוי סטטוס"
        options={STATUS_OPTIONS}
        currentId={statusMenu?.idea?.status}
        onSelect={changeStatus}
        onClose={() => setStatusMenu(null)}
      />

      {/* Success toast (portaled so it's viewport-fixed, not page-fixed) */}
      {createPortal(
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[90%] rounded-2xl bg-jade px-5 py-3 text-center text-sm font-semibold text-white shadow-2xl"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
