// ─────────────────────────────────────────────────────────────
// nudges — pure, client-side reminder helpers. IN-APP ONLY (Firebase Spark
// can't SEND push). Surfaced as a Dashboard banner + due-date chip styling on
// Tasks. No Firestore, no network. Dates are local "YYYY-MM-DD" strings.
// ─────────────────────────────────────────────────────────────

// today + n days, as a local YYYY-MM-DD string.
function shiftDay(todayStr, n) {
  const d = new Date(`${todayStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Urgency of a single task: 'overdue' | 'soon' | 'none'. */
export function taskUrgency(task, todayStr, soonDays = 3) {
  if (!task || task.done || task.type !== 'task' || !task.dueDate) return 'none';
  if (task.dueDate < todayStr) return 'overdue';
  if (task.dueDate <= shiftDay(todayStr, soonDays)) return 'soon';
  return 'none';
}

/** Counts of overdue / soon open tasks. */
export function summarizeTaskUrgency(tasks, todayStr, soonDays = 3) {
  let overdue = 0;
  let soon = 0;
  (tasks || []).forEach((t) => {
    const u = taskUrgency(t, todayStr, soonDays);
    if (u === 'overdue') overdue += 1;
    else if (u === 'soon') soon += 1;
  });
  return { overdue, soon };
}

/** Budget pressure level from already-computed spent vs budget. */
export function budgetLevel(spent, budget, warnThreshold = 0.8) {
  if (!budget || budget <= 0) return 'ok';
  if (spent > budget) return 'over';
  if (spent >= budget * warnThreshold) return 'warn';
  return 'ok';
}
