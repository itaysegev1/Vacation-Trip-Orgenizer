import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { STORAGE_PREFIX } from '../lib/tripConfig';

const DISMISS_KEY = `${STORAGE_PREFIX}_install_dismissed_v1`;

// localStorage can throw (blocked storage / private mode) — never crash the shell.
const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;

/**
 * Custom install affordance. On Chrome/Edge/Android it captures the
 * `beforeinstallprompt` event and shows a one-tap "התקנה" button. On iOS
 * Safari (which never fires that event) it shows a short "Add to Home Screen"
 * hint instead. Dismissible and remembered.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    if (isStandalone()) return undefined;

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setDeferred(null);
      setIosHint(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iOS has no beforeinstallprompt — surface a manual hint.
    if (isIOS()) setIosHint(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const show = !dismissed && (deferred || iosHint);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="fixed inset-x-0 bottom-44 z-40 mx-auto w-[min(92%,28rem)] lg:bottom-8"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-2xl">
            <span className="text-2xl">🌸</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">התקינו את האפליקציה</div>
              <div className="truncate text-xs text-ink-soft">
                {deferred ? 'גישה מהירה ממסך הבית, גם בלי אינטרנט' : 'שתפו ⬆️ ← "הוסף למסך הבית"'}
              </div>
            </div>
            {deferred && (
              <button
                onClick={install}
                className="shrink-0 rounded-xl bg-rose-deep px-3 py-2 text-sm font-semibold text-white transition active:scale-95"
              >
                התקנה
              </button>
            )}
            <button onClick={dismiss} aria-label="סגירה" className="shrink-0 px-1 text-ink-soft">
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
