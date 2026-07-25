import { useState } from 'react';
import { WalletProvider, useWallet } from './context/WalletContext';
import { ToastProvider, useToast } from './components/Toast';
import WalletButton from './components/WalletButton';
import MintForm from './components/MintForm';
import ActivityFeed from './components/ActivityFeed';
import MintedGallery from './components/MintedGallery';
import { contractExplorerUrl } from './utils/contract';

function Shell() {
  const { error } = useWallet();
  const { push } = useToast();
  const [minted, setMinted] = useState([]);

  function handleMinted(item) {
    setMinted((prev) => [item, ...prev]);
    push(`Minted "${item.name}" — confirmed on ledger.`, 'success');
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__brand-dot" />
          NFT Minter
        </div>
        <WalletButton />
      </header>

      {error && <div className="app__banner app__banner--error">{error.message}</div>}

      <main className="app__main">
        <section className="app__mint-panel">
          <h1>Mint on Stellar Testnet</h1>
          <p className="app__subtitle">
            Connect any supported wallet, fill in your NFT's details, and mint
            directly to a Soroban smart contract. Every step of the
            transaction is tracked live below.
          </p>
          <MintForm onMinted={handleMinted} />
          <a className="app__contract-link" href={contractExplorerUrl()} target="_blank" rel="noreferrer">
            View contract on Stellar Explorer
          </a>
        </section>

        <ActivityFeed />
      </main>

      <MintedGallery items={minted} />

      <footer className="app__footer">
        Built for the Stellar Level 2 challenge · Testnet only
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </WalletProvider>
  );
}
