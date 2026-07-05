import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { btnPrimary } from '../lib/ui';
import { CONTENT } from '../lib/tripConfig';
import { fmt } from '../config/content';
import PetalField from '../components/PetalField';

const V = CONTENT.verifyEmail;
const L = CONTENT.login;

/**
 * Shown to an authenticated, allow-listed user whose email is not yet verified.
 * firestore.rules requires email_verified, so without this gate the app would
 * just render empty with permission-denied errors. Offers resend + re-check.
 */
export default function VerifyEmail() {
  const { user, logout, resendVerification, refreshUser } = useAuth();
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    setNotice('');
    setBusy(true);
    try {
      await resendVerification();
      setNotice(V.resent);
    } catch (e) {
      setNotice(L.errors[e.code] || L.errorFallback);
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setNotice('');
    setBusy(true);
    try {
      const ok = await refreshUser(); // verified → Gate re-renders into the app
      if (!ok) setNotice(V.notYetVerified);
    } catch (e) {
      setNotice(L.errors[e.code] || L.errorFallback);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-dvh place-items-center px-6">
      <PetalField count={12} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="relative z-10 w-full max-w-sm rounded-[2rem] bg-white/85 p-7 text-center shadow-2xl backdrop-blur"
      >
        <div className="text-5xl">{V.emoji}</div>
        <h1 className="mt-2 font-display text-2xl text-rose-deep">{V.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {fmt(V.message, { email: user?.email || '' })}
        </p>
        {notice && <p className="mt-3 text-sm font-medium text-rose">{notice}</p>}
        <button onClick={check} disabled={busy} className={`${btnPrimary} mt-6 w-full`}>
          {V.refresh}
        </button>
        <button
          onClick={resend}
          disabled={busy}
          className="mt-3 w-full rounded-full bg-petal px-4 py-2.5 text-sm font-semibold text-ink-soft transition active:scale-95"
        >
          {V.resend}
        </button>
        <button onClick={logout} className="mt-4 text-xs text-ink-soft/70 underline">
          {V.signOut}
        </button>
      </motion.div>
    </div>
  );
}
