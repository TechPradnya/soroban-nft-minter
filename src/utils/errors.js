/**
 * Typed errors so the UI can branch on `error.code` instead of parsing
 * message strings (wallet extensions are inconsistent about wording).
 */

export class WalletNotFoundError extends Error {
  constructor(walletName) {
    super(`${walletName} isn't installed or isn't available in this browser.`);
    this.name = 'WalletNotFoundError';
    this.code = 'WALLET_NOT_FOUND';
    this.walletName = walletName;
  }
}

export class UserRejectedError extends Error {
  constructor(action = 'transaction') {
    super(`You declined the ${action} in your wallet.`);
    this.name = 'UserRejectedError';
    this.code = 'USER_REJECTED';
  }
}

export class InsufficientBalanceError extends Error {
  constructor(needed, available) {
    super(
      `Not enough XLM to cover this transaction. Needed ~${needed} XLM, ` +
        `wallet has ${available} XLM.`
    );
    this.name = 'InsufficientBalanceError';
    this.code = 'INSUFFICIENT_BALANCE';
    this.needed = needed;
    this.available = available;
  }
}

export class ContractCallError extends Error {
  constructor(message, raw) {
    super(message);
    this.name = 'ContractCallError';
    this.code = 'CONTRACT_CALL_FAILED';
    this.raw = raw;
  }
}

/**
 * Normalizes whatever a wallet/kit/SDK throws into one of the typed errors
 * above. Wallet extensions throw wildly different shapes, so this is the
 * single place that translation happens.
 */
export function normalizeWalletError(err, context = {}) {
  const msg = String(err?.message || err || '').toLowerCase();

  if (msg.includes('not installed') || msg.includes('not found') || msg.includes('no wallet')) {
    return new WalletNotFoundError(context.walletName || 'Wallet');
  }
  if (
    msg.includes('rejected') ||
    msg.includes('declined') ||
    msg.includes('user canceled') ||
    msg.includes('user cancelled') ||
    msg.includes('denied')
  ) {
    return new UserRejectedError(context.action);
  }
  if (msg.includes('insufficient') || msg.includes('underfunded') || msg.includes('balance')) {
    return new InsufficientBalanceError(context.needed ?? '?', context.available ?? '?');
  }
  return err instanceof Error ? err : new Error(String(err));
}
