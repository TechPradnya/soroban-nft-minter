import { ExternalLink } from 'lucide-react';
import { txExplorerUrl } from '../utils/contract';

export default function MintedGallery({ items }) {
  if (!items.length) return null;

  return (
    <section className="gallery">
      <h2>Minted this session</h2>
      <div className="gallery__grid">
        {items.map((item) => (
          <a
            key={item.hash}
            className="gallery__card"
            href={txExplorerUrl(item.hash)}
            target="_blank"
            rel="noreferrer"
          >
            <img src={item.image} alt={item.name} loading="lazy" />
            <div className="gallery__card-body">
              <strong>{item.name}</strong>
              {item.tokenId !== null && <span>#{item.tokenId}</span>}
              <span className="gallery__card-link">
                Explorer <ExternalLink size={11} />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
