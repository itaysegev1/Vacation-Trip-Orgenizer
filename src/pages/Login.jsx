import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { input, labelCls, btnPrimary } from '../lib/ui';
import { BRANDING, CONTENT, TRAVELLERS, isHoneymoon } from '../lib/tripConfig';
import PetalField from '../components/PetalField';

const L = CONTENT.login;
// Couple tagline (e.g. "איתי 🦊 ♡ איתן 🐼") — a romantic, honeymoon-only flourish.
const coupleTagline = TRAVELLERS.map((t) => `${t.label} ${t.emoji}`).join(L.coupleSeparator);

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await (isRegister ? register(email, password) : login(email, password));
    } catch (e2) {
      setErr(L.errors[e2.code] || L.errorFallback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-center px-6">
      <PetalField count={18} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="relative z-10 w-full max-w-sm rounded-[2rem] bg-white/85 p-7 text-center shadow-2xl backdrop-blur"
      >
        <div className="text-5xl">{BRANDING.logoEmoji}</div>
        <h1 className="mt-2 font-display text-3xl text-rose-deep">{BRANDING.appName}</h1>
        <p className="mt-1 text-sm text-ink-soft">{L.subtitle}</p>
        {isHoneymoon && <div className="mt-1 text-sm text-rose">{coupleTagline}</div>}

        <form onSubmit={onSubmit} className="mt-6 space-y-4 text-right">
          <div>
            <label className={labelCls} htmlFor="email">{L.emailLabel}</label>
            <input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              className={input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="password">{L.passwordLabel}</label>
            <input
              id="password"
              type="password"
              dir="ltr"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {err && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-rose/10 px-3 py-2 text-sm font-medium text-rose-deep"
            >
              {err}
            </motion.p>
          )}

          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
            {busy ? (isRegister ? L.registerBusy : L.busy) : isRegister ? L.registerButton : L.button}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setErr('');
            setMode(isRegister ? 'login' : 'register');
          }}
          className="mt-4 text-sm font-semibold text-rose-deep underline-offset-2 transition hover:underline"
        >
          {isRegister ? L.toggleToLogin : L.toggleToRegister}
        </button>
      </motion.div>
    </div>
  );
}
