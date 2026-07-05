/* ============================================================================
 *  tripConfig.ts — THE SINGLE SOURCE OF TRUTH (white-label "Travel/Event" template)
 * ----------------------------------------------------------------------------
 *  Everything that makes this app "Itay & Eitan's 2027 Japan→Thailand honeymoon"
 *  lives here. Swap this file (or its values) and the same code base becomes a
 *  different trip / event for different people.
 *
 *  Nothing in here is logic — it is pure data + types. Derived values (Date
 *  objects, the day list, which destination a date falls in, CSS variables,
 *  etc.) are computed in src/lib/tripConfig.js from THIS config.
 *
 *  Dates are stored as local "YYYY-MM-DD" strings (never Date objects) to avoid
 *  the UTC day-shift bug in +offset timezones. The derived layer turns them into
 *  Date objects with `new Date(`${s}T00:00:00`)`.
 * ========================================================================== */

import content from './content';

/* ----------------------------------- Types -------------------------------- */

export type ID = string;
export type DateStr = string; // "YYYY-MM-DD" (local)
export type Hex = string;

export interface Person {
  id: ID;
  name: string;
  emoji: string;
  /** Login-email substrings that resolve a Firebase user to this person. */
  matchEmails?: string[];
  role?: string;
}

export interface Milestone {
  id: ID;
  emoji: string;
  label: string;
  date: DateStr;
  /** Shown when the milestone has passed (e.g. "Just Married!"). */
  doneMessage: string;
  /** Render this card in the dashboard dual-countdown widget. */
  showInCountdown?: boolean;
  /** If set, the milestone only exists when mode[gatedBy] is true. */
  gatedBy?: keyof TripConfig['mode'];
}

export interface DestinationTheme {
  emoji: string;
  accent: Hex;        // soft accent — the itinerary bullet (e.g. sakura-deep / teal)
  accentStrong: Hex;  // strong accent — titles, day-strip active, primary button
  chip: string;       // filter/leg-tab/schedule-button accent (CSS var; follows palette)
  soft: Hex;          // tint background
  ring: string;       // focus ring rgba()
  gradient: string;   // CSS gradient for banners
}

export interface PhraseEntry { he: string; local: string; rom: string; }
export interface PhoneEntry { label: string; value: string; }

export interface Destination {
  id: ID;
  name: string;
  flag: string;
  iso: string;             // ISO 3166-1 alpha-2
  currencyCode: ID;        // → currencies[].code
  accentToken?: string;    // legacy COUNTRIES.accent theme-token name
  /** Inclusive local-date range this leg covers. Day→destination is resolved
   *  by finding the destination whose [startDate,endDate] contains the day. */
  startDate: DateStr;
  endDate: DateStr;
  theme: DestinationTheme;
  /** Dashboard "current leg" hero copy while travelling in this destination. */
  legHero: { emoji: string; text: string; subTemplate: string };
  emergencyNumbers: PhoneEntry[];
  embassy?: PhoneEntry;
  phrasebookLang?: string;
  phrasebook?: PhraseEntry[];
}

export interface Currency {
  code: ID;
  symbol: string;
  label: string;
  flag: string;
  isBase?: boolean;
  fractionDigits: number;        // money display precision
  /** Which destination this foreign currency belongs to (null for base). */
  linkedDestinationId?: ID | null;
  /** Suggested tip fraction for the quick calculator (Japan = 0). */
  tipRate?: number;
  /** Decimals for the live exchange-rate ticker on the Budget page. */
  rateDigits?: number;
  /** Tip tooltip copy in the currency calculator (per-currency). */
  tipNote?: string;
}

export interface Category { id: ID; label: string; emoji?: string; color?: Hex; bg?: Hex; dotColor?: string; }
export interface IdeaStatus extends Category { countsAsApproved?: boolean; }
export interface Slot extends Category { dotColor: string; }

export interface DocFieldDef {
  key: string;
  label: string;
  type: 'date' | 'time' | 'text' | 'tel' | 'textarea' | 'number';
}
export interface DocType {
  id: ID;
  label: string;
  emoji: string;
  titleLabel: string;
  titlePlaceholder: string;
  /** Lives only in the Wallet (hidden from the Documents page). */
  walletOnly?: boolean;
  /** Rendered as one card per traveller (flights / trains / attractions). */
  perPassenger?: boolean;
  /** Present → the type appears in the Wallet: chooser button label (singular)
   *  and whether its section lays out as a two-column grid. */
  wallet?: { chooserLabel: string; twoCols: boolean };
  fields: DocFieldDef[];
}

