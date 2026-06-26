// ─────────────────────────────────────────────────────────────
// Single source of truth for the `documents` collection schema.
// Shared by the Documents page (full manager) and the Travel Wallet
// (which renders flights / trains / hotels as Apple-Wallet tickets).
// JS keeps insertion order, so this also drives section order.
// ─────────────────────────────────────────────────────────────
import { TRIP_YEAR } from './tripConfig';

export const DOC_TYPES = {
  flight: {
    label: 'טיסות',
    emoji: '✈️',
    titleLabel: 'מסלול',
    titlePlaceholder: 'ישראל → יפן',
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
  train: {
    label: 'רכבות',
    emoji: '🚄',
    titleLabel: 'מסלול',
    titlePlaceholder: 'טוקיו → קיוטו',
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
  attraction: {
    label: 'אטרקציות',
    emoji: '🎟️',
    titleLabel: 'שם האטרקציה',
    titlePlaceholder: 'דיסנילנד טוקיו',
    walletOnly: true,
    fields: [
      { key: 'date', label: 'תאריך', type: 'date' },
      { key: 'time', label: 'שעת כניסה', type: 'time' },
      { key: 'address', label: 'כתובת', type: 'text' },
      { key: 'addressLocal', label: 'כתובת בשפה המקומית', type: 'textarea' },
      { key: 'confirmation', label: 'מס׳ הזמנה', type: 'text' },
      { key: 'notes', label: 'הערות', type: 'textarea' },
    ],
  },
  restaurant: {
    label: 'מסעדות',
    emoji: '🍽️',
    titleLabel: 'שם המסעדה',
    titlePlaceholder: 'אומאקאסה סושי',
    walletOnly: true,
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
  accommodation: {
    label: 'לינה',
    emoji: '🏨',
    titleLabel: 'שם המקום',
    titlePlaceholder: 'מלון בקיוטו',
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
  contact: {
    label: 'אנשי קשר',
    emoji: '📇',
    titleLabel: 'שם',
    titlePlaceholder: 'נציג ביטוח / מדריך',
    fields: [
      { key: 'phone', label: 'טלפון', type: 'tel' },
      { key: 'notes', label: 'פרטים', type: 'textarea' },
    ],
  },
  info: {
    label: 'מידע כללי',
    emoji: '📝',
    titleLabel: 'נושא',
    titlePlaceholder: 'ויזה / חיסונים / סים',
    fields: [{ key: 'notes', label: 'תוכן', type: 'textarea' }],
  },
};

// The 3 known flights, offered as a one-tap seed.
export const SEED_FLIGHTS = [
  { title: '🇮🇱 ישראל → יפן 🇯🇵', fields: { date: `${TRIP_YEAR}-04-06`, notes: 'המראה 6.4, נחיתה 7.4' } },
  { title: '🇯🇵 יפן → תאילנד 🇹🇭', fields: { date: `${TRIP_YEAR}-04-28`, notes: '' } },
  { title: '🇹🇭 תאילנד → ישראל 🇮🇱', fields: { date: `${TRIP_YEAR}-05-12`, notes: 'טיסת חזרה' } },
];
