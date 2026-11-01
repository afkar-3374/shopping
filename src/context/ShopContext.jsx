import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { store } from '../lib/store.js';

const CART_KEY = 'es-shop:cart:v2';
const Ctx = createContext(null);

function readCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}

export function ShopProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState(readCart); // [{ productId, qty }]
  const [toast, setToast] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const toastTimer = useRef(null);

  const notify = useCallback((message, tone = 'ok') => {
    setToast({ message, tone, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const refresh = useCallback(async () => {
    const [s, p] = await Promise.all([store.getSettings(), store.listProducts()]);
    setSettings(s);
    setProducts(p);
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* storage blocked */ }
  }, [cart]);

  // Cart lines use live product data, so price or stock changes are always current.
  const lines = useMemo(() => cart
    .map((l) => {
      const p = products.find((x) => x.id === l.productId);
      return p ? { ...l, product: p } : null;
    })
    .filter(Boolean), [cart, products]);

  const subtotal = lines.reduce((n, l) => n + l.qty * l.product.price, 0);
  const delivery = !subtotal || !settings ? 0
    : settings.freeDeliveryAbove && subtotal >= settings.freeDeliveryAbove ? 0
    : Number(settings.deliveryFee) || 0;
  const count = lines.reduce((n, l) => n + l.qty, 0);

  const addToCart = (productId) => {
    const p = products.find((x) => x.id === productId);
    if (!p || !p.active || p.stock <= 0) return;
    const have = cart.find((l) => l.productId === productId)?.qty || 0;
    if (have + 1 > p.stock) { notify(`Only ${p.stock} of ${p.name} available.`, 'warn'); return; }
    setCart((c) => {
      const found = c.find((l) => l.productId === productId);
      return found ? c.map((l) => (l.productId === productId ? { ...l, qty: l.qty + 1 } : l))
        : [...c, { productId, qty: 1 }];
    });
    notify(`Added ${p.name} to your bag`);
  };

  const changeQty = (productId, delta) => {
    const p = products.find((x) => x.id === productId);
    if (delta > 0 && p && (cart.find((l) => l.productId === productId)?.qty || 0) + 1 > p.stock) {
      notify(`Only ${p.stock} available.`, 'warn'); return;
    }
    setCart((c) => c.map((l) => (l.productId === productId ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0));
  };

  const removeFromCart = (productId) => setCart((c) => c.filter((l) => l.productId !== productId));
  const clearCart = () => setCart([]);

  const value = {
    settings, products, loading, error, refresh, notify, toast, cartOpen, setCartOpen,
    cart, lines, subtotal, delivery, count, total: subtotal + delivery,
    addToCart, changeQty, removeFromCart, clearCart,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useShop = () => useContext(Ctx);
