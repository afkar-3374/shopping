// Data layer. Every method returns a Promise so the UI does not change when the backend does.
// LocalStore keeps data in this browser. SupabaseStore is a stub with the same methods.
import { SHOP_CONFIG } from './config.js';

const KEY = 'es-shop:v2';
const SESSION_KEY = 'es-shop:admin';

const uid = (p) =>
  p + '_' + (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));

const SEED = () => ({
  settings: {
    shopName: 'Electrosparkzz Shop',
    tagline: 'Everyday essentials, delivered with care.',
    currency: '₹',
    phone: '',
    whatsapp: '',
    upiId: '',
    address: '',
    deliveryFee: 40,
    freeDeliveryAbove: 499,
  },
  products: [
    { id: uid('p'), name: 'Sample Essential', category: 'Essentials', price: 199, stock: 20, emoji: '🛒', image: '', description: 'A sample product. Edit or replace it in the admin panel.', active: true },
    { id: uid('p'), name: 'Sample Gift Box', category: 'Gifts', price: 349, stock: 8, emoji: '🎁', image: '', description: 'Prices, stock and photos are all editable.', active: true },
    { id: uid('p'), name: 'Sample Gadget', category: 'Electronics', price: 99, stock: 0, emoji: '🔌', image: '', description: 'Shows as sold out when stock is zero.', active: true },
    { id: uid('p'), name: 'Sample Lamp', category: 'Electronics', price: 499, stock: 5, emoji: '💡', image: '', description: 'Hidden products do not appear on the storefront.', active: false },
  ],
  orders: [],
});

class LocalStore {
  kind = 'local';

  _load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* fall through to seed */ }
    const seed = SEED();
    this._save(seed);
    return seed;
  }
  _save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch { throw new Error('Could not save data in this browser (storage is full or blocked).'); }
  }
  _write(fn) {
    return new Promise((resolve, reject) => {
      try { const d = this._load(); const out = fn(d); this._save(d); resolve(out); }
      catch (e) { reject(e); }
    });
  }
  _read(fn) {
    return new Promise((resolve, reject) => {
      try { resolve(fn(this._load())); } catch (e) { reject(e); }
    });
  }

  listProducts() {
    return this._read((d) => d.products.slice().sort((a, b) => a.name.localeCompare(b.name)));
  }

  saveProduct(p) {
    return this._write((d) => {
      const item = {
        id: p.id || uid('p'),
        name: String(p.name || '').trim(),
        category: String(p.category || '').trim() || 'General',
        price: Math.max(0, Number(p.price) || 0),
        stock: Math.max(0, parseInt(p.stock, 10) || 0),
        emoji: String(p.emoji || '').trim().slice(0, 4) || '🛒',
        image: String(p.image || '').trim(),
        description: String(p.description || '').trim(),
        active: !!p.active,
      };
      if (!item.name) throw new Error('Product name is required.');
      const i = d.products.findIndex((x) => x.id === item.id);
      if (i >= 0) d.products[i] = item; else d.products.push(item);
      return item;
    });
  }

  deleteProduct(id) {
    return this._write((d) => { d.products = d.products.filter((p) => p.id !== id); return true; });
  }

  // Stock is checked and reduced here. With Supabase this runs inside the place_order database function.
  createOrder(input) {
    return this._write((d) => {
      if (!input.items?.length) throw new Error('Your cart is empty.');
      for (const line of input.items) {
        const p = d.products.find((x) => x.id === line.productId);
        if (!p || !p.active) throw new Error(`"${line.name}" is no longer available.`);
        if (p.stock < line.qty) throw new Error(`Only ${p.stock} of "${p.name}" left.`);
      }
      for (const line of input.items) {
        d.products.find((x) => x.id === line.productId).stock -= line.qty;
      }
      const number = 'ES' + String(d.orders.length + 1001).padStart(4, '0');
      const order = {
        id: uid('o'),
        number,
        status: 'new',
        createdAt: new Date().toISOString(),
        customer: input.customer,
        items: input.items,
        subtotal: input.subtotal,
        delivery: input.delivery,
        total: input.total,
        payment: input.payment,
        notes: input.notes || '',
      };
      d.orders.unshift(order);
      return order;
    });
  }

  listOrders() { return this._read((d) => d.orders.slice()); }

  updateOrderStatus(id, status) {
    return this._write((d) => {
      const o = d.orders.find((x) => x.id === id);
      if (!o) throw new Error('Order not found.');
      o.status = status;
      return o;
    });
  }

  getSettings() { return this._read((d) => ({ ...d.settings })); }
  saveSettings(s) { return this._write((d) => { d.settings = { ...d.settings, ...s }; return { ...d.settings }; }); }
  resetDemo() {
    try { this._save(SEED()); return Promise.resolve(true); } catch (e) { return Promise.reject(e); }
  }

  // Local admin session: passcode from config, remembered for this browser tab only.
  login(passcode) {
    if (passcode === SHOP_CONFIG.adminPasscode) {
      sessionStorage.setItem(SESSION_KEY, '1');
      return Promise.resolve(true);
    }
    return Promise.reject(new Error('Wrong passcode.'));
  }
  logout() { sessionStorage.removeItem(SESSION_KEY); return Promise.resolve(true); }
  isAdmin() { return Promise.resolve(sessionStorage.getItem(SESSION_KEY) === '1'); }
}

class SupabaseStore {
  kind = 'supabase';
  _todo() {
    return Promise.reject(new Error('Supabase is not connected yet. Keep backend: "local" in src/lib/config.js for now.'));
  }
  listProducts() { return this._todo(); }
  saveProduct() { return this._todo(); }
  deleteProduct() { return this._todo(); }
  createOrder() { return this._todo(); }
  listOrders() { return this._todo(); }
  updateOrderStatus() { return this._todo(); }
  getSettings() { return this._todo(); }
  saveSettings() { return this._todo(); }
  resetDemo() { return this._todo(); }
  login() { return this._todo(); }
  logout() { return this._todo(); }
  isAdmin() { return Promise.resolve(false); }
}

export const store = SHOP_CONFIG.backend === 'supabase' ? new SupabaseStore() : new LocalStore();
