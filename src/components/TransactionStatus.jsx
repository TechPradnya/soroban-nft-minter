import { CheckCircle2, CircleAlert, Loader2, ExternalLink } from 'lucide-react';
import { txExplorerUrl } from '../utils/contract';

const STEPS = ['building', 'simulating', 'awaiting-signature', 'submitting', 'pending', 'success'];

const LABELS = {
  building: 'Building transaction',
  simulating: 'Simulating on Soroban',
  'awaiting-signature': 'Waiting for your signature',
  submitting: 'Submitting to network',
  pending: 'Confirming on ledger',
  success: 'Minted!',
  failed: 'Failed',
};

export default function TransactionStatus({ status }) {
  if (!status || status.phase === 'idle') return null;

  if (status.phase === 'failed') {
    return (
      <div className="tx-status tx-status--failed">
        <CircleAlert size={16} />
        <span>{LABELS.failed}: {status.detail}</span>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status.phase);

  return (
    <div className="tx-status">
      <ol className="tx-status__steps">
        {STEPS.map((step, i) => {
          const state =
            i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending';
          return (
            <li key={step} className={`tx-status__step tx-status__step--${state}`}>
              {state === 'done' && <CheckCircle2 size={14} />}
              {state === 'active' && step !== 'success' && (
                <Loader2 size={14} className="spin" />
              )}
              {state === 'active' && step === 'success' && <CheckCircle2 size={14} />}
              <span>{LABELS[step]}</span>
            </li>
          );
        })}
      </ol>

      {status.hash && (
        <a
          className="tx-status__link"
          href={txExplorerUrl(status.hash)}
          target="_blank"
          rel="noreferrer"
        >
          View on Stellar Explorer <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}
