import { NavLink } from 'react-router-dom';
import { TABS } from './BottomNav';
import NavIcon from './NavIcons';

/**
 * Desktop-only vertical navigation (lg+). On phones the BottomNav is used
 * instead. Sticky under the header so it stays visible while scrolling.
 */
export default function SideNav() {
  return (
    <aside className="sticky top-[4.75rem] hidden h-fit w-56 shrink-0 self-start py-4 pe-2 lg:block">
      <nav className="flex flex-col gap-1.5" aria-label="ניווט ראשי">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold transition ${
                isActive
                  ? 'bg-petal text-rose-deep shadow-soft'
                  : 'text-ink-soft hover:bg-white/70'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <NavIcon to={tab.to} filled={isActive} className="h-5 w-5 shrink-0" />
                <span>{tab.fullLabel}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
