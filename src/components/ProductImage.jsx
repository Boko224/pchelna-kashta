const ICONS = {
  med: '🍯',
  'pchelni-produkti': '🐝',
  'kozmetika-i-sveshti': '🕯️',
  podaratsi: '🎁',
};

const PALETTES = [
  ['#f8d77e', '#e39b25'],
  ['#f5c95a', '#c97c1a'],
  ['#fbe3a1', '#e0a63c'],
  ['#f2bd4c', '#b9691a'],
];

// Shows the product photo, or a honeycomb placeholder when no photo has been uploaded yet.
export default function ProductImage({ product, className = '' }) {
  if (product.image_url) {
    return <img className={`product-img ${className}`} src={product.image_url} alt={product.name} loading="lazy" />;
  }
  const [from, to] = PALETTES[(product.id || 0) % PALETTES.length];
  return (
    <div
      className={`product-img placeholder ${className}`}
      style={{ background: `linear-gradient(140deg, ${from}, ${to})` }}
      role="img"
      aria-label={product.name}
    >
      <span>{ICONS[product.category_slug] || '🍯'}</span>
    </div>
  );
}
