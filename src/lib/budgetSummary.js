// ─────────────────────────────────────────────────────────────
// budgetSummary — OPTIONAL atomic running-total (#8). OFF by default
// (`SUMMARY_DOC.enabled === false`), so nothing is wired into Budget/Dashboard
// yet — this ships as a clean future toggle.
//
// When enabled, call applyExpenseDelta() alongside each expense mutation:
//   • add:    applyExpenseDelta(+amountILS, +1)
//   • remove: applyExpenseDelta(-amountILS, -1)   (mirror in the undo commit)
//   • update: applyExpenseDelta(newILS - oldILS, 0)
// Then read `summary/budget` on the Dashboard for an instant total. Note: at
// N≈2 travellers, recomputing from the already-subscribed `expenses` is free and
// drift-proof, so prefer that unless an expense list grows large.
// ─────────────────────────────────────────────────────────────
import { doc, setDoc, increment } from 'firebase/firestore';
import { db, isDemo } from './firebase';
import * as demo from './demoStore';
import { SUMMARY_DOC } from './tripConfig';

export function applyExpenseDelta(deltaILS, deltaCount = 0) {
  if (!SUMMARY_DOC.enabled) return Promise.resolve();
  if (isDemo) return demo.demoIncrement(SUMMARY_DOC.path, { totalILS: deltaILS, count: deltaCount });
  if (!db) return Promise.resolve();
  return setDoc(
    doc(db, SUMMARY_DOC.path),
    { totalILS: increment(deltaILS), count: increment(deltaCount) },
    { merge: true }
  ).catch(() => {});
}
