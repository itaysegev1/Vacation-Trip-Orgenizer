import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { prefersReducedMotion } from '../lib/motionVariants';
import { CONTENT, FEATURES } from '../lib/tripConfig';
import { triggerHaptic } from '../lib/haptics';
import NavIcon from './NavIcons';

// Nav labels come from the content module; icons resolve from the route (NavIcon).
// A tab only shows when its feature flag is on (home has no flag and always shows) —
// mirroring the route gating in Layout.
export const TABS = CONTENT.nav.filter(
  (tab) => tab.end || FEATURES[tab.to.slice(1)] !== false
);

export default function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/20 bg-white/70 backdrop-blur-lg pb-safe lg:hidden"
      aria-label="ניווט ראשי"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-0 pt-1.5">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink to={tab.to} end={tab.end} className="block" onClick={() => triggerHaptic('light')}>
              {({ isActive }) => (
                <span className="flex flex-col items-center gap-0.5 px-0 py-1">
                  <motion.span
                    animate={isActive && !prefersReducedMotion ? { scale: [1, 1.28, 1] } : { scale: 1 }}
                    transition={{ duration: 0.42, ease: 'easeOut' }}
                    whileTap={{ scale: 0.82 }}
                    className="transition-colors"
                    style={{ color: isActive ? 'var(--color-rose-deep)' : 'var(--color-ink-soft)' }}
                  >
                    <NavIcon to={tab.to} filled={isActive} className="h-[1.35rem] w-[1.35rem]" />
                  </motion.span>
                  <span
                    className={`text-[0.56rem] font-semibold transition-colors ${
                      isActive ? 'text-rose-deep' : 'text-ink-soft/80'
                    }`}
                  >
                    {tab.label}
                  </span>
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
