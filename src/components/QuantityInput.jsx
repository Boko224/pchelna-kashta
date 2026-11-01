export default function QuantityInput({ value, max = 99, onChange }) {
  const clamp = (n) => Math.max(1, Math.min(n, max));
  return (
    <div className="qty">
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= 1} aria-label="Намали">−</button>
      <input
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(parseInt(e.target.value, 10) || 1))}
        aria-label="Количество"
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label="Увеличи">+</button>
    </div>
  );
}
