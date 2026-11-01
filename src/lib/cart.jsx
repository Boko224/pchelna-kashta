import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'cart_v1';
const CartContext = createContext(null);

function load() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  const add = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const max = Math.max(product.stock, 0);
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, max), stock: max, price_cents: product.price_cents }
            : i,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          unit: product.unit,
          price_cents: product.price_cents,
          image_url: product.image_url,
          category_slug: product.category_slug,
          stock: max,
          quantity: Math.min(quantity, max),
        },
      ];
    });
    setNotice(`„${product.name}“ е добавен в количката`);
  }, []);

  const setQuantity = useCallback((id, quantity) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock || 99)) } : i)),
    );
  }, []);

  const remove = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.quantity * i.price_cents, 0);
    return { items, count, subtotal, add, setQuantity, remove, clear, notice };
  }, [items, notice, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
