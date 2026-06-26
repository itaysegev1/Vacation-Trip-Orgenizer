import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MSG_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Demo mode (VITE_DEMO=true): run the whole app on in-memory sample data,
// no backend — handy for previewing before Firebase is configured.
export const isDemo = import.meta.env.VITE_DEMO === 'true';

// True only when the essential keys are present — lets the app render a
// friendly "setup needed" screen instead of crashing before you add .env.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Offline persistence: cache reads/writes in IndexedDB so the itinerary is
  // readable and expenses are loggable with no connection (subways/planes),
  // syncing automatically on reconnect. Multi-tab safe.
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    console.warn('Firestore persistent cache unavailable, using default:', e?.message);
    db = getFirestore(app);
  }

  // Optional Firebase Analytics — only if a measurementId is provided and the
  // environment supports it. Loaded lazily so it stays out of the main bundle.
  if (firebaseConfig.measurementId) {
    import('firebase/analytics')
      .then(({ getAnalytics, isSupported }) =>
        isSupported().then((ok) => {
          if (ok) getAnalytics(app);
        })
      )
      .catch(() => {});
  }
}

export { app, auth, db };
