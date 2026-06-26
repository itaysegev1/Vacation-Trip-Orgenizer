import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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
import { BRANDING } from '../lib/tripConfig';
import { UndoProvider } from '../context/UndoContext';
import { TripDataProvider } from '../context/TripDataContext';

import Dashboard from '../pages/Dashboard';
import Ideas from '../pages/Ideas';
import Itinerary from '../pages/Itinerary';
import Budget from '../pages/Budget';
import Tasks from '../pages/Tasks';
import Wallet from '../pages/Wallet';
import Documents from '../pages/Documents';
import Apps from '../pages/Apps';

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
          <CurrencyCalculator />
          <button
            onClick={onLogout}
            aria-label="התנתקות"
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
      <PetalField count={12} />

      <Header onLogout={() => setConfirmLogout(true)} profile={profile} />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl lg:gap-6 lg:px-6">
        <SideNav />
        <main className="min-w-0 flex-1 px-4 pb-28 pt-3 lg:px-0 lg:pb-12">
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
                <Route path="/ideas" element={<PageTransition><Ideas /></PageTransition>} />
                <Route path="/itinerary" element={<PageTransition><Itinerary /></PageTransition>} />
                <Route path="/budget" element={<PageTransition><Budget /></PageTransition>} />
                <Route path="/tasks" element={<PageTransition><Tasks /></PageTransition>} />
                <Route path="/wallet" element={<PageTransition><Wallet /></PageTransition>} />
                <Route path="/documents" element={<PageTransition><Documents /></PageTransition>} />
                <Route path="/apps" element={<PageTransition><Apps /></PageTransition>} />
                <Route path="*" element={<PageTransition><Dashboard /></PageTransition>} />
              </Routes>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <BottomNav />
      <HomeFab />
      <PetalBurst />
      <InstallPrompt />

      <ConfirmDialog
        open={confirmLogout}
        title="להתנתק?"
        message="תצטרכו להתחבר שוב בפעם הבאה"
        confirmLabel="התנתקות"
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
