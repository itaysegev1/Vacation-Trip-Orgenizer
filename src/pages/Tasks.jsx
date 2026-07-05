import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useCollection } from '../lib/useCollection';
import { useAuth } from '../context/AuthContext';
import { COUPLE, PACKING_CATEGORIES, SHARED, NUDGES, ymd, byId, parseLocalDate, COLLECTIONS, DATE_LOCALE, TASK_TYPES, CONTENT } from '../lib/tripConfig';
import { taskUrgency } from '../lib/nudges';
import { triggerHaptic } from '../lib/haptics';
import { fireConfetti } from '../lib/confetti';
import { input, labelCls, btnPrimary } from '../lib/ui';
import { listContainer, listItem, tap, prefersReducedMotion } from '../lib/motionVariants';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const fmtDate = (s) =>
  new Intl.DateTimeFormat(DATE_LOCALE, { day: 'numeric', month: 'short' }).format(parseLocalDate(s));

function Checkbox({ done, onClick }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.8 }}
      onClick={onClick}
      aria-label={done ? 'בוצע' : 'לא בוצע'}
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition ${
        done ? 'border-jade bg-jade text-white' : 'border-blush bg-white text-transparent'
      }`}
    >
      ✓
    </motion.button>
  );
}

// Module-scope so its identity is stable — defining it inside Tasks would
// remount every row (and re-fire animations) on each Firestore re-render.
function Row({ item, onToggle, onEdit }) {
  const assignee = byId(Object.values(COUPLE), item.assignee);
  // In-app nudge: colour the due-date chip when a task is overdue / due soon.
  const urgency = taskUrgency(item, ymd(new Date()), NUDGES.taskDueSoonDays);
  const dueChipCls =
    urgency === 'overdue'
      ? 'bg-rose-deep text-white'
      : urgency === 'soon'
        ? 'bg-gold-soft text-rose-deep'
        : 'bg-petal text-rose-deep';
  return (
    <motion.li
      variants={listItem}
      layout
      className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/85 p-3 shadow-soft"
    >
      <Checkbox done={item.done} onClick={() => onToggle(item)} />
      <button onClick={() => onEdit(item)} className="min-w-0 flex-1 text-right">
        <span className={`font-medium ${item.done ? 'text-ink-soft line-through' : 'text-ink'}`}>
          {item.title}
        </span>
        <span className="mr-2 text-sm text-ink-soft">{assignee?.emoji}</span>
      </button>
      {item.dueDate && (
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${dueChipCls}`}>
          {urgency === 'overdue' ? '⏰ ' : ''}{fmtDate(item.dueDate)}
        </span>
      )}
    </motion.li>
  );
}

