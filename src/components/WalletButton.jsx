import { Wallet, LogOut, Loader2 } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

function shorten(pk) {
  return pk ? `${pk.slice(0, 4)}…${pk.slice(-4)}` : '';
}

export default function WalletButton() {
  const { isConnected, publicKey, balance, connecting, openWalletModal, disconnect } =
    useWallet();

  if (connecting) {
    return (
      <button className="btn btn--ghost" disabled>
        <Loader2 size={16} className="spin" />
        Connecting…
      </button>
    );
  }

  if (isConnected) {
    return (
      <div className="wallet-chip">
        <span className="wallet-chip__balance">
          {balance !== null ? `${balance.toFixed(2)} XLM` : '—'}
        </span>
        <span className="wallet-chip__addr">{shorten(publicKey)}</span>
        <button className="btn btn--icon" onClick={disconnect} title="Disconnect">
          <LogOut size={15} />
        </button>
      </div>
    );
  }

  return (
    <button className="btn btn--primary" onClick={openWalletModal}>
      <Wallet size={16} />
      Connect Wallet
    </button>
  );
}
