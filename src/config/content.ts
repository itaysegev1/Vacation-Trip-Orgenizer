/* ============================================================================
 *  content.ts — centralized white-label / i18n copy.
 * ----------------------------------------------------------------------------
 *  Every user-facing string for the localized surfaces lives here. Templates
 *  use {token} placeholders filled by fmt() at render time. Swap this module
 *  (or branch it by locale) to re-language or re-title the whole app without
 *  touching component code.
 *
 *  Wired so far: common, countdown, dashboard, login, nav. (Other pages keep
 *  their copy inline until their own content pass.)
 * ========================================================================== */

export const content = {
  common: {
    daysUnit: 'ימים',
    save: 'שמירה 💾',
    delete: 'מחיקה 🗑️',
    close: 'סגירה',
    add: 'הוספה +',
    confirmDelete: 'למחוק?',
    cancel: 'ביטול',
    logout: 'התנתקות',
    logoutTitle: 'להתנתק?',
    logoutMessage: 'תצטרכו להתחבר שוב בפעם הבאה',
  },

  countdown: {
    chipUpcoming: 'עוד {days} {unit}',
    activeChip: '💕 בירח הדבש',
  },

  dashboard: {
    heroGreeting: 'שלום {name} {emoji} 💕',
    // {destination} = first destination's name (e.g. "הספירה לאחור ליפן בעיצומה").
    preTripHero: { emoji: '🌸', textTemplate: 'הספירה לאחור ל{destination} בעיצומה', sub: 'עוד מעט בדרך!' },
    postTripHero: { emoji: '💕', text: 'חזרתם הביתה', sub: 'איזה ירח דבש!' },
    budgetCard: { title: '💰 תקציב', spent: 'הוצא:', of: 'מתוך' },
    nextTaskCard: { title: '📌 המשימה הבאה', none: 'אין משימות פתוחות — כל הכבוד! 🎉' },
    walletShortcut: { title: '🎫 ארנק הכרטיסים', subtitle: 'טיסות, שינקנסן ומלונות — במקום אחד' },
    stats: [
      { id: 'ideas', to: '/ideas', emoji: '💡', label: 'רעיונות מאושרים', tint: '#d6738a' },
      { id: 'days', to: '/itinerary', emoji: '🗓️', label: 'ימים מתוכננים', tint: '#7fb8ae' },
      { id: 'tasks', to: '/tasks', emoji: '✅', label: 'משימות הושלמו', tint: '#d4af7a' },
      { id: 'packing', to: '/tasks', emoji: '🧳', label: 'פריטים נארזו', tint: '#d6738a' },
    ],
  },

  login: {
    subtitle: 'יפן · תאילנד · אפריל 2027',
    coupleSeparator: ' ♡ ',
    emailLabel: 'אימייל',
    passwordLabel: 'סיסמה',
    button: 'כניסה 💕',
    registerButton: 'יצירת חשבון 💕',
    busy: 'מתחבר…',
    registerBusy: 'נרשמים…',
    toggleToRegister: 'אין לכם חשבון? הרשמה',
    toggleToLogin: 'כבר רשומים? התחברות',
    errorFallback: 'משהו השתבש, נסו שוב',
    errors: {
      'auth/invalid-email': 'כתובת אימייל לא תקינה',
      'auth/invalid-credential': 'אימייל או סיסמה שגויים',
      'auth/wrong-password': 'סיסמה שגויה',
      'auth/user-not-found': 'משתמש לא נמצא',
      'auth/missing-password': 'נא להזין סיסמה',
      'auth/email-already-in-use': 'האימייל כבר רשום — אפשר להתחבר',
      'auth/weak-password': 'הסיסמה חלשה מדי (לפחות 6 תווים)',
      'auth/too-many-requests': 'יותר מדי ניסיונות — נסו שוב בעוד רגע',
      'auth/network-request-failed': 'אין חיבור לאינטרנט',
    },
  },

  unauthorized: {
    emoji: '🔒',
    title: 'אין הרשאה',
    message: 'התחברת בהצלחה, אך אין לך הרשאה לגשת לנתוני הטיול הזה. פנה למנהל האפליקציה.',
    signOut: 'התנתקות',
  },

  // Ideas page — proximity sort.
  ideas: {
    proximityLabel: '📍 לפי קרבה',
    proximityHint: 'בחרו מדינה אחת כדי למיין לפי קרבה',
  },

  // Apps page — the generic (non-destination) tabs. Per-destination tabs derive
  // from the configured destinations; these two buckets are destination-agnostic.
  apps: {
    allTab: { label: 'הכל', emoji: '✨' },
    generalTab: { label: 'כללי', emoji: '🌐' },
  },

  // In-app reminder banner (no push). {count}/{amount} filled by fmt().
  nudges: {
    overdue: '{count} משימות באיחור ⏰',
    dueSoon: '{count} משימות מתקרבות 📌',
    overBudget: 'חריגה מהתקציב — {amount} מעל היעד ⚠️',
    nearBudget: 'מתקרבים לתקרת התקציב 📈',
    dismiss: 'הבנתי',
  },

  // Bottom/side navigation labels (icons resolve from the route, not here).
  nav: [
    { to: '/', label: 'בית', fullLabel: 'בית', end: true },
    { to: '/ideas', label: 'רעיונות', fullLabel: 'בנק רעיונות' },
    { to: '/itinerary', label: 'לו״ז', fullLabel: 'לוח זמנים' },
    { to: '/budget', label: 'תקציב', fullLabel: 'תקציב' },
    { to: '/tasks', label: 'משימות', fullLabel: 'משימות ואריזה' },
    { to: '/wallet', label: 'ארנק', fullLabel: 'ארנק כרטיסים' },
    { to: '/documents', label: 'מסמכים', fullLabel: 'מסמכים ומידע' },
    { to: '/apps', label: 'אפליקציות', fullLabel: 'אפליקציות' },
  ],
};

// Fill {token} placeholders: fmt('עוד {days} {unit}', { days: 3, unit: 'ימים' }).
export const fmt = (template, vars = {}) =>
  String(template ?? '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));

export default content;