export interface TripConfig {
  app: { name: string; version: string; storageKeyPrefix: string };
  mode: { isHoneymoon: boolean; features: Record<string, boolean> };
  locale: { language: string; direction: 'rtl' | 'ltr'; dateLocale: string };
  branding: {
    appName: string; shortName: string; tagline: string; description: string;
    documentTitle: string; // <title> + PWA manifest name
    logoEmoji: string; splashEmoji: string; themeColor: Hex; backgroundColor: Hex;
  };
  travellers: Person[];
  /** Pseudo-traveller for shared / everyone (id was 'both'). */
  sharedParty: Person;
  guest: { label: string; emoji: string };
  /** Where the travellers depart from / return to (drives base currency,
   *  embassy framing, route titles, origin placeholder). */
  milestones: Milestone[];
  /** Itinerary bounds + post-trip label. year is derived but kept for seeds. */
  trip: { year: number; startDate: DateStr; endDate: DateStr; activeLabel: string };
  destinations: Destination[];
  currencies: Currency[];
  budget: {
    baseCurrency: ID;
    defaultTotal: number;
    warnThreshold: number;        // 0.8 → amber at 80%
    settlementThreshold: number;  // ignore balances under this (₪)
    barColors: { over: Hex; warn: Hex; ok: Hex };
    exchangeRateApi: { urlTemplate: string; cacheKey: string; maxAgeMs: number };
    fallbackRates: Record<ID, number>; // foreign-per-1-base
    /** Shared current-rate doc (L2 cache: one client fetches, both read). */
    sharedRates: { docPath: string; enabled: boolean };
    /** Daily rate snapshots → FX history sparkline. */
    rateHistory: { collection: string; maxPoints: number; enabled: boolean };
    /** Client-side burn-rate / projection card. */
    analytics: { enabled: boolean };
    /** Optional atomic running-total doc (off by default; recompute is free at N≈2). */
    summaryDoc: { path: string; enabled: boolean };
  };
  taxonomies: {
    ideaCategories: Category[];
    ideaStatuses: IdeaStatus[];
    slots: Slot[];
    packingCategories: Category[];
    expenseCategories: Category[];
    taskTypes: Category[];
    appCategories: Category[];
    documentTypes: DocType[];
  };
  content: Record<string, any>;
  infra: {
    demoMode: boolean;
    demoUserEmail: string;
    collections: Record<string, string>;
    requiredBackendKeys: string[];
    firebaseEnvVarNames: Record<string, string>;
    offlinePersistence: boolean;
    analyticsEnabled: boolean;
    mapsUrlTemplate: string;
    /** Address → lat/lng geocoder (free, no-key Nominatim; client-side, fail-soft). */
    geocoder: {
      enabled: boolean;
      urlTemplate: string;   // {query} is URL-encoded
      countryCodes: string;  // bias, e.g. 'jp,th' (derived from destinations[].iso)
      minIntervalMs: number; // client rate-limit (Nominatim policy ≤1 req/sec)
      cachePrefix: string;   // localStorage memo of address→{lat,lng}
    };
    /** Firestore-rules access control (also written into firestore.rules). */
    allowedEmails: string[];
  };
  settings: {
    linkScheme: string;
    timings: {
      undoWindowMs: number;
      toastDurationMs: number;
      longPressDelayMs: number;
      longPressMoveTolerancePx: number;
      countdownCardTickMs: number;
      countdownChipTickMs: number;
      /** How often useToday() re-checks the local date (day rollover while the PWA stays alive). */
      todayRefreshMs: number;
    };
    haptics: { enabled: boolean };
    /** Walking-distance estimates for itinerary day optimization. */
    geo: { walkingSpeedKmh: number; nearbyRadiusKm: number; maxWalkLegKm: number };
    /** In-app (no-push) reminder thresholds. */
    nudges: { enabled: boolean; taskDueSoonDays: number };
  };
  theme: {
    colors: Record<string, Hex>;
    fonts: { sans: string; display: string };
    shadows: { soft: string; float: string; glow: string };
    background: string;
    ticket: {
      perforation: { teeth: number; minSize: number; maxSize: number };
      /** Per-card-type accent palette for the Wallet tickets. */
      accents: Record<string, { accent: Hex; soft: Hex; tint?: Hex }>;
    };
    fallbackAccentDestinationId: ID; // theme fallback (was hardcoded 'japan')
    neutralAccent: string;           // "all"/no-destination filter accent
    /** Decorative particle palettes/counts (falling petals, confetti bursts). */
    effects: {
      petalColors: Hex[];
      confettiColors: Hex[];
      petalCount: { app: number; auth: number };
    };
  };
  seed: {
    flights: { title: string; fields: Record<string, string> }[];
    apps: { name: string; country: ID; category: ID; link: string }[];
  };
}

