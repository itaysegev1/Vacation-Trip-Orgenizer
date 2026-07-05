import { useState } from 'react';
import { motion } from 'motion/react';
import { useCollection } from '../lib/useCollection';
import { DOC_TYPES as TYPES, SEED_FLIGHTS, DESTINATIONS, parseLocalDate, COLLECTIONS, DATE_LOCALE } from '../lib/tripConfig';
import { input, labelCls, btnPrimary } from '../lib/ui';
import { listContainer, listItem, tap } from '../lib/motionVariants';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import MapLink from '../components/MapLink';
import { mapsUrl } from '../lib/maps';

// Phrasebook + emergency numbers derive from the destinations config.
const PHRASEBOOK = DESTINATIONS.filter((d) => d.phrasebook?.length).map((d) => ({
  lang: d.phrasebookLang,
  phrases: d.phrasebook,
}));

const EMERGENCY = [
  ...DESTINATIONS.flatMap((d) =>
    d.emergencyNumbers.map((n) => ({ label: `${d.name} · ${n.label}`, value: n.value }))
  ),
  ...DESTINATIONS.filter((d) => d.embassy).map((d) => d.embassy),
];

const fmtDate = (s) =>
  s ? new Intl.DateTimeFormat(DATE_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }).format(parseLocalDate(s)) : '';

