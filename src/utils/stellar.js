import {
  rpc as SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  Networks,
} from '@stellar/stellar-sdk';
import { InsufficientBalanceError, normalizeWalletError } from './errors';

const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';
export const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE || Networks.TESTNET;

export const server = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

/** Minimum XLM reserve we require before letting someone attempt a mint. */
const MIN_XLM_FOR_TX = 2;

export async function getXlmBalance(publicKey) {
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
    if (!res.ok) return 0;
    const account = await res.json();
    const native = account.balances?.find((b) => b.asset_type === 'native');
    return native ? parseFloat(native.balance) : 0;
  } catch {
    return 0;
  }
}

export async function assertSufficientBalance(publicKey) {
  const balance = await getXlmBalance(publicKey);
  if (balance < MIN_XLM_FOR_TX) {
    throw new InsufficientBalanceError(MIN_XLM_FOR_TX, balance.toFixed(2));
  }
  return balance;
}

/**
 * Builds a contract invocation transaction, simulates it, has the wallet
 * sign it, submits it, then polls until it lands. Returns a status stream
 * via `onStatus` so the UI can show pending -> success/fail live.
 */
export async function buildSimulateSignSubmit({
  sourcePublicKey,
  contract, // a Contract instance from stellar-sdk
  method,
  args,
  signTransaction, // (xdr) => Promise<{ signedTxXdr }>
  onStatus,
}) {
  onStatus?.({ phase: 'building' });

  const account = await server.getAccount(sourcePublicKey);
  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  onStatus?.({ phase: 'simulating' });
  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }
  tx = SorobanRpc.assembleTransaction(tx, sim).build();

  onStatus?.({ phase: 'awaiting-signature' });
  let signedTxXdr;
  try {
    const result = await signTransaction(tx.toXDR());
    signedTxXdr = result.signedTxXdr || result;
  } catch (err) {
    throw normalizeWalletError(err, { action: 'transaction signature' });
  }

  const signedTx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);

  onStatus?.({ phase: 'submitting' });
  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === 'ERROR') {
    throw new Error(`Transaction rejected by network: ${JSON.stringify(sendResult.errorResult)}`);
  }

  const hash = sendResult.hash;
  onStatus?.({ phase: 'pending', hash });

  // Poll until the transaction is confirmed or fails.
  let getResponse = await server.getTransaction(hash);
  let attempts = 0;
  while (getResponse.status === 'NOT_FOUND' && attempts < 20) {
    await new Promise((r) => setTimeout(r, 1500));
    getResponse = await server.getTransaction(hash);
    attempts += 1;
  }

  if (getResponse.status === 'SUCCESS') {
    onStatus?.({ phase: 'success', hash });
    return { hash, result: getResponse };
  }

  onStatus?.({ phase: 'failed', hash, detail: getResponse.status });
  throw new Error(`Transaction ${getResponse.status.toLowerCase()}: ${hash}`);
}
