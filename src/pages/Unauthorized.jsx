import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { btnPrimary } from '../lib/ui';
import { CONTENT } from '../lib/tripConfig';
import PetalField from '../components/PetalField';

const U = CONTENT.unauthorized;

/**
 * Shown when a user authenticates successfully but isn't on the trip's
 * allow-list (the "bouncer"). The real data guard is firestore.rules — this is
 * the friendly UI gate. Offers a way back out (sign out).
 */
export default function Unauthorized() {
  const { logout, user } = useAuth();

  return (
    <div className="relative grid min-h-dvh place-items-center px-6">
      <PetalField count={12} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="relative z-10 w-full max-w-sm rounded-[2rem] bg-white/85 p-7 text-center shadow-2xl backdrop-blur"
      >
        <div className="text-5xl">{U.emoji}</div>
        <h1 className="mt-2 font-display text-2xl text-rose-deep">{U.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{U.message}</p>
        {user?.email && (
          <p dir="ltr" className="mt-2 truncate text-xs text-ink-soft/70">{user.email}</p>
        )}
        <button onClick={logout} className={`${btnPrimary} mt-6 w-full`}>
          {U.signOut}
        </button>
      </motion.div>
    </div>
  );
}
