// In-memory reactive store used ONLY when VITE_DEMO=true.
// Mirrors the slice of Firestore the app uses (collections + a couple of single
// docs) so the whole UI works with sample data and no backend.
//
// All structural values — dates, traveller ids, seat-field keys, currency
// codes, destination ids and the budget — are DERIVED from src/config/tripConfig
// so the demo follows the configured trip (change the config and the sample data
// follows). Only descriptive sample text/amounts stay literal.
import config from '../config/tripConfig';
import { ymd, TRAVELLERS, SHARED, seatKey } from './tripConfig';

// ── Config-derived seed primitives ──────────────────────────────────────────
const DESTS = config.destinations;
const D0 = DESTS[0]; // first leg (e.g. Japan)
const D1 = DESTS[1] || DESTS[0]; // second leg (e.g. Thailand)
const TRIP_END = config.trip.endDate;
const milestone = (id) => config.milestones.find((m) => m.id === id)?.date;
const TAKEOFF = milestone('takeoff') || D0.startDate;
const WEDDING = milestone('wedding') || TAKEOFF;

const addDays = (s, n) => {
  const d = new Date(`${s}T00:00:00`);
  d.setDate(d.getDate() + n);
  return ymd(d);
};

// Travellers (fallbacks keep it safe for any roster size)
const A = TRAVELLERS[0]?.id || SHARED.id; // primary traveller
const B = TRAVELLERS[1]?.id || A; // second traveller
const SH = SHARED.id; // shared / both
const seatA = seatKey(A);
const seatB = seatKey(B);

// Currencies (foreign codes + base-currency conversion via fallback rates)
const FOREIGN = config.currencies.filter((c) => !c.isBase).map((c) => c.code);
const FX0 = FOREIGN[0] || config.budget.baseCurrency; // primary foreign (JPY)
const FX1 = FOREIGN[1] || FX0; // second foreign (THB)
const rateOf = (code) => config.budget.fallbackRates[code] || 1;
const toBase = (amount, code) => Math.round(amount / rateOf(code)); // → amount in base currency

// Destination ids (for ideas / apps tagging)
const cA = D0.id; // first destination id (japan)
const cB = D1.id; // second destination id (thailand)

let seq = 1000;
const nextSeq = () => ++seq;
let idc = 1;
const genId = () => `demo${idc++}`;
const stamp = (arr) => arr.map((d) => ({ id: genId(), createdAt: { seconds: nextSeq() }, ...d }));

