import { Radio, RadioTower } from 'lucide-react';
import { useContractEvents } from '../hooks/useContractEvents';

function short(addr) {
  // Different stellar-sdk versions return event topic values in different
  // shapes (raw string, Address instance, or ScVal-like object), so coerce
  // defensively instead of assuming a string.
  let str;
  try {
    str = typeof addr === 'string' ? addr : addr?.toString?.() ?? String(addr ?? '');
  } catch {
    str = '';
  }
  if (!str || str.length < 8) return 'unknown';
  return `${str.slice(0, 4)}…${str.slice(-4)}`;
}

export default function ActivityFeed() {
  const { events, isLive } = useContractEvents({ topics: ['mint'] });

  return (
    <aside className="activity-feed">
      <div className="activity-feed__header">
        {isLive ? <RadioTower size={14} className="pulse" /> : <Radio size={14} />}
        <span>Live mint activity</span>
      </div>

      {events.length === 0 ? (
        <p className="activity-feed__empty">
          No mints yet — the first one will show up here within a few seconds.
        </p>
      ) : (
        <ul className="activity-feed__list">
          {events.map((evt) => (
            <li key={evt.id} className="activity-feed__item">
              <span className="activity-feed__dot" />
              <span>
                New mint by <strong>{short(evt.topic?.[1]?.address || evt.topic?.[1])}</strong>
              </span>
              <span className="activity-feed__ledger">ledger {evt.ledger}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