/* --------------------------------- Config --------------------------------- */

export const tripConfig: TripConfig = {
  // 1 ── GLOBAL APP SETTINGS ────────────────────────────────────────────────
  app: {
    name: 'honeymoon-app',
    version: '3.0.2',
    storageKeyPrefix: 'honeymoon', // → rates cache key, install-dismiss key, etc.
  },
  mode: {
    isHoneymoon: true,   // ↳ enables wedding milestone, "Just Married", 💕 copy, couple tagline
    features: {
      ideas: true,
      itinerary: true,
      budget: true,
      tasks: true,
      wallet: true,
      documents: true,
      apps: true,
      petals: true,       // romantic falling-petal particles
      confetti: true,     // celebration micro-interactions
      currencyCalculator: true,
      homeFab: true,      // "take me home tonight" floating button
    },
  },
  locale: { language: 'he', direction: 'rtl', dateLocale: 'he-IL' },
  branding: {
    appName: 'ירח דבש',
    shortName: 'ירח דבש',
    tagline: 'יפן · תאילנד',
    description: 'אפליקציית ארגון ירח הדבש של איתי ואיתן — יפן ותאילנד',
    documentTitle: 'ירח דבש · יפן ותאילנד',
    logoEmoji: '🌸',
    splashEmoji: '🌸',
    themeColor: '#F4A6B8',
    backgroundColor: '#FFF8F6',
  },

  // 2 ── USERS & PERSONALIZATION ─────────────────────────────────────────────
  travellers: [
    { id: 'itay', name: 'איתי', emoji: '🦊', matchEmails: ['itay', 'איתי', 'itaysegev1234'] },
    { id: 'eitan', name: 'איתן', emoji: '🐼', matchEmails: ['eitan', 'eytan', 'איתן', 'eytan.nalimo'] },
  ],
  sharedParty: { id: 'both', name: 'שנינו', emoji: '💞' },
  guest: { label: 'אורח', emoji: '💕' },

  // 3 ── MILESTONES & DATES ──────────────────────────────────────────────────
  milestones: [
    { id: 'wedding', emoji: '💍', label: 'החתונה', date: '2027-03-30', doneMessage: 'התחתנו! 🎉', showInCountdown: true, gatedBy: 'isHoneymoon' },
    { id: 'takeoff', emoji: '✈️', label: 'הטיסה', date: '2027-04-06', doneMessage: 'ממריאים! 💕', showInCountdown: true },
    { id: 'return', emoji: '🏠', label: 'חזרה', date: '2027-05-12', doneMessage: 'חזרתם הביתה' },
  ],
  trip: {
    year: 2027,
    startDate: '2027-04-07', // first itinerary day (landing)
    endDate: '2027-05-12',   // last itinerary day (return)
    activeLabel: 'בירח הדבש', // CountdownChip text once all milestones passed
  },

  // 4 ── DESTINATIONS & ROUTING ──────────────────────────────────────────────
  destinations: [
    {
      id: 'japan',
      name: 'יפן',
      flag: '🇯🇵',
      iso: 'JP',
      currencyCode: 'JPY',
      accentToken: 'sakura',
      startDate: '2027-04-07',
      endDate: '2027-04-27', // day before the Thailand leg begins
      theme: {
        emoji: '🌸',
        accent: '#ec8fa6',
        accentStrong: '#b85574',
        chip: 'var(--color-sakura)',
        soft: '#ffe4ec',
        ring: 'rgba(244, 166, 184, 0.45)',
        gradient: 'linear-gradient(120deg, #ffd9e4 0%, #ffe7d4 100%)',
      },
      legHero: { emoji: '🇯🇵', text: 'אתם ביפן!', subTemplate: 'עד {nextDate}' },
      emergencyNumbers: [
        { label: 'משטרה', value: '110' },
        { label: 'אמבולנס/כיבוי', value: '119' },
      ],
      embassy: { label: 'שגרירות ישראל טוקיו', value: '+81332640911' },
      phrasebookLang: '🇯🇵 יפנית',
      phrasebook: [
        { he: 'שלום', local: 'こんにちは', rom: 'konnichiwa' },
        { he: 'תודה', local: 'ありがとう', rom: 'arigatō' },
        { he: 'סליחה / סליחה שאני מטריד', local: 'すみません', rom: 'sumimasen' },
        { he: 'כן / לא', local: 'はい / いいえ', rom: 'hai / iie' },
        { he: 'כמה זה עולה?', local: 'いくらですか', rom: 'ikura desu ka' },
        { he: 'איפה השירותים?', local: 'トイレはどこですか', rom: 'toire wa doko desu ka' },
        { he: 'טעים!', local: 'おいしい', rom: 'oishii' },
        { he: 'הצילו!', local: '助けて', rom: 'tasukete' },
      ],
    },
    {
      id: 'thailand',
      name: 'תאילנד',
      flag: '🇹🇭',
      iso: 'TH',
      currencyCode: 'THB',
      accentToken: 'jade',
      startDate: '2027-04-28',
      endDate: '2027-05-12',
      theme: {
        emoji: '🌴',
        accent: '#2fa395',
        accentStrong: '#1f7a6f',
        chip: 'var(--color-teal)',
        soft: '#d6ece8',
        ring: 'rgba(47, 163, 149, 0.40)',
        gradient: 'linear-gradient(120deg, #c9ece6 0%, #f1e6c9 100%)',
      },
      legHero: { emoji: '🇹🇭', text: 'אתם בתאילנד!', subTemplate: 'חזרה ב־{returnDate}' },
      emergencyNumbers: [
        { label: 'משטרה', value: '191' },
        { label: 'אמבולנס', value: '1669' },
        { label: 'משטרת תיירים', value: '1155' },
      ],
      embassy: { label: 'שגרירות ישראל בנגקוק', value: '+6622049200' },
      phrasebookLang: '🇹🇭 תאית',
      phrasebook: [
        { he: 'שלום', local: 'สวัสดี', rom: 'sawatdee' },
        { he: 'תודה', local: 'ขอบคุณ', rom: 'khop khun' },
        { he: 'סליחה', local: 'ขอโทษ', rom: 'kho thot' },
        { he: 'כן / לא', local: 'ใช่ / ไม่', rom: 'chai / mai' },
        { he: 'כמה זה עולה?', local: 'เท่าไหร่', rom: 'thao rai' },
        { he: 'איפה השירותים?', local: 'ห้องน้ำอยู่ที่ไหน', rom: 'hong nam yu thi nai' },
        { he: 'טעים!', local: 'อร่อย', rom: 'aroi' },
        { he: 'הצילו!', local: 'ช่วยด้วย', rom: 'chuay duay' },
      ],
    },
  ],

  // 5 ── CURRENCIES & BUDGET ─────────────────────────────────────────────────
  currencies: [
    { code: 'ILS', symbol: '₪', label: 'שקל', flag: '🇮🇱', isBase: true, fractionDigits: 0, linkedDestinationId: null, tipRate: 0.1 },
    { code: 'JPY', symbol: '¥', label: 'ין יפני', flag: '🇯🇵', fractionDigits: 0, linkedDestinationId: 'japan', tipRate: 0 /* no tipping in Japan */, rateDigits: 0, tipNote: '🇯🇵 אין נהוג לתת טיפ ביפן! 🙅' },
    { code: 'THB', symbol: '฿', label: 'באט תאילנדי', flag: '🇹🇭', fractionDigits: 2, linkedDestinationId: 'thailand', tipRate: 0.1, rateDigits: 1, tipNote: '🇹🇭 טיפ מקובל ~10%' },
  ],
  budget: {
    baseCurrency: 'ILS',
    defaultTotal: 40000,
    warnThreshold: 0.8,
    settlementThreshold: 1,
    barColors: { over: '#b85574', warn: '#d4af7a', ok: '#7fb8ae' },
    exchangeRateApi: {
      urlTemplate: 'https://open.er-api.com/v6/latest/{base}',
      cacheKey: 'honeymoon_rates_v1',
      maxAgeMs: 12 * 60 * 60 * 1000,
    },
    fallbackRates: { JPY: 53.9, THB: 11.1 }, // foreign units per 1 base (ILS)
    // Shared current-rate doc: first client past the TTL fetches & writes it,
    // both phones read the same value (fewer external calls, consistent rates).
    sharedRates: { docPath: 'meta/rates', enabled: true },
    // Daily snapshots (doc id = UTC date) → the FX history sparkline on Budget.
    rateHistory: { collection: 'rateHistory', maxPoints: 60, enabled: true },
    // Client-side burn-rate / projection card.
    analytics: { enabled: true },
    // Optional atomic running-total doc — OFF by default (recompute is free at N≈2).
    summaryDoc: { path: 'summary/budget', enabled: false },
  },

  // ── TAXONOMIES & SEED-DRIVEN LISTS ────────────────────────────────────────
  taxonomies: {
    ideaCategories: [
      { id: 'food', label: 'אוכל', emoji: '🍜' },
      { id: 'sightseeing', label: 'אטרקציות', emoji: '🏯' },
      { id: 'nature', label: 'טבע', emoji: '🌸' },
      { id: 'culture', label: 'תרבות', emoji: '⛩️' },
      { id: 'activity', label: 'פעילות', emoji: '🎎' },
      { id: 'shopping', label: 'קניות', emoji: '🛍️' },
      { id: 'nightlife', label: 'חיי לילה', emoji: '🌃' },
    ],
    // `color` is a THEME-TOKEN NAME (consumed as var(--color-${color}) for the
    // status dot); `bg` is the badge background hex.
    ideaStatuses: [
      { id: 'idea', label: 'רעיון', color: 'ink-soft', bg: '#f1e6ea' },
      { id: 'maybe', label: 'אולי', color: 'gold', bg: '#f6ecd9' },
      { id: 'approved', label: 'מאושר', color: 'jade', bg: '#d6ece8', countsAsApproved: true },
      { id: 'booked', label: 'הוזמן', color: 'rose', bg: '#fbdce4', countsAsApproved: true },
      { id: 'rejected', label: 'נפסל', color: 'ink-soft', bg: '#eee2e4' },
    ],
    slots: [
      { id: 'morning', label: 'בוקר', emoji: '🌅', dotColor: 'var(--color-gold)' },
      { id: 'afternoon', label: 'צהריים', emoji: '☀️', dotColor: 'var(--color-sakura)' },
      { id: 'evening', label: 'ערב', emoji: '🌙', dotColor: 'var(--color-jade)' },
    ],
    packingCategories: [
      { id: 'clothes', label: 'בגדים', emoji: '👕' },
      { id: 'electronics', label: 'אלקטרוניקה', emoji: '🔌' },
      { id: 'documents', label: 'מסמכים', emoji: '📄' },
      { id: 'toiletries', label: 'טיפוח', emoji: '🧴' },
      { id: 'other', label: 'שונות', emoji: '🎒' },
    ],
    expenseCategories: [
      { id: 'food', label: 'אוכל', emoji: '🍜', color: '#F4A6B8' },
      { id: 'transport', label: 'תחבורה', emoji: '🚄', color: '#7FB8AE' },
      { id: 'lodging', label: 'לינה', emoji: '🏨', color: '#D6738A' },
      { id: 'activities', label: 'פעילויות', emoji: '🎟️', color: '#D4AF7A' },
      { id: 'shopping', label: 'קניות', emoji: '🛍️', color: '#EC9CB0' },
      { id: 'other', label: 'שונות', emoji: '✨', color: '#C9A0C9' },
    ],
    taskTypes: [
      { id: 'task', label: '✅ משימות' },
      { id: 'packing', label: '🧳 אריזה' },
    ],
    appCategories: [
      { id: 'taxi', label: 'מוניות', emoji: '🚕' },
      { id: 'dining', label: 'הזמנת מסעדות', emoji: '🍽️' },
      { id: 'transit', label: 'תחבורה ציבורית', emoji: '🚆' },
      { id: 'translation', label: 'תרגום', emoji: '🗣️' },
      { id: 'navigation', label: 'ניווט', emoji: '🗺️' },
      { id: 'hotels', label: 'מלונות', emoji: '🏨' },
      { id: 'attractions', label: 'אטרקציות', emoji: '🎡' },
      { id: 'general', label: 'כללי', emoji: '📌' },
    ],
    documentTypes: [
      {
        id: 'flight', label: 'טיסות', emoji: '✈️', titleLabel: 'מסלול', titlePlaceholder: 'ישראל → יפן', perPassenger: true,
        wallet: { chooserLabel: 'טיסה', twoCols: false },
        fields: [
          { key: 'date', label: 'תאריך המראה', type: 'date' },
          { key: 'time', label: 'שעת המראה', type: 'time' },
          { key: 'arrivalDate', label: 'תאריך נחיתה', type: 'date' },
          { key: 'arrivalTime', label: 'שעת נחיתה', type: 'time' },
          { key: 'flightNo', label: 'מס׳ טיסה', type: 'text' },
          { key: 'seat', label: 'מושב', type: 'text' },
          { key: 'baggageKg', label: 'משקל מזוודה מותר (ק"ג)', type: 'text' },
          { key: 'confirmation', label: 'אסמכתא', type: 'text' },
          { key: 'notes', label: 'הערות', type: 'textarea' },
        ],
      },
      {
        id: 'train', label: 'רכבות', emoji: '🚄', titleLabel: 'מסלול', titlePlaceholder: 'טוקיו → קיוטו', perPassenger: true,
        wallet: { chooserLabel: 'רכבת', twoCols: false },
        fields: [
          { key: 'date', label: 'תאריך', type: 'date' },
          { key: 'time', label: 'שעה', type: 'time' },
          { key: 'trainNo', label: 'רכבת / שינקנסן', type: 'text' },
          { key: 'car', label: 'קרון', type: 'text' },
          { key: 'seat', label: 'מושב', type: 'text' },
          { key: 'confirmation', label: 'אסמכתא', type: 'text' },
          { key: 'notes', label: 'הערות', type: 'textarea' },
        ],
      },
      {
        id: 'attraction', label: 'אטרקציות', emoji: '🎟️', titleLabel: 'שם האטרקציה', titlePlaceholder: 'דיסנילנד טוקיו', walletOnly: true, perPassenger: true,
        wallet: { chooserLabel: 'אטרקציה', twoCols: true },
        fields: [
          { key: 'date', label: 'תאריך', type: 'date' },
          { key: 'time', label: 'שעת כניסה', type: 'time' },
          { key: 'address', label: 'כתובת', type: 'text' },
          { key: 'addressLocal', label: 'כתובת בשפה המקומית', type: 'textarea' },
          { key: 'confirmation', label: 'מס׳ הזמנה', type: 'text' },
          { key: 'notes', label: 'הערות', type: 'textarea' },
        ],
      },
      {
        id: 'restaurant', label: 'מסעדות', emoji: '🍽️', titleLabel: 'שם המסעדה', titlePlaceholder: 'אומאקאסה סושי', walletOnly: true,
        wallet: { chooserLabel: 'מסעדה', twoCols: true },
        fields: [
          { key: 'date', label: 'תאריך', type: 'date' },
          { key: 'time', label: 'שעת הזמנה', type: 'time' },
          { key: 'partySize', label: 'מספר סועדים', type: 'text' },
          { key: 'address', label: 'כתובת', type: 'text' },
          { key: 'addressLocal', label: 'כתובת בשפה המקומית', type: 'textarea' },
          { key: 'confirmation', label: 'מס׳ הזמנה', type: 'text' },
          { key: 'notes', label: 'הערות', type: 'textarea' },
        ],
      },
      {
        id: 'accommodation', label: 'לינה', emoji: '🏨', titleLabel: 'שם המקום', titlePlaceholder: 'מלון בקיוטו',
        wallet: { chooserLabel: 'מלון', twoCols: true },
        fields: [
          { key: 'address', label: 'כתובת', type: 'text' },
          { key: 'addressLocal', label: 'כתובת בשפה המקומית (להראות לנהג מונית)', type: 'textarea' },
          { key: 'checkIn', label: 'צ׳ק-אין', type: 'date' },
          { key: 'checkOut', label: 'צ׳ק-אאוט', type: 'date' },
          { key: 'confirmation', label: 'אסמכתא', type: 'text' },
          { key: 'phone', label: 'טלפון', type: 'tel' },
          { key: 'notes', label: 'הערות', type: 'textarea' },
        ],
      },
      {
        id: 'contact', label: 'אנשי קשר', emoji: '📇', titleLabel: 'שם', titlePlaceholder: 'נציג ביטוח / מדריך',
        fields: [
          { key: 'phone', label: 'טלפון', type: 'tel' },
          { key: 'notes', label: 'פרטים', type: 'textarea' },
        ],
      },
      {
        id: 'info', label: 'מידע כללי', emoji: '📝', titleLabel: 'נושא', titlePlaceholder: 'ויזה / חיסונים / סים',
        fields: [{ key: 'notes', label: 'תוכן', type: 'textarea' }],
      },
    ],
  },

  // ── USER-FACING COPY (i18n) — see src/config/content.ts ───────────────────
  content,

  // ── INFRASTRUCTURE / BACKEND ──────────────────────────────────────────────
  infra: {
    demoMode: false, // overridden by VITE_DEMO=true at runtime
    demoUserEmail: 'itay@demo.app',
    collections: {
      expenses: 'expenses',
      ideas: 'ideas',
      itinerary: 'itinerary',
      tasks: 'tasks',
      documents: 'documents',
      apps: 'useful_apps',
      settingsConfig: 'settings/config',
      settingsDayNames: 'settings/dayNames',
      ratesMeta: 'meta/rates',         // shared current FX rate (L2)
      rateHistory: 'rateHistory',      // daily FX snapshots (history graph)
      summaryBudget: 'summary/budget', // optional atomic running total (#8, off)
    },
    // ⚠️ DOCUMENTATION-ONLY (not wired): Vite replaces import.meta.env.* statically,
    // so src/lib/firebase.js must reference the env vars literally. These fields
    // document that wiring; editing them changes nothing at runtime.
    requiredBackendKeys: ['apiKey', 'projectId', 'appId'],
    firebaseEnvVarNames: {
      apiKey: 'VITE_FIREBASE_API_KEY',
      authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
      projectId: 'VITE_FIREBASE_PROJECT_ID',
      storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
      messagingSenderId: 'VITE_FIREBASE_MSG_SENDER_ID',
      appId: 'VITE_FIREBASE_APP_ID',
      measurementId: 'VITE_FIREBASE_MEASUREMENT_ID',
    },
    offlinePersistence: true, // documentation-only — firebase.js enables it unconditionally
    analyticsEnabled: true, // documentation-only — analytics inits iff measurementId present
    mapsUrlTemplate: 'https://www.google.com/maps/search/?api=1&query={query}',
    // Address → lat/lng geocoder. Free, no API key (Nominatim/OpenStreetMap),
    // called client-side ONLY on explicit save, rate-limited, and fail-soft.
    // countryCodes:'' → auto-derived from destinations[].iso in the derived layer.
    geocoder: {
      enabled: true,
      urlTemplate: 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q={query}',
      countryCodes: '',
      minIntervalMs: 1100,
      cachePrefix: 'honeymoon_geo_v1',
    },
    // Access allow-list — sourced from VITE_ALLOWED_EMAILS in .env (comma-separated)
    // so real addresses stay OUT of the (public) repo. Feeds the auth bouncer; the
    // same env var generates firestore.rules. The `import.meta.env &&` guard keeps it
    // safe in Node contexts (e.g. vite.config import) where import.meta.env is absent.
    allowedEmails: ((import.meta.env && import.meta.env.VITE_ALLOWED_EMAILS) || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean),
  },

  // ── INTERACTION / TIMING SETTINGS ─────────────────────────────────────────
  settings: {
    linkScheme: 'https://',
    timings: {
      undoWindowMs: 5000,
      toastDurationMs: 2800,
      longPressDelayMs: 500,
      longPressMoveTolerancePx: 10,
      countdownCardTickMs: 1000,
      countdownChipTickMs: 60000,
      todayRefreshMs: 60000,
    },
    haptics: { enabled: true },
    // Walking-distance estimates for itinerary day optimization (#7).
    // maxWalkLegKm: legs longer than this are treated as transit, not walking
    // (so an airport→city hop isn't shown as a multi-hour "walk").
    geo: { walkingSpeedKmh: 4.5, nearbyRadiusKm: 2, maxWalkLegKm: 4 },
    // In-app (no-push) reminders (#9): tasks due within N days flagged "soon".
    nudges: { enabled: true, taskDueSoonDays: 3 },
  },

  // ── THEME (injected as CSS custom properties at boot) ─────────────────────
  theme: {
    colors: {
      cream: '#fff8f6', petal: '#ffe4ec', blush: '#fcd3de',
      sakura: '#f4a6b8', sakuraDeep: '#ec8fa6', rose: '#d6738a', roseDeep: '#b85574',
      gold: '#d4af7a', goldSoft: '#ecd9bd', jade: '#7fb8ae', jadeSoft: '#d6ece8',
      teal: '#2fa395', tealDeep: '#1f7a6f', ink: '#3d2b2f', inkSoft: '#7a626a', line: '#f0dde2',
      surface: '#ffffff', filterInactive: '#f6eef0',
    },
    fonts: { sans: '"Heebo", ui-sans-serif, system-ui, sans-serif', display: '"Frank Ruhl Libre", Georgia, serif' },
    shadows: {
      soft: '0 8px 30px rgba(61, 43, 47, 0.06)',
      float: '0 14px 40px rgba(61, 43, 47, 0.12)',
      glow: '0 0 24px -4px rgba(244, 166, 184, 0.55)',
    },
    background:
      'radial-gradient(1200px 600px at 80% -10%, #ffe9f0 0%, transparent 55%), radial-gradient(900px 500px at -10% 10%, #fff1e6 0%, transparent 50%), var(--color-cream)',
    ticket: {
      perforation: { teeth: 34, minSize: 1, maxSize: 4 },
      accents: {
        flight: { accent: '#b85574', soft: '#f4a6b8' },
        train: { accent: '#1f7a6f', soft: '#2fa395' },
        attraction: { accent: '#3a8f84', soft: '#7fb8ae', tint: '#eaf5f2' },
        restaurant: { accent: '#c79a4e', soft: '#d4af7a', tint: '#faf3e3' },
        hotel: { accent: '#b8860b', soft: '#d4af7a' },
      },
    },
    fallbackAccentDestinationId: 'japan',
    neutralAccent: 'var(--color-rose-deep)',
    effects: {
      petalColors: ['#f4a6b8', '#fcd3de', '#ffe4ec', '#ec8fa6', '#f8c7d4'],
      confettiColors: ['#f4a6b8', '#d6738a', '#d4af7a', '#7fb8ae', '#ffe4ec'],
      petalCount: { app: 12, auth: 18 },
    },
  },

  // ── SEED / SAMPLE DATA (one-tap seeds; demo dataset lives in demoStore) ────
  seed: {
    flights: [
      { title: '🇮🇱 ישראל → יפן 🇯🇵', fields: { date: '2027-04-06', notes: 'המראה 6.4, נחיתה 7.4' } },
      { title: '🇯🇵 יפן → תאילנד 🇹🇭', fields: { date: '2027-04-28', notes: '' } },
      { title: '🇹🇭 תאילנד → ישראל 🇮🇱', fields: { date: '2027-05-12', notes: 'טיסת חזרה' } },
    ],
    apps: [
      { name: 'GO (מוניות)', country: 'japan', category: 'taxi', link: 'https://go.goinc.jp/' },
      { name: 'Japan Travel — NAVITIME', country: 'japan', category: 'transit', link: 'https://japantravel.navitime.com/' },
      { name: 'Tabelog', country: 'japan', category: 'dining', link: 'https://tabelog.com/' },
      { name: 'Grab', country: 'thailand', category: 'taxi', link: 'https://www.grab.com/th/' },
      { name: 'Bolt', country: 'thailand', category: 'taxi', link: 'https://bolt.eu/' },
      { name: 'ViaBus', country: 'thailand', category: 'transit', link: 'https://www.viabus.co/' },
      { name: 'Google Maps', country: 'general', category: 'navigation', link: 'https://maps.google.com/' },
      { name: 'Google Translate', country: 'general', category: 'translation', link: 'https://translate.google.com/' },
    ],
  },
};

export default tripConfig;