const collections = {
  ideas: stamp([
    { name: 'מקדש פושימי אינארי', country: cA, city: 'קיוטו', address: '68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto', category: 'culture', status: 'approved', link: 'https://maps.google.com', notes: 'אלפי שערי טורי אדומים — ללכת מוקדם בבוקר', createdBy: B },
    { name: 'אומאקאסה סושי', country: cA, city: 'טוקיו', category: 'food', status: 'booked', link: '', notes: 'הזמנו ל-19:00', createdBy: A },
    { name: 'הר פוג׳י — קוואגוצ׳יקו', country: cA, city: 'יאמאנאשי', category: 'nature', status: 'maybe', link: '', notes: '', createdBy: A },
    { name: 'שכונת שיבויה בלילה', country: cA, city: 'טוקיו', category: 'nightlife', status: 'idea', link: '', notes: '', createdBy: B },
    { name: 'איי פי פי — שייט', country: cB, city: 'קראבי', category: 'nature', status: 'approved', link: '', notes: 'סנורקלינג במפרץ מאיה', createdBy: A },
    { name: 'שוק צ׳אטוצ׳אק', country: cB, city: 'בנגקוק', category: 'shopping', status: 'maybe', link: '', notes: 'רק בסופ״ש', createdBy: B },
    { name: 'קורס בישול תאילנדי', country: cB, city: 'צ׳יאנג מאי', category: 'activity', status: 'idea', link: '', notes: '', createdBy: SH },
  ]),
  itinerary: stamp([
    { date: D0.startDate, slot: 'morning', title: 'נחיתה בנאריטה + רכבת לטוקיו', location: 'נמל תעופה נאריטה', notes: 'לקנות Suica', linkedIdeaId: '', order: 0 },
    { date: D0.startDate, slot: 'afternoon', title: 'צ׳ק-אין + שיבויה קרוסינג', location: 'שיבויה', notes: '', linkedIdeaId: '', order: 0 },
    { date: D0.startDate, slot: 'evening', title: 'ארוחת ערב — סושי', location: 'גינזה', notes: '', linkedIdeaId: '', order: 0 },
    { date: addDays(D0.startDate, 1), slot: 'morning', title: 'שוק צׄוקיג׳י', location: 'טוקיו', notes: '', linkedIdeaId: '', order: 0 },
    { date: addDays(D0.startDate, 1), slot: 'afternoon', title: 'מקדש סנסו-ג׳י', location: 'אסקוסה', notes: '', linkedIdeaId: '', order: 0 },
  ]),
  expenses: stamp([
    { title: 'מלון בטוקיו (3 לילות)', amount: 75000, currency: FX0, amountILS: toBase(75000, FX0), rateUsed: rateOf(FX0), category: 'lodging', paidBy: A, date: D0.startDate },
    { title: 'כרטיסי JR Pass', amount: 60000, currency: FX0, amountILS: toBase(60000, FX0), rateUsed: rateOf(FX0), category: 'transport', paidBy: SH, date: TAKEOFF },
    { title: 'ראמן ארוחת ערב', amount: 2400, currency: FX0, amountILS: toBase(2400, FX0), rateUsed: rateOf(FX0), category: 'food', paidBy: B, date: D0.startDate },
    { title: 'מסאז׳ תאילנדי', amount: 800, currency: FX1, amountILS: toBase(800, FX1), rateUsed: rateOf(FX1), category: 'activities', paidBy: B, date: addDays(D1.startDate, 1) },
  ]),
  tasks: stamp([
    { title: 'להזמין כרטיסי טיסה', type: 'task', assignee: SH, dueDate: addDays(WEDDING, -120), done: true },
    { title: 'להחליף כסף (ין + באט)', type: 'task', assignee: A, dueDate: addDays(D0.startDate, -6), done: false },
    { title: 'לקנות ביטוח נסיעות', type: 'task', assignee: B, dueDate: addDays(WEDDING, -15), done: false },
    { title: 'דרכון בתוקף', type: 'packing', category: 'documents', assignee: SH, done: true },
    { title: 'כרטיסי טיסה מודפסים', type: 'packing', category: 'documents', assignee: A, done: false },
    { title: 'מטען נייד', type: 'packing', category: 'electronics', assignee: A, done: false },
    { title: 'אדפטר חשמל', type: 'packing', category: 'electronics', assignee: SH, done: true },
    { title: 'בגדי ים', type: 'packing', category: 'clothes', assignee: SH, done: false },
    { title: 'קרם הגנה', type: 'packing', category: 'toiletries', assignee: B, done: false },
  ]),
  documents: stamp([
    { type: 'flight', title: '🇮🇱 ישראל → יפן 🇯🇵', fields: { connection: true, origin: 'תל אביב (TLV)', layoverCity: 'איסטנבול (IST)', finalDestination: 'טוקיו (NRT)', date: TAKEOFF, arrivalDate: D0.startDate, depTimeOrigin: '23:40', arrTimeLayover: '04:30', depTimeLayover: '07:05', arrTimeFinal: '19:25', flightNo: 'TK785 / TK198', baggageKg: '30', passengers: SH, [seatA]: '24A', [seatB]: '24B', confirmation: 'TK7Z2K9', notes: 'קונקשן באיסטנבול' } },
    { type: 'flight', title: '🇯🇵 יפן → תאילנד 🇹🇭', fields: { date: D1.startDate, time: '10:15', arrivalDate: D1.startDate, arrivalTime: '15:05', flightNo: 'TG677', baggageKg: '30', passengers: SH, [seatA]: '31C', [seatB]: '31D', confirmation: 'TG88QF1' } },
    { type: 'flight', title: '🇹🇭 תאילנד → ישראל 🇮🇱', fields: { date: TRIP_END, time: '23:55', arrivalDate: addDays(TRIP_END, 1), arrivalTime: '05:30', flightNo: 'LY086', baggageKg: '23', passengers: SH, confirmation: 'ELAL9PP3', notes: 'טיסת חזרה' } },
    { type: 'train', title: 'טוקיו → קיוטו', fields: { date: addDays(D0.startDate, 4), time: '09:30', trainNo: 'Nozomi 21', car: '7', passengers: SH, [seatA]: '12A', [seatB]: '12B', confirmation: 'JR-8842' } },
    { type: 'attraction', title: 'דיסנילנד טוקיו', fields: { date: addDays(D0.startDate, 2), time: '09:00', address: 'Maihama, Urayasu, Chiba', addressLocal: '千葉県浦安市舞浜1-1', passengers: SH, confirmation: 'TDR-99182', notes: '1-Day Passport' } },
    { type: 'restaurant', title: 'אומאקאסה סושי גינזה', fields: { date: addDays(D0.startDate, 1), time: '19:00', partySize: '2', address: 'Ginza, Tokyo', addressLocal: '東京都中央区銀座', confirmation: 'OMK-5521' } },
    { type: 'accommodation', title: 'מלון בטוקיו', fields: { address: 'שינג׳וקו, טוקיו', addressLocal: '東京都新宿区西新宿2-8-1', checkIn: D0.startDate, checkOut: addDays(D0.startDate, 3), confirmation: 'BK-552190', phone: '+81357890000' } },
    { type: 'accommodation', title: 'רזורט בקראבי', fields: { address: 'Ao Nang, Krabi', addressLocal: 'อ่าวนาง กระบี่ 81180', checkIn: addDays(D1.startDate, 1), checkOut: addDays(D1.startDate, 5), confirmation: 'AGD-77410' } },
  ]),
  useful_apps: stamp([
    { name: 'GO (מוניות)', country: cA, category: 'taxi', link: 'https://go.goinc.jp/' },
    { name: 'Japan Travel — NAVITIME', country: cA, category: 'transit', link: 'https://japantravel.navitime.com/' },
    { name: 'Tabelog', country: cA, category: 'dining', link: 'https://tabelog.com/' },
    { name: 'Grab', country: cB, category: 'taxi', link: 'https://www.grab.com/th/' },
    { name: 'Bolt', country: cB, category: 'taxi', link: 'https://bolt.eu/' },
    { name: 'ViaBus', country: cB, category: 'transit', link: 'https://www.viabus.co/' },
    { name: 'Google Maps', country: 'general', category: 'navigation', link: 'https://maps.google.com/' },
    { name: 'Google Translate', country: 'general', category: 'translation', link: 'https://translate.google.com/' },
  ]),
};

