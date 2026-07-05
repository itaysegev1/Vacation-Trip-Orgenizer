import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import PetalField from './PetalField';
import PetalBurst from './PetalBurst';
import InstallPrompt from './InstallPrompt';
import BottomNav from './BottomNav';
import SideNav from './SideNav';
import PageTransition from './PageTransition';
import ConfirmDialog from './ConfirmDialog';
import { CountdownChip } from './Countdown';
import HomeFab from './HomeFab';
import CurrencyCalculator from './CurrencyCalculator';
import { useAuth } from '../context/AuthContext';
import { BRANDING, CONTENT, FEATURES, EFFECTS } from '../lib/tripConfig';
import { UndoProvider } from '../context/UndoContext';
import { TripDataProvider } from '../context/TripDataContext';

// Route-level code splitting: each page loads as its own chunk on first visit,
// keeping the initial (precached) bundle small on mobile.
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Ideas = lazy(() => import('../pages/Ideas'));
const Itinerary = lazy(() => import('../pages/Itinerary'));
const Budget = lazy(() => import('../pages/Budget'));
const Tasks = lazy(() => import('../pages/Tasks'));
const Wallet = lazy(() => import('../pages/Wallet'));
const Documents = lazy(() => import('../pages/Documents'));
const Apps = lazy(() => import('../pages/Apps'));

function Header({ onLogout, profile }) {
  return (
    <header className="glass sticky top-0 z-30 border-b border-white/30 pt-safe">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 lg:px-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{BRANDING.logoEmoji}</span>
          <div className="leading-tight">
            <div className="font-display text-lg text-rose-deep">{BRANDING.appName}</div>
            <div className="-mt-0.5 text-[0.65rem] text-ink-soft">{BRANDING.tagline}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CountdownChip />
          {FEATURES.currencyCalculator && <CurrencyCalculator />}
          <button
            onClick={onLogout}
            aria-label={CONTENT.common.logout}
            title={profile?.label}
            className="grid h-9 w-9 place-items-center rounded-full bg-petal text-lg active:scale-90 transition"
          >
            {profile?.emoji || '💕'}
          </button>
        </div>
      </div>
    </header>
  );
}

export default function Layout() {
  const location = useLocation();
  const { logout, profile } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <UndoProvider>
    <TripDataProvider>
    <div className="relative min-h-dvh">
      {FEATURES.petals && <PetalField count={EFFECTS.petalCount.app} />}

      <Header onLogout={() => setConfirmLogout(true)} profile={profile} />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl lg:gap-6 lg:px-6">
        <SideNav />
        <main className="min-w-0 flex-1 px-4 pb-28 pt-3 lg:px-0 lg:pb-12">
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <Suspense fallback={null}>
              <AnimatePresence mode="wait">
                {/* Feature-gated routes: a disabled module has no route (and no
                    nav tab — BottomNav filters the same flags); unknown/disabled
                    paths redirect home. */}
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
                  {FEATURES.ideas && <Route path="/ideas" element={<PageTransition><Ideas /></PageTransition>} />}
                  {FEATURES.itinerary && <Route path="/itinerary" element={<PageTransition><Itinerary /></PageTransition>} />}
                  {FEATURES.budget && <Route path="/budget" element={<PageTransition><Budget /></PageTransition>} />}
                  {FEATURES.tasks && <Route path="/tasks" element={<PageTransition><Tasks /></PageTransition>} />}
                  {FEATURES.wallet && <Route path="/wallet" element={<PageTransition><Wallet /></PageTransition>} />}
                  {FEATURES.documents && <Route path="/documents" element={<PageTransition><Documents /></PageTransition>} />}
                  {FEATURES.apps && <Route path="/apps" element={<PageTransition><Apps /></PageTransition>} />}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </div>
        </main>
      </div>

      <BottomNav />
      {FEATURES.homeFab && <HomeFab />}
      {FEATURES.confetti && <PetalBurst />}
      <InstallPrompt />

      <ConfirmDialog
        open={confirmLogout}
        title={CONTENT.common.logoutTitle}
        message={CONTENT.common.logoutMessage}
        confirmLabel={CONTENT.common.logout}
        cancelLabel="נשארים"
        danger={false}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
      />
    </div>
    </TripDataProvider>
    </UndoProvider>
  );
}
