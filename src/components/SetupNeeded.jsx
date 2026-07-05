import PetalField from './PetalField';
import { BRANDING, TRAVELLERS, EFFECTS } from '../lib/tripConfig';

// Traveller names come from the config — a re-skinned trip shows its own people.
const names = TRAVELLERS.map((t) => t.name).join(' ו');

const STEPS = [
  'היכנסו ל־Firebase Console וצרו פרויקט חדש (חינמי).',
  'Project settings → Your apps → הוסיפו Web app, והעתיקו את ערכי ה־config לקובץ .env שבתיקיית הפרויקט.',
  `Authentication → Sign-in method → הפעילו Email/Password, והוסיפו ${TRAVELLERS.length} משתמשים (${names}).`,
  'Firestore Database → Create database (production mode).',
  'הוסיפו את כתובות האימייל ל־VITE_ALLOWED_EMAILS בקובץ .env, הריצו npm run generate-rules ופרסמו עם firebase deploy (לעולם לא לערוך את firestore.rules ידנית).',
  'הריצו מחדש: npm run dev — ומסך ההתחברות יופיע.',
];

export default function SetupNeeded() {
  return (
    <div className="relative grid min-h-dvh place-items-center px-6 py-10">
      <PetalField count={EFFECTS.petalCount.auth} />
      <div className="relative z-10 w-full max-w-md rounded-[2rem] bg-white/85 p-7 shadow-2xl backdrop-blur">
        <div className="text-center text-5xl">{BRANDING.logoEmoji}</div>
        <h1 className="mt-2 text-center font-display text-2xl text-rose-deep">כמעט מוכן!</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">
          צריך לחבר את Firebase כדי שהאפליקציה תסתנכרן בין הטלפונים. זה לוקח כ־5 דקות וחינמי לגמרי.
        </p>
        <ol className="mt-5 space-y-3">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sakura text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-ink">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-2xl bg-petal px-4 py-3 text-center text-xs text-rose-deep">
          המדריך המלא נמצא בקובץ <b>README.md</b> שבתיקיית הפרויקט 💕
        </p>
      </div>
    </div>
  );
}
