import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from '@creit.tech/stellar-wallets-kit';
import { normalizeWalletError } from '../utils/errors';
import { getXlmBalance } from '../utils/stellar';

const WalletContext = createContext(null);

const NETWORK =
  (import.meta.env.VITE_STELLAR_NETWORK || 'TESTNET') === 'TESTNET'
    ? WalletNetwork.TESTNET
    : WalletNetwork.PUBLIC;

// allowAllModules() wires up Freighter, Albedo, xBull, Lobstr, Rabet, etc.
// in one call — this is the "multi-wallet" surface StellarWalletsKit gives us.
const kit = new StellarWalletsKit({
  network: NETWORK,
  selectedWalletId: FREIGHTER_ID,
  modules: allowAllModules(),
});

export function WalletProvider({ children }) {
  const [publicKey, setPublicKey] = useState(null);
  const [walletId, setWalletId] = useState(null);
  const [balance, setBalance] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const refreshBalance = useCallback(async (pk) => {
    const key = pk || publicKey;
    if (!key) return;
    const bal = await getXlmBalance(key);
    setBalance(bal);
  }, [publicKey]);

  /**
   * Opens the StellarWalletsKit picker modal (lists every installed/available
   * wallet) and connects to whichever the user selects.
   */
  const openWalletModal = useCallback(() => {
    setError(null);
    return new Promise((resolve) => {
      kit.openModal({
        onWalletSelected: async (option) => {
          setConnecting(true);
          try {
            kit.setWallet(option.id);
            const { address } = await kit.getAddress();
            setPublicKey(address);
            setWalletId(option.id);
            await refreshBalance(address);
            resolve({ address, walletId: option.id });
          } catch (err) {
            const normalized = normalizeWalletError(err, { walletName: option.name });
            setError(normalized);
            resolve(null);
          } finally {
            setConnecting(false);
          }
        },
        onClosed: () => setConnecting(false),
      });
    });
  }, [refreshBalance]);

  const disconnect = useCallback(async () => {
    try {
      await kit.disconnect();
    } catch {
      // best-effort; some wallets don't support programmatic disconnect
    }
    setPublicKey(null);
    setWalletId(null);
    setBalance(null);
  }, []);

  const signTransaction = useCallback(
    async (xdr) => {
      try {
        return await kit.signTransaction(xdr, {
          address: publicKey,
          networkPassphrase: NETWORK,
        });
      } catch (err) {
        throw normalizeWalletError(err, { action: 'transaction signature' });
      }
    },
    [publicKey]
  );

  const value = useMemo(
    () => ({
      publicKey,
      walletId,
      balance,
      connecting,
      error,
      isConnected: Boolean(publicKey),
      openWalletModal,
      disconnect,
      signTransaction,
      refreshBalance,
    }),
    [publicKey, walletId, balance, connecting, error, openWalletModal, disconnect, signTransaction, refreshBalance]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
