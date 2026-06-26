import { IDEA_STATUSES, byId } from '../lib/tripConfig';

export default function StatusBadge({ status }) {
  const s = byId(IDEA_STATUSES, status) || IDEA_STATUSES[0];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-ink"
      style={{ background: s.bg }}
    >
      {s.label}
    </span>
  );
}