export default function Documents() {
  const { docs, add, update, remove } = useCollection(COLLECTIONS.documents);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ type: 'flight', title: '', fields: {} });
  const [toDelete, setToDelete] = useState(null);

  const openNew = (type) => {
    setForm({ type, title: '', fields: {} });
    setEditing({});
  };
  const openEdit = (doc) => {
    setForm({ type: doc.type, title: doc.title || '', fields: { ...(doc.fields || {}) } });
    setEditing(doc);
  };
  const close = () => setEditing(null);

  const save = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const data = { type: form.type, title: form.title.trim(), fields: form.fields };
    (editing?.id ? update(editing.id, data) : add(data)).catch((err) =>
      console.error('document save failed', err)
    );
    close();
  };

  const seedFlights = () => {
    SEED_FLIGHTS.forEach((f) =>
      add({ type: 'flight', ...f }).catch((err) => console.error('seed flight failed', err))
    );
  };

  const renderCardBody = (doc) => {
    const cfg = TYPES[doc.type];
    const f = doc.fields || {};
    return (
      <div className="mt-1 space-y-0.5 text-sm text-ink-soft">
        {cfg.fields.map((field) => {
          const val = f[field.key];
          if (!val) return null;
          if (field.type === 'date') return <div key={field.key}>📅 {fmtDate(val)}</div>;
          if (field.type === 'time') return <div key={field.key}>🕐 {val}</div>;
          if (field.key === 'address')
            return (
              <div key={field.key}>
                <MapLink query={val} />
              </div>
            );
          if (field.key === 'addressLocal')
            return (
              <a
                key={field.key}
                href={mapsUrl(val)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-1 block rounded-2xl border border-gold-soft bg-gold-soft/30 p-2 text-base text-ink active:scale-[0.98] transition"
              >
                🗺️ {val}
              </a>
            );
          if (field.type === 'tel')
            return (
              <div key={field.key}>
                📞{' '}
                <a href={`tel:${val}`} dir="ltr" className="text-jade" onClick={(e) => e.stopPropagation()}>
                  {val}
                </a>
              </div>
            );
          if (field.key === 'notes') return <div key={field.key}>{val}</div>;
          return (
            <div key={field.key}>
              <span className="font-medium">{field.label}:</span> {val}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <h1 className="mb-3 font-display text-3xl text-rose-deep">מסמכים ומידע 📁</h1>

      {/* Emergency reference (static) */}
      <section className="mb-5 rounded-2xl border border-white/70 bg-gradient-to-bl from-rose/10 to-white p-4 shadow-soft">
        <h2 className="mb-2 font-display text-lg text-rose-deep">🆘 מספרי חירום</h2>
        <div className="grid grid-cols-2 gap-2">
          {EMERGENCY.map((e) => (
            <a
              key={e.label}
              href={`tel:${e.value}`}
              className="rounded-2xl bg-white/80 px-3 py-2 active:scale-95 transition"
            >
              <div className="text-xs text-ink-soft">{e.label}</div>
              <div dir="ltr" className="text-right font-semibold text-ink">{e.value}</div>
            </a>
          ))}
        </div>
        <p className="mt-2 text-[0.7rem] text-ink-soft/70">מומלץ לוודא את מספרי השגרירות לפני הנסיעה.</p>
      </section>

      {/* Dynamic sections */}
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
      {Object.entries(TYPES)
        .filter(([, cfg]) => !cfg.walletOnly)
        .map(([type, cfg]) => {
        const items = docs.filter((d) => d.type === type);
        return (
          <section key={type} className="mb-5 lg:mb-0">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-xl text-rose-deep">
                {cfg.emoji} {cfg.label}
              </h2>
              <motion.button
                whileTap={tap}
                onClick={() => openNew(type)}
                className="rounded-full bg-petal px-3 py-1 text-sm font-semibold text-rose-deep active:scale-95"
              >
                + הוספה
              </motion.button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-line bg-white/50 p-4 text-center">
                <p className="text-sm text-ink-soft">אין עדיין {cfg.label}</p>
                {type === 'flight' && (
                  <button onClick={seedFlights} className="mt-2 rounded-2xl bg-petal px-4 py-2 text-sm font-semibold text-rose-deep active:scale-95 transition">
                    ➕ הוספת 3 הטיסות הידועות
                  </button>
                )}
              </div>
            ) : (
              <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-2">
                {items.map((doc) => (
                  <motion.button
                    key={doc.id}
                    variants={listItem}
                    whileTap={tap}
                    layout
                    onClick={() => openEdit(doc)}
                    className="w-full rounded-2xl border border-white/70 bg-white/85 p-4 text-right shadow-soft"
                  >
                    <div className="font-display text-lg text-ink">{doc.title}</div>
                    {renderCardBody(doc)}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </section>
        );
      })}
      </div>

      {/* Pocket phrasebook (static) */}
      <section className="mb-5">
        <h2 className="mb-2 font-display text-xl text-rose-deep">🗣️ מילון כיס</h2>
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {PHRASEBOOK.map((group) => (
            <div key={group.lang} className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-soft">
              <h3 className="mb-2 font-display text-lg text-ink">{group.lang}</h3>
              <div className="space-y-1.5">
                {group.phrases.map((p) => (
                  <div key={p.he} className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1.5 last:border-0">
                    <span className="text-sm text-ink-soft">{p.he}</span>
                    <span className="text-left">
                      <span className="text-base text-ink">{p.local}</span>
                      <span dir="ltr" className="block text-xs text-ink-soft/70">{p.rom}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Add / edit */}
      <Modal
        open={editing !== null}
        onClose={close}
        title={`${editing?.id ? 'עריכה' : 'הוספה'} · ${TYPES[form.type]?.label}`}
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className={labelCls}>{TYPES[form.type]?.titleLabel}</label>
            <input
              className={input}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={TYPES[form.type]?.titlePlaceholder}
              autoFocus
              required
            />
          </div>
          {TYPES[form.type]?.fields.map((field) => (
            <div key={field.key}>
              <label className={labelCls}>{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  className={`${input} min-h-20 resize-none`}
                  value={form.fields[field.key] || ''}
                  onChange={(e) => setForm({ ...form, fields: { ...form.fields, [field.key]: e.target.value } })}
                />
              ) : (
                <input
                  className={input}
                  type={field.type === 'tel' ? 'tel' : field.type}
                  dir={['date', 'time', 'tel'].includes(field.type) ? 'ltr' : 'rtl'}
                  value={form.fields[field.key] || ''}
                  onChange={(e) => setForm({ ...form, fields: { ...form.fields, [field.key]: e.target.value } })}
                />
              )}
            </div>
          ))}
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
        title="למחוק?"
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
