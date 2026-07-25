import { useEffect, useRef, useState } from 'react';
import { server } from '../utils/stellar';

const CONTRACT_ID = import.meta.env.VITE_NFT_CONTRACT_ID;
const POLL_INTERVAL_MS = 5000;

/**
 * Soroban RPC doesn't offer websocket subscriptions yet, so "real-time"
 * here means short-interval polling of getEvents from the last-seen
 * ledger. This keeps the activity feed live without a backend indexer.
 */
export function useContractEvents({ topics = ['mint'], limit = 20 } = {}) {
  const [events, setEvents] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const lastLedgerRef = useRef(null);

  useEffect(() => {
    if (!CONTRACT_ID) return undefined;
    let cancelled = false;

    async function poll() {
      try {
        const latest = await server.getLatestLedger();
        const startLedger =
          lastLedgerRef.current ?? Math.max(latest.sequence - 500, 1);

        const res = await server.getEvents({
          startLedger,
          filters: [
            {
              type: 'contract',
              contractIds: [CONTRACT_ID],
            },
          ],
          limit,
        });

        if (!cancelled) {
          setIsLive(true);
          if (res.events?.length) {
            setEvents((prev) => {
              const merged = [...res.events, ...prev];
              const seen = new Set();
              return merged.filter((e) => {
                const key = `${e.id}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              }).slice(0, 50);
            });
          }
          lastLedgerRef.current = latest.sequence;
        }
      } catch {
        if (!cancelled) setIsLive(false);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [limit]);

  return { events, isLive };
}
