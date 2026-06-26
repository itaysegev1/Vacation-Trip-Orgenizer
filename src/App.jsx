import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isFirebaseConfigured, isDemo } from './lib/firebase';
import Login from './pages/Login';
import Layout from './components/Layout';
import Unauthorized from './pages/Unauthorized';
import SetupNeeded from './components/SetupNeeded';

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="text-center">
        <div className="animate-bounce text-5xl">🌸</div>
        <p className="mt-2 font-display text-xl text-rose-deep">ירח דבש…</p>
      </div>
    </div>
  );
}

function Gate() {
  const { user, loading, authorized } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Login />;
  if (!authorized) return <Unauthorized />; // authenticated but not on the allow-list
  return <Layout />;
}

export default function App() {
  // Before Firebase is configured, guide the user instead of crashing.
  // (Demo mode bypasses this and runs on in-memory sample data.)
  if (!isFirebaseConfigured && !isDemo) return <SetupNeeded />;

  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}
