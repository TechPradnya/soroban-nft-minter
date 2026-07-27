import { Radio, RadioTower, CheckCircle2 } from 'lucide-react';
import { useContractEvents } from '../hooks/useContractEvents';

export default function ActivityFeed() {
  const { events, isLive } = useContractEvents({ topics: ['mint'] });

  // Show only the latest 10 events
  const recentEvents = events.slice(0, 10);

  return (
    <aside className="activity-feed">
      <div className="activity-feed__header">
        {isLive ? (
          <RadioTower size={15} className="pulse" />
        ) : (
          <Radio size={15} />
        )}

        <div>
          <h3>Live Mint Activity</h3>
          <small>{isLive ? "Connected to Stellar Testnet" : "Connecting..."}</small>
        </div>
      </div>

      {recentEvents.length === 0 ? (
        <div className="activity-feed__empty">
          <CheckCircle2 size={18} />
          <span>Waiting for the first NFT mint event...</span>
        </div>
      ) : (
        <ul className="activity-feed__list">
          {recentEvents.map((evt) => (
            <li key={evt.id} className="activity-feed__item">
              <CheckCircle2
                size={16}
                color="#34d399"
                style={{ marginTop: 4, flexShrink: 0 }}
              />

              <div className="activity-feed__content">
                <strong>New NFT Minted</strong>

                <div className="activity-feed__meta">
                  <span>✔ Confirmed on Stellar Testnet</span>
                  <span>•</span>
                  <span>Ledger #{evt.ledger}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}