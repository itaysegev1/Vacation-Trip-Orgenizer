import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth, isDemo } from '../lib/firebase';
import config from '../config/tripConfig';

const DEMO_USER = { email: config.infra.demoUserEmail };

const AuthContext = createContext(null);

// Map a login email to a configured traveller (by matchEmails substrings),
// falling back to a guest profile. Drives createdBy / paidBy / assignee.
function profileFromUser(user) {
  if (!user) return null;
  const email = (user.email || '').toLowerCase();
  const match = config.travellers.find((t) =>
    (t.matchEmails || []).some((m) => email.includes(String(m).toLowerCase()))
  );
  if (match) return { id: match.id, label: match.name, emoji: match.emoji, email };
  // Fallback: use the part before @
  const guess = email.split('@')[0] || config.guest.label;
  return { id: guess, label: guess, emoji: config.guest.emoji, email };
}

// Authorization "bouncer": a successfully-authenticated user may only enter if
// their email is in the EXACT allow-list (infra.allowedEmails) — mirroring
// firestore.rules, the real data guard. We deliberately do NOT widen this with
// traveller matchEmails: those are loose substrings (e.g. 'itay') used only for
// cosmetic profile resolution; a substring gate would authorize 'itay@evil.com'.
// To grant a new traveller access, add their full email to infra.allowedEmails.
function isEmailAllowed(user) {
  if (!user) return false;
  const email = (user.email || '').toLowerCase();
  return (config.infra.allowedEmails || []).some((e) => String(e).toLowerCase() === email);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(isDemo ? DEMO_USER : null);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo || !auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    if (isDemo) return setUser(DEMO_USER);
    await setPersistence(auth, browserLocalPersistence);
    return signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const register = async (email, password) => {
    if (isDemo) return setUser(DEMO_USER);
    await setPersistence(auth, browserLocalPersistence);
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    // firestore.rules requires email_verified — kick off the verification mail
    // right away (fire-and-forget; the VerifyEmail screen offers a resend).
    sendEmailVerification(cred.user).catch(console.error);
    return cred;
  };

  const logout = () => {
    if (isDemo) return undefined; // no-op in preview
    return signOut(auth);
  };

  const resendVerification = () => {
    if (isDemo || !auth?.currentUser) return Promise.resolve();
    return sendEmailVerification(auth.currentUser);
  };

  // Re-read the user after the emailed link was clicked — onAuthStateChanged
  // does NOT fire on reload(), so push a fresh clone into state ourselves.
  const refreshUser = async () => {
    if (isDemo || !auth?.currentUser) return false;
    await auth.currentUser.reload();
    const u = auth.currentUser;
    setUser(Object.assign(Object.create(Object.getPrototypeOf(u)), u));
    return u.emailVerified === true;
  };

  const value = {
    user,
    profile: profileFromUser(user),
    authorized: isDemo || isEmailAllowed(user),
    // Mirrors the email_verified requirement in firestore.rules: an unverified
    // session would only see permission-denied errors, so gate it in the UI too.
    verified: isDemo || user?.emailVerified === true,
    loading,
    login,
    register,
    logout,
    resendVerification,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