function ProgressBar({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-soft">
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-ink">{done} מתוך {total} הושלמו</span>
        <span className="font-semibold text-jade">{pct}%</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-petal">
        <motion.div
          className="h-full rounded-full bg-jade"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

export default function Tasks() {
  const { docs, add, update, remove } = useCollection(COLLECTIONS.tasks);
  const { profile } = useAuth();
  const [tab, setTab] = useState('task');

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [toDelete, setToDelete] = useState(null);

  const taskItems = useMemo(() => {
    return docs
      .filter((d) => d.type === 'task')
      .sort((a, b) => {
        if (!!a.done !== !!b.done) return a.done ? 1 : -1;
        return (a.dueDate || '￿').localeCompare(b.dueDate || '￿');
      });
  }, [docs]);

  const packItems = useMemo(() => docs.filter((d) => d.type === 'packing'), [docs]);

  const packByCat = useMemo(() => {
    return PACKING_CATEGORIES.map((c) => ({
      ...c,
      items: packItems.filter((p) => (p.category || 'other') === c.id),
    })).filter((g) => g.items.length > 0);
  }, [packItems]);

  const list = tab === 'task' ? taskItems : packItems;
  const doneCount = list.filter((x) => x.done).length;

  const openNew = (category) => {
    setForm(
      tab === 'task'
        ? { title: '', type: 'task', assignee: profile?.id || SHARED.id, dueDate: '' }
        : { title: '', type: 'packing', category: category || PACKING_CATEGORIES[0]?.id, assignee: SHARED.id }
    );
    setEditing({});
  };
  const openEdit = (item) => {
    setForm({ ...item });
    setEditing(item);
  };
  const close = () => setEditing(null);
  const toggle = (item) => {
    const completing = !item.done;
    triggerHaptic(completing ? 'success' : 'light');
    if (completing) fireConfetti();
    update(item.id, { done: !item.done }).catch((err) => console.error('task toggle failed', err));
  };

  const save = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    // Guard the optional keys — Firestore rejects `undefined` (an older doc
    // spread into the form via openEdit may be missing them).
    const data =
      form.type === 'task'
        ? {
            title: form.title.trim(),
            type: 'task',
            assignee: form.assignee ?? SHARED.id,
            dueDate: form.dueDate || '',
            done: form.done || false,
          }
        : {
            title: form.title.trim(),
            type: 'packing',
            category: form.category ?? PACKING_CATEGORIES[0]?.id ?? null,
            assignee: form.assignee ?? SHARED.id,
            done: form.done || false,
          };
    (editing?.id ? update(editing.id, data) : add({ ...data, done: false })).catch((err) =>
      console.error('task save failed', err)
    );
    close();
  };

  return (
    <div>
      <div className="mb-3 flex items-end justify-between">
        <h1 className="font-display text-3xl text-rose-deep">משימות ואריזה 🧳</h1>
        <motion.button whileTap={tap} onClick={() => openNew()} className={btnPrimary}>
          הוספה +
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 rounded-2xl bg-white/60 p-1">
        {TASK_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              tab === t.id ? 'text-white' : 'text-ink-soft'
            }`}
          >
            {tab === t.id && (
              <motion.span
                layoutId="taskTab"
                transition={prefersReducedMotion ? { duration: 0 } : undefined}
                className="absolute inset-0 rounded-xl bg-rose-deep"
                style={{ zIndex: 0 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </div>

      <ProgressBar done={doneCount} total={list.length} />

      <div className="mt-4">
        {list.length === 0 ? (
          <EmptyState
            emoji={tab === 'task' ? '📝' : '🧳'}
            title={tab === 'task' ? 'אין משימות — איזה כיף!' : 'המזוודה עוד ריקה'}
            subtitle={
              tab === 'task'
                ? 'הוסיפו מה צריך לסדר לפני הטיסה — דרכונים, ביטוח, כסף… ✈️'
                : CONTENT.tasks.packingEmptySubtitle
            }
            action={
              <button
                onClick={() => openNew()}
                className="rounded-2xl bg-rose-deep px-4 py-2 font-semibold text-white shadow-soft active:scale-95 transition"
              >
                הוספה +
              </button>
            }
          />
        ) : tab === 'task' ? (
          <motion.ul
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0"
          >
            {taskItems.map((item) => (
              <Row key={item.id} item={item} onToggle={toggle} onEdit={openEdit} />
            ))}
          </motion.ul>
        ) : (
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0">
            {packByCat.map((group) => (
              <section key={group.id}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-display text-lg text-rose-deep">
                    {group.emoji} {group.label}
                  </h3>
                  <button
                    onClick={() => openNew(group.id)}
                    className="rounded-full bg-petal px-3 py-1 text-sm font-semibold text-rose-deep active:scale-95 transition"
                  >
                    +
                  </button>
                </div>
                <motion.ul variants={listContainer} initial="hidden" animate="show" className="space-y-2">
                  {group.items.map((item) => (
                    <Row key={item.id} item={item} onToggle={toggle} onEdit={openEdit} />
                  ))}
                </motion.ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Add / edit */}
      <Modal
        open={editing !== null}
        onClose={close}
        title={editing?.id ? 'עריכה' : form.type === 'packing' ? 'פריט אריזה 🧳' : 'משימה חדשה ✅'}
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className={labelCls}>{form.type === 'packing' ? 'מה אורזים?' : 'מה צריך לעשות?'}</label>
            <input
              className={input}
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={form.type === 'packing' ? 'דרכון, מטען, אדפטר…' : 'להזמין כרטיסים, להחליף כסף…'}
              autoFocus
              required
            />
          </div>

          {form.type === 'packing' ? (
            <div>
              <label className={labelCls}>קטגוריה</label>
              <div className="flex flex-wrap gap-2">
                {PACKING_CATEGORIES.map((c) => (
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
          ) : (
            <div>
              <label className={labelCls}>תאריך יעד (אופציונלי)</label>
              <input
                className={input}
                type="date"
                dir="ltr"
                value={form.dueDate || ''}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className={labelCls}>אחראי</label>
            <div className="flex gap-2">
              {Object.values(COUPLE).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setForm({ ...form, assignee: p.id })}
                  className={`flex-1 rounded-2xl py-2.5 font-semibold transition active:scale-95 ${
                    form.assignee === p.id ? 'bg-sakura text-white' : 'bg-petal text-ink-soft'
                  }`}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
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
