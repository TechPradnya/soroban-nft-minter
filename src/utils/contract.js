import { Contract, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { server, buildSimulateSignSubmit, assertSufficientBalance } from './stellar';

const CONTRACT_ID = import.meta.env.VITE_NFT_CONTRACT_ID;

function getContract() {
  if (!CONTRACT_ID) {
    throw new Error(
      'VITE_NFT_CONTRACT_ID is not set. Deploy the contract and add its ID to .env (see README).'
    );
  }
  return new Contract(CONTRACT_ID);
}

/**
 * Mint an NFT to `toPublicKey` with the given metadata URI.
 * Returns { hash, tokenId }.
 */
export async function mintNft({ toPublicKey, tokenUri, signTransaction, onStatus }) {
  await assertSufficientBalance(toPublicKey);

  const contract = getContract();
  const args = [
    nativeToScVal(toPublicKey, { type: 'address' }),
    nativeToScVal(tokenUri, { type: 'string' }),
  ];

  const { hash, result } = await buildSimulateSignSubmit({
    sourcePublicKey: toPublicKey,
    contract,
    method: 'mint',
    args,
    signTransaction,
    onStatus,
  });

  let tokenId = null;
  try {
    const retval = result?.returnValue;
    if (retval) tokenId = scValToNative(retval);
  } catch {
    // Non-fatal: the mint succeeded, we just couldn't decode the return value.
  }

  return { hash, tokenId };
}

export async function getOwnerOf(tokenId) {
  const contract = getContract();
  const account = await server.getAccount(
    // A throwaway read: simulateTransaction still needs a source account,
    // so any funded testnet account works here. In production, cache a
    // read-only account or use `server.simulateTransaction` with a footprint-only call.
    import.meta.env.VITE_READ_SOURCE_ACCOUNT || (await server.getLatestLedger()).id
  ).catch(() => null);
  if (!account) return null;

  const { TransactionBuilder, BASE_FEE } = await import('@stellar/stellar-sdk');
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: import.meta.env.VITE_NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('owner_of', nativeToScVal(tokenId, { type: 'u64' })))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (sim?.result?.retval) {
    return scValToNative(sim.result.retval);
  }
  return null;
}

export function contractExplorerUrl() {
  return `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`;
}

export function txExplorerUrl(hash) {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}
