import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Modal from './Modal';
import { useTripData } from '../context/TripDataContext';
import { convertToILS, formatILS, FOREIGN_CURRENCIES, currencyByCode } from '../lib/currency';
import { triggerHaptic } from '../lib/haptics';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
const PICK = FOREIGN_CURRENCIES;

export default function CurrencyCalculator() {
  const { rates } = useTripData();
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState(FOREIGN_CURRENCIES[0]?.code || '');
  const [amount, setAmount] = useState('');

  const press = (k) => {
    triggerHaptic('light');
    setAmount((a) => {
      if (k === '⌫') return a.slice(0, -1);
      if (k === '.') return a.includes('.') ? a : (a || '0') + '.';
      if (a === '0') return k === '.' ? a : k;
      return (a + k).slice(0, 12);
    });
  };

  const num = Number(amount) || 0;
  const cur = currencyByCode(currency);
  const ils = convertToILS(num, currency, rates);
  const tipILS = convertToILS(num * (cur?.tipRate || 0), currency, rates);
  const symbol = cur?.symbol;

  return (
    <>
      <button
        onClick={() => {
          triggerHaptic('light');
          setOpen(true);
        }}
        aria-label="מחשבון מטבע"
        className="grid h-9 w-9 place-items-center rounded-full bg-petal text-lg transition active:scale-90"
      >
        🧮
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="מחשבון מטבע 🧮">
        <div className="space-y-4">
          {/* Currency toggle */}
          <div className="flex gap-2">
            {PICK.map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  triggerHaptic('light');
                  setCurrency(c.code);
                }}
                className={`flex-1 rounded-2xl py-2.5 font-semibold transition active:scale-95 ${
                  currency === c.code ? 'bg-sakura text-white shadow-soft' : 'bg-petal text-ink-soft'
                }`}
              >
                {c.flag} {c.symbol} {c.label}
              </button>
            ))}
          </div>

          {/* Display */}
          <div className="rounded-3xl bg-white p-4 text-center shadow-soft">
            <div className="font-display text-3xl text-ink tabular-nums" dir="ltr">
              {symbol}
              {amount || '0'}
            </div>
            <div className="mt-1 font-display text-2xl text-rose-deep">≈ {formatILS(ils)}</div>
          </div>

          {/* Tip tooltip */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currency}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="rounded-2xl bg-jade-soft px-4 py-2.5 text-center text-sm font-medium text-ink"
            >
              {cur?.tipNote}
              {cur?.tipRate > 0 && num > 0 && <> · ≈ {formatILS(tipILS)}</>}
            </motion.div>
          </AnimatePresence>

          {/* Keypad (LTR so it reads 1-2-3 like a normal number pad) */}
          <div dir="ltr" className="grid grid-cols-3 gap-2">
            {KEYS.map((k) => (
              <motion.button
                key={k}
                whileTap={{ scale: 0.92 }}
                onClick={() => press(k)}
                className="rounded-2xl bg-white py-3.5 text-center font-display text-2xl text-ink shadow-sm active:bg-petal"
              >
                {k}
              </motion.button>
            ))}
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              setAmount('');
            }}
            className="w-full rounded-2xl bg-petal py-2.5 font-semibold text-rose-deep transition active:scale-95"
          >
            ניקוי
          </button>
        </div>
      </Modal>
    </>
  );
}
