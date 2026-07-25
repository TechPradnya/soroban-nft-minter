import { useState } from 'react';
import { ImagePlus, Sparkles } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { mintNft } from '../utils/contract';
import TransactionStatus from './TransactionStatus';
import {
  WalletNotFoundError,
  UserRejectedError,
  InsufficientBalanceError,
} from '../utils/errors';

const initialStatus = { phase: 'idle' };

export default function MintForm({ onMinted }) {
  const { publicKey, isConnected, signTransaction, openWalletModal, refreshBalance } =
    useWallet();
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [formError, setFormError] = useState(null);

  const disabled = status.phase !== 'idle' && status.phase !== 'success' && status.phase !== 'failed';

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    if (!isConnected) {
      await openWalletModal();
      return;
    }
    if (!name.trim() || !imageUrl.trim()) {
      setFormError('Name and image URL are required.');
      return;
    }

    // Metadata URI: for a Level 2 submission, a data: URI or a link to
    // pre-pinned JSON both satisfy "mint with metadata." Swap in a real
    // IPFS pin (Pinata/NFT.Storage) for production use.
    const metadata = {
      name: name.trim(),
      description: description.trim(),
      image: imageUrl.trim(),
    };
    const tokenUri = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;

    try {
      const { hash, tokenId } = await mintNft({
        toPublicKey: publicKey,
        tokenUri,
        signTransaction,
        onStatus: setStatus,
      });
      await refreshBalance();
      onMinted?.({ hash, tokenId, ...metadata });
    } catch (err) {
      if (
        err instanceof WalletNotFoundError ||
        err instanceof UserRejectedError ||
        err instanceof InsufficientBalanceError
      ) {
        setFormError(err.message);
      } else {
        setFormError(err.message || 'Minting failed. Check the console for details.');
      }
      setStatus({ phase: 'failed', detail: err.message });
    }
  }

  return (
    <form className="mint-form" onSubmit={handleSubmit}>
      <div className="mint-form__field">
        <label htmlFor="nft-name">Name</label>
        <input
          id="nft-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cosmic Wanderer #1"
          disabled={disabled}
        />
      </div>

      <div className="mint-form__field">
        <label htmlFor="nft-image">Image URL</label>
        <div className="mint-form__input-icon">
          <ImagePlus size={16} />
          <input
            id="nft-image"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="mint-form__field">
        <label htmlFor="nft-desc">Description</label>
        <textarea
          id="nft-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What makes this one worth minting?"
          disabled={disabled}
        />
      </div>

      {formError && <p className="form-error">{formError}</p>}

      <button type="submit" className="btn btn--primary btn--block" disabled={disabled}>
        <Sparkles size={16} />
        {isConnected ? 'Mint NFT' : 'Connect wallet to mint'}
      </button>

      <TransactionStatus status={status} />
    </form>
  );
}
