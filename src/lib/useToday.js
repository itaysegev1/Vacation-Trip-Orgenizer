import { useEffect, useState } from 'react';
import { ymd, TODAY_REFRESH_MS } from './tripConfig';

// ─────────────────────────────────────────────────────────────
// useToday() — the local "YYYY-MM-DD" of right now, as REACTIVE state.
//
// A PWA kept alive across midnight (the normal mobile case — it resumes, it
// doesn't remount) must not keep yesterday baked into memos: expense-form
// defaults, budget analytics, nudges. This hook re-checks on visibility/focus
// (the app-resume moment) plus a slow interval, and only sets state when the
// day actually changed — zero re-renders otherwise.
// ─────────────────────────────────────────────────────────────
export function useToday() {
  const [today, setToday] = useState(() => ymd(new Date()));

  useEffect(() => {
    const check = () => setToday((prev) => {
      const now = ymd(new Date());
      return now === prev ? prev : now;
    });
    const timer = setInterval(check, TODAY_REFRESH_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  return today;
}
