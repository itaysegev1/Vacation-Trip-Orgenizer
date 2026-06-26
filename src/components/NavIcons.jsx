/**
 * Bottom/side nav icons with an outline and a filled variant.
 * The big "body" path fills in when active (the iOS tab-bar pattern);
 * fine details stay as strokes. All currentColor, so callers set color.
 */
const VIEW = { viewBox: '0 0 24 24', strokeLinecap: 'round', strokeLinejoin: 'round' };
const body = (filled) =>
  filled
    ? { fill: 'currentColor', stroke: 'none' }
    : { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 };
const detail = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 };

function Home({ filled, className }) {
  return (
    <svg {...VIEW} className={className} aria-hidden="true">
      <path
        {...body(filled)}
        d="M12 3.2 3.4 10a1.6 1.6 0 0 0-.6 1.25V19.5A1.5 1.5 0 0 0 4.3 21H9v-5a3 3 0 0 1 6 0v5h4.7a1.5 1.5 0 0 0 1.5-1.5v-8.25A1.6 1.6 0 0 0 20.6 10L12 3.2Z"
      />
    </svg>
  );
}

function Ideas({ filled, className }) {
  return (
    <svg {...VIEW} className={className} aria-hidden="true">
      <path
        {...body(filled)}
        d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.85 1 .85 1.7v.5h5.5v-.5c0-.7.35-1.3.85-1.7A6 6 0 0 0 12 3Z"
      />
      <path {...detail} d="M9.7 19.2h4.6M10.4 21.2h3.2" />
    </svg>
  );
}

function Calendar({ filled, className }) {
  return (
    <svg {...VIEW} className={className} aria-hidden="true">
      <path
        {...body(filled)}
        d="M5.5 5h13A1.5 1.5 0 0 1 20 6.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.5A1.5 1.5 0 0 1 5.5 5Z"
      />
      <path {...detail} d="M8 3.2v3.4M16 3.2v3.4M4.3 9.3h15.4" />
    </svg>
  );
}

function Budget({ filled, className }) {
  return (
    <svg {...VIEW} className={className} aria-hidden="true">
      <path
        {...body(filled)}
        d="M12 5c3.9 0 7 1.3 7 3v8c0 1.7-3.1 3-7 3s-7-1.3-7-3V8c0-1.7 3.1-3 7-3Z"
      />
      <path {...detail} d="M5 8c0 1.7 3.1 3 7 3s7-1.3 7-3M5 12.2c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </svg>
  );
}

function Tasks({ filled, className }) {
  return (
    <svg {...VIEW} className={className} aria-hidden="true">
      <path
        {...body(filled)}
        d="M6 8h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
      />
      <path {...detail} d="M9 8V6.6A1.6 1.6 0 0 1 10.6 5h2.8A1.6 1.6 0 0 1 15 6.6V8M9.5 12.2v6.4M14.5 12.2v6.4" />
    </svg>
  );
}

function Wallet({ filled, className }) {
  return (
    <svg {...VIEW} className={className} aria-hidden="true">
      <path
        {...body(filled)}
        d="M4.5 7.5h15A1.5 1.5 0 0 1 21 9v6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 15V9a1.5 1.5 0 0 1 1.5-1.5Z"
      />
      <path {...detail} strokeDasharray="1.7 1.7" d="M14.5 7.7v8.6" />
    </svg>
  );
}

function Documents({ filled, className }) {
  return (
    <svg {...VIEW} className={className} aria-hidden="true">
      <path
        {...body(filled)}
        d="M5 6h3.6a1.5 1.5 0 0 1 1.1.5L11 8h8a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V7.5A1.5 1.5 0 0 1 5 6Z"
      />
    </svg>
  );
}

function Apps({ filled, className }) {
  return (
    <svg {...VIEW} className={className} aria-hidden="true">
      <g {...body(filled)}>
        <rect x="3.8" y="3.8" width="7" height="7" rx="2" />
        <rect x="13.2" y="3.8" width="7" height="7" rx="2" />
        <rect x="3.8" y="13.2" width="7" height="7" rx="2" />
        <rect x="13.2" y="13.2" width="7" height="7" rx="2" />
      </g>
    </svg>
  );
}

export const NAV_ICONS = {
  '/': Home,
  '/ideas': Ideas,
  '/itinerary': Calendar,
  '/budget': Budget,
  '/tasks': Tasks,
  '/wallet': Wallet,
  '/documents': Documents,
  '/apps': Apps,
};

export default function NavIcon({ to, filled, className = 'h-6 w-6' }) {
  const Cmp = NAV_ICONS[to] || Home;
  return <Cmp filled={filled} className={className} />;
}
