import { createContext, useContext, useMemo } from 'react';
import { useCollection, useDocument } from '../lib/useCollection';
import { useRates } from '../lib/currency';
import { ymd } from '../lib/tripConfig';

const TripDataCtx = createContext(null);

/**
 * Global app data shared across chrome (the Smart Hotel FAB + the currency
 * calculator) so they don't each re-subscribe. Subscribes once to the
 * `documents` collection and the per-day-names doc, and exposes the
 * computed "where are we staying" hotel for the FAB.
 */
export function TripDataProvider({ children }) {
  const { docs: documents } = useCollection('documents');
  const { data: dayNames } = useDocument('settings/dayNames');
  const { rates } = useRates();

  const hotel = useMemo(() => {
    const today = ymd(new Date());
    const lodging = documents.filter((d) => d.type === 'accommodation');

    // 1) The hotel whose stay covers tonight (checkIn ≤ today < checkOut).
    const current = lodging.find((d) => {
      const ci = d.fields?.checkIn;
      const co = d.fields?.checkOut;
      if (ci && co) return today >= ci && today < co;
      if (ci && !co) return today >= ci;
      return false;
    });

    // 2) Otherwise the next upcoming stay (so it's useful before the trip).
    const upcoming = lodging
      .filter((d) => d.fields?.checkIn && d.fields.checkIn >= today)
      .sort((a, b) => a.fields.checkIn.localeCompare(b.fields.checkIn))[0];

    const pick = current || upcoming || lodging[0];

    if (pick) {
      return {
        name: pick.title,
        address: pick.fields?.address || '',
        addressLocal: pick.fields?.addressLocal || '',
        checkIn: pick.fields?.checkIn || '',
        checkOut: pick.fields?.checkOut || '',
        isTonight: !!current,
      };
    }

    // 3) Fall back to the free-text per-day name, if any.
    const dayName = dayNames?.[today];
    return dayName ? { name: dayName, isTonight: true } : null;
  }, [documents, dayNames]);

  const value = useMemo(() => ({ documents, dayNames, rates, hotel }), [documents, dayNames, rates, hotel]);

  return <TripDataCtx.Provider value={value}>{children}</TripDataCtx.Provider>;
}

export function useTripData() {
  const ctx = useContext(TripDataCtx);
  if (!ctx) throw new Error('useTripData must be used within TripDataProvider');
  return ctx;
}
