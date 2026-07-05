import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useCollection } from '../lib/useCollection';
import {
  APP_CATEGORIES,
  APP_COUNTRY,
  APP_COUNTRY_TABS,
  APP_GENERAL,
  DESTINATIONS,
  SEED_APPS,
  COLLECTIONS,
} from '../lib/tripConfig';
import { input, labelCls, btnPrimary, btnGhost, normalizeUrl } from '../lib/ui';
import { listContainer, listItem, tap, prefersReducedMotion } from '../lib/motionVariants';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

// New app defaults to the first destination (config-driven, no hardcoded leg).
const DEFAULT_COUNTRY = DESTINATIONS[0]?.id || APP_GENERAL.id;
const DEFAULT_CATEGORY = APP_CATEGORIES[0]?.id || 'taxi';
const EMPTY = { name: '', country: DEFAULT_COUNTRY, category: DEFAULT_CATEGORY, link: '' };

export default function Apps() {
  const { docs, loading, add, update, remove } = useCollection(COLLECTIONS.apps);
  const [country, setCountry] = useState('all');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [toDelete, setToDelete] = useState(null);

  const filtered = useMemo(
    () => (country === 'all' ? docs : docs.filter((d) => d.country === country)),
    [docs, country]
  );

  // Group the filtered apps by category, preserving category order.
  const groups = useMemo(
    () =>
      APP_CATEGORIES.map((c) => ({
        ...c,
        items: filtered
          .filter((a) => (a.category || DEFAULT_CATEGORY) === c.id)
          .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      })).filter((g) => g.items.length > 0),
    [filtered]
  );

  const openNew = () => {
    setForm(EMPTY);
    setEditing({});
  };
  const openEdit = (app) => {
    setForm({ ...EMPTY, ...app });
    setEditing(app);
  };
  const close = () => setEditing(null);

  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const data = {
      name: form.name.trim(),
      country: form.country,
      category: form.category,
      link: normalizeUrl(form.link),
    };
    (editing?.id ? update(editing.id, data) : add(data)).catch((err) =>
      console.error('app save failed', err)
    );
    close();
  };

  const seedApps = () => {
    SEED_APPS.forEach((a) => add(a).catch((err) => console.error('seed app failed', err)));
  };

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl text-rose-deep">אפליקציות 📱</h1>
          <p className="text-sm text-ink-soft">{docs.length} אפליקציות לטיול</p>
        </div>
        <motion.button whileTap={tap} onClick={openNew} className={btnPrimary}>
          הוספה +
        </motion.button>
      </div>

      {/* Country tabs — premium segmented control with a sliding pill */}
      <div className="mb-4 flex gap-1 rounded-2xl bg-white/60 p-1">
        {APP_COUNTRY_TABS.map((c) => {
          const active = country === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCountry(c.id)}
              className="relative flex-1 rounded-xl py-2 text-sm font-semibold transition"
            >
              {active && (
                <motion.span
                  layoutId="appsTab"
                  transition={prefersReducedMotion ? { duration: 0 } : undefined}
                  className="absolute inset-0 rounded-xl bg-rose-deep"
                  style={{ zIndex: 0 }}
                />
              )}
              <span className={`relative z-10 ${active ? 'text-white' : 'text-ink-soft'}`}>
                {c.flag} {c.label}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        docs.length === 0 ? (
          <EmptyState
            emoji="📱"
            title="עוד לא הוספתם אפליקציות!"
            subtitle="אפליקציות מוניות, מסעדות וניווט יחסכו לכם כאב ראש בדרך — נתחיל? 🚕🗺️"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={seedApps} className={btnPrimary}>
                  ✨ הוספת אפליקציות מומלצות
                </button>
                <button onClick={openNew} className={btnGhost}>
                  הוספה ידנית
                </button>
              </div>
            }
          />
        ) : (
          <EmptyState
            emoji="🔍"
            title="אין אפליקציות ביעד הזה"
            subtitle="נסו יעד אחר או הוסיפו אפליקציה חדשה"
            action={
              <button onClick={openNew} className={btnGhost}>
                הוספת אפליקציה
              </button>
            }
          />
        )
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.id}>
              <h2 className="mb-2 font-display text-lg text-rose-deep">
                {group.emoji} {group.label}
              </h2>
              <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-2">
                {group.items.map((app) => {
                  const c = APP_COUNTRY[app.country] || APP_COUNTRY[APP_GENERAL.id];
                  return (
                    <motion.div
                      key={app.id}
                      variants={listItem}
                      layout
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-soft"
                    >
                      <button onClick={() => openEdit(app)} className="min-w-0 flex-1 text-right">
                        <div className="truncate font-semibold text-ink">{app.name}</div>
                        <div className="text-xs text-ink-soft">
                          {c.flag} {c.label}
                        </div>
                      </button>
                      {app.link && (
                        <a
                          href={app.link}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-full bg-petal px-3 py-1.5 text-sm font-semibold text-rose-deep active:scale-95 transition"
                        >
                          פתיחה ↗
                        </a>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </section>
          ))}
        </div>
      )}

      {/* Add / edit */}
      <Modal open={editing !== null} onClose={close} title={editing?.id ? 'עריכת אפליקציה' : 'אפליקציה חדשה 📱'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className={labelCls}>שם האפליקציה</label>
            <input
              className={input}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Grab / Google Maps / GO…"
              autoFocus
              required
            />
          </div>

          <div>
            <label className={labelCls}>מדינה</label>
            <div className="flex gap-2">
              {Object.entries(APP_COUNTRY).map(([id, c]) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setForm({ ...form, country: id })}
                  className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold transition active:scale-95 ${
                    form.country === id ? 'bg-sakura text-white' : 'bg-petal text-ink-soft'
                  }`}
                >
                  {c.flag} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>קטגוריה</label>
            <div className="flex flex-wrap gap-2">
              {APP_CATEGORIES.map((c) => (
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
            <label className={labelCls}>קישור (App Store / אתר)</label>
            <input
              className={input}
              dir="ltr"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://…"
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

      <ConfirmDialog
        open={!!toDelete}
        title="למחוק את האפליקציה?"
        message={toDelete?.name}
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