const singleDocs = {
  'settings/config': { budgetTotalILS: config.budget.defaultTotal },
  'settings/dayNames': {
    [D0.startDate]: 'מלון בשינג׳וקו, טוקיו',
    [addDays(D0.startDate, 1)]: 'מלון בשינג׳וקו, טוקיו',
  },
};

const collSubs = {};
const docSubs = {};

const emitColl = (path) => (collSubs[path] || new Set()).forEach((cb) => cb([...(collections[path] || [])]));
const emitDoc = (path) => (docSubs[path] || new Set()).forEach((cb) => cb(singleDocs[path] ? { id: 'config', ...singleDocs[path] } : null));

export function demoSubColl(path, cb) {
  if (!collSubs[path]) collSubs[path] = new Set();
  collSubs[path].add(cb);
  cb([...(collections[path] || [])]);
  return () => collSubs[path].delete(cb);
}

export function demoAdd(path, data) {
  if (!collections[path]) collections[path] = [];
  collections[path].push({ id: genId(), createdAt: { seconds: nextSeq() }, ...data });
  emitColl(path);
  return Promise.resolve();
}

export function demoUpdate(path, id, data) {
  const arr = collections[path] || [];
  const i = arr.findIndex((d) => d.id === id);
  if (i >= 0) arr[i] = { ...arr[i], ...data };
  emitColl(path);
  return Promise.resolve();
}

export function demoRemove(path, id) {
  collections[path] = (collections[path] || []).filter((d) => d.id !== id);
  emitColl(path);
  return Promise.resolve();
}

export function demoSubDoc(path, cb) {
  if (!docSubs[path]) docSubs[path] = new Set();
  docSubs[path].add(cb);
  cb(singleDocs[path] ? { id: 'config', ...singleDocs[path] } : null);
  return () => docSubs[path].delete(cb);
}

export function demoSaveDoc(path, data) {
  singleDocs[path] = { ...(singleDocs[path] || {}), ...data };
  emitDoc(path);
  return Promise.resolve();
}
