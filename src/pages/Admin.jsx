import { useCallback, useEffect, useMemo, useState } from 'react';
import { store } from '../lib/store.js';
import { money, dateTime, STATUSES, STATUS_LABEL } from '../lib/format.js';
import { useShop } from '../context/ShopContext.jsx';
import { Badge, Button, Drawer, Field, Icon } from '../components/ui.jsx';

export default function Admin() {
  const [auth, setAuth] = useState('checking'); // checking | out | in
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    store.isAdmin().then((ok) => setAuth(ok ? 'in' : 'out')).catch(() => setAuth('out'));
  }, []);

  if (auth === 'checking') return <div className="page-msg"><div className="spinner" /></div>;
  if (auth === 'out') return <Login onIn={() => setAuth('in')} />;
  return <Dashboard tab={tab} setTab={setTab} onOut={() => setAuth('out')} />;
}

function Login({ onIn }) {
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await store.login(pass); onIn(); }
    catch (e2) { setErr(e2.message); setBusy(false); }
  };
  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark lg">S</div>
        <h1>Admin sign in</h1>
        <p className="muted">Manage products, orders and settings.</p>
        <Field label="Passcode">
          <input type="password" autoComplete="current-password" autoFocus value={pass} onChange={(e) => setPass(e.target.value)} />
        </Field>
        {err && <p className="form-error" role="alert">{err}</p>}
        <Button type="submit" variant="primary" size="lg" block disabled={busy || !pass}>Sign in</Button>
        <p className="fine">Local mode. Supabase Auth replaces this passcode later.</p>
      </form>
    </div>
  );
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'orders', label: 'Orders', icon: 'bag' },
  { id: 'products', label: 'Products', icon: 'box' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
];

function Dashboard({ tab, setTab, onOut }) {
  const { settings, refresh, notify } = useShop();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  const reload = useCallback(async () => {
    const [o, p] = await Promise.all([store.listOrders(), store.listProducts()]);
    setOrders(o); setProducts(p);
    await refresh();
  }, [refresh]);

  useEffect(() => { reload().catch((e) => notify(e.message, 'warn')); }, [reload, notify]);

  const logout = async () => { await store.logout(); onOut(); };

  return (
    <div className="admin">
      <aside className="side">
        <div className="side-brand"><div className="brand-mark">S</div><span>Admin</span></div>
        <nav>
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} /> {t.label}
              {t.id === 'orders' && orders.some((o) => o.status === 'new') && <span className="pill">{orders.filter((o) => o.status === 'new').length}</span>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <a href="#/" className="link"><Icon name="arrow" size={16} /> View storefront</a>
          <button className="link" onClick={logout}><Icon name="logout" size={16} /> Sign out</button>
        </div>
      </aside>

      <main className="admin-main">
        <nav className="admin-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
        {tab === 'overview' && <Overview orders={orders} products={products} cur={settings?.currency} />}
        {tab === 'orders' && <Orders orders={orders} cur={settings?.currency} reload={reload} />}
        {tab === 'products' && <Products products={products} cur={settings?.currency} reload={reload} />}
        {tab === 'settings' && settings && <SettingsForm settings={settings} reload={reload} />}
      </main>
    </div>
  );
}

function Overview({ orders, products, cur }) {
  const revenue = orders.filter((o) => o.status !== 'cancelled').reduce((n, o) => n + o.total, 0);
  const open = orders.filter((o) => ['new', 'confirmed', 'packed'].includes(o.status)).length;
  const low = products.filter((p) => p.active && p.stock <= 3);
  return (
    <>
      <h1 className="page-title">Overview</h1>
      <div className="kpis">
        <Kpi label="Revenue" value={money(revenue, cur)} />
        <Kpi label="Orders" value={orders.length} />
        <Kpi label="Open orders" value={open} accent />
        <Kpi label="Products" value={products.length} />
      </div>
      <div className="panel">
        <h2>Low stock</h2>
        {low.length ? (
          <ul className="simple">
            {low.map((p) => <li key={p.id}><span>{p.name}</span><Badge tone={p.stock ? 'warn' : 'bad'}>{p.stock ? `${p.stock} left` : 'Sold out'}</Badge></li>)}
          </ul>
        ) : <p className="muted">Everything is well stocked.</p>}
      </div>
      <div className="panel">
        <h2>Recent orders</h2>
        {orders.length ? (
          <ul className="simple">
            {orders.slice(0, 5).map((o) => <li key={o.id}><span>{o.number} · {o.customer.name}</span><span className="muted">{money(o.total, cur)}</span></li>)}
          </ul>
        ) : <p className="muted">No orders yet. They appear here as customers check out.</p>}
      </div>
    </>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div className={`kpi ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const TONE = { new: 'info', confirmed: 'info', packed: 'warn', delivered: 'ok', cancelled: 'bad' };

function Orders({ orders, cur, reload }) {
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const { notify } = useShop();
  const list = orders.filter((o) => filter === 'all' || o.status === filter);
  const setStatus = async (id, status) => {
    try { await store.updateOrderStatus(id, status); notify(`Order marked ${STATUS_LABEL[status].toLowerCase()}`); await reload(); }
    catch (e) { notify(e.message, 'warn'); }
  };
  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Orders</h1>
        <div className="chips">
          {['all', ...STATUSES].map((s) => (
            <button key={s} className={`chip ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? <div className="empty">No orders here.</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Placed</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="click" onClick={() => setOpenId(o.id)}>
                  <td><strong>{o.number}</strong></td>
                  <td className="muted">{dateTime(o.createdAt)}</td>
                  <td>{o.customer.name}<div className="muted small">{o.customer.phone}</div></td>
                  <td>{money(o.total, cur)}<div className="muted small">{o.items.reduce((n, i) => n + i.qty, 0)} items</div></td>
                  <td>{o.payment === 'upi' ? 'UPI' : 'Cash on delivery'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select className="status" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} aria-label="Order status">
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                    <div style={{ marginTop: 4 }}><Badge tone={TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Drawer open={!!openId} onClose={() => setOpenId(null)} title="Order details">
        {openId && <OrderDetail order={orders.find((o) => o.id === openId)} cur={cur} />}
      </Drawer>
    </>
  );
}

function OrderDetail({ order, cur }) {
  if (!order) return null;
  return (
    <div className="detail">
      <p className="muted">{dateTime(order.createdAt)}</p>
      <h3>{order.number}</h3>
      <h4>Customer</h4>
      <p>{order.customer.name}<br />{order.customer.phone}<br />{order.customer.address}</p>
      {order.notes && <><h4>Notes</h4><p>{order.notes}</p></>}
      <h4>Items</h4>
      <ul className="simple">
        {order.items.map((i) => <li key={i.productId}><span>{i.name} × {i.qty}</span><span>{money(i.price * i.qty, cur)}</span></li>)}
      </ul>
      <dl className="totals">
        <div><dt>Subtotal</dt><dd>{money(order.subtotal, cur)}</dd></div>
        <div><dt>Delivery</dt><dd>{order.delivery ? money(order.delivery, cur) : 'Free'}</dd></div>
        <div className="grand"><dt>Total</dt><dd>{money(order.total, cur)}</dd></div>
      </dl>
      <p className="muted">Payment: {order.payment === 'upi' ? 'UPI' : 'Cash on delivery'}</p>
    </div>
  );
}

const EMPTY_PRODUCT = { name: '', category: '', price: '', stock: '', emoji: '🛒', image: '', description: '', active: true };

function Products({ products, cur, reload }) {
  const { notify } = useShop();
  const [editing, setEditing] = useState(null); // null | product draft
  const [q, setQ] = useState('');
  const shown = products.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase()));

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try { await store.deleteProduct(p.id); notify('Product deleted'); await reload(); }
    catch (e) { notify(e.message, 'warn'); }
  };

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Products</h1>
        <div className="row">
          <div className="search small-search"><Icon name="search" size={16} />
            <input type="search" placeholder="Filter products" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter products" />
          </div>
          <Button variant="primary" onClick={() => setEditing({ ...EMPTY_PRODUCT })}>+ New product</Button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <td><span className="row"><span className="mini-emoji">{p.emoji}</span><span><strong>{p.name}</strong><div className="muted small clip">{p.description}</div></span></span></td>
                <td>{p.category}</td>
                <td>{money(p.price, cur)}</td>
                <td>{p.stock <= 0 ? <Badge tone="bad">0</Badge> : p.stock}</td>
                <td>{p.active ? <Badge tone="ok">Live</Badge> : <Badge>Hidden</Badge>}</td>
                <td className="actions">
                  <Button size="sm" onClick={() => setEditing({ ...p })}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(p)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <div className="empty">No products.</div>}
      </div>
      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit product' : 'New product'}>
        {editing && (
          <ProductForm
            key={editing.id || 'new'}
            initial={editing}
            onSaved={async () => { setEditing(null); notify('Product saved'); await reload(); }}
            onError={(m) => notify(m, 'warn')}
          />
        )}
      </Drawer>
    </>
  );
}

function ProductForm({ initial, onSaved, onError }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: k === 'active' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await store.saveProduct(f); await onSaved(); }
    catch (e2) { setErr(e2.message); setBusy(false); onError(e2.message); }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <Field label="Name" full><input required value={f.name} onChange={set('name')} /></Field>
      <Field label="Category"><input value={f.category} onChange={set('category')} placeholder="General" /></Field>
      <Field label="Price (₹)"><input type="number" min="0" step="0.01" required value={f.price} onChange={set('price')} /></Field>
      <Field label="Stock"><input type="number" min="0" step="1" required value={f.stock} onChange={set('stock')} /></Field>
      <Field label="Emoji"><input maxLength={4} value={f.emoji} onChange={set('emoji')} /></Field>
      <Field label="Image URL" full hint="Optional. Leave empty to show the emoji."><input type="url" value={f.image} onChange={set('image')} placeholder="https://…" /></Field>
      <Field label="Description" full><textarea rows="3" value={f.description} onChange={set('description')} /></Field>
      <label className="toggle full">
        <input type="checkbox" checked={f.active} onChange={set('active')} />
        <span className="track"><span /></span>
        <span>Show on storefront</span>
      </label>
      {err && <p className="form-error full" role="alert">{err}</p>}
      <div className="form-actions full">
        <Button type="submit" variant="primary" size="lg" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</Button>
      </div>
    </form>
  );
}

function SettingsForm({ settings, reload }) {
  const { notify } = useShop();
  const [f, setF] = useState(settings);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.shopName.trim()) return notify('Shop name is required.', 'warn');
    setBusy(true);
    try {
      await store.saveSettings({
        ...f,
        deliveryFee: Math.max(0, Number(f.deliveryFee) || 0),
        freeDeliveryAbove: Math.max(0, Number(f.freeDeliveryAbove) || 0),
      });
      notify('Settings saved'); await reload();
    } catch (err) { notify(err.message, 'warn'); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    if (!window.confirm('Reset products, orders and settings in this browser to the sample data?')) return;
    await store.resetDemo(); notify('Sample data restored'); await reload();
  };

  return (
    <>
      <h1 className="page-title">Settings</h1>
      <form className="panel form-grid" onSubmit={submit}>
        <Field label="Shop name"><input value={f.shopName} onChange={set('shopName')} /></Field>
        <Field label="Tagline"><input value={f.tagline} onChange={set('tagline')} /></Field>
        <Field label="Currency symbol"><input maxLength={4} value={f.currency} onChange={set('currency')} /></Field>
        <Field label="Phone"><input inputMode="tel" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="WhatsApp (with country code)"><input inputMode="tel" placeholder="+91…" value={f.whatsapp} onChange={set('whatsapp')} /></Field>
        <Field label="UPI ID" hint="Turns on UPI payment at checkout."><input placeholder="name@bank" value={f.upiId} onChange={set('upiId')} /></Field>
        <Field label="Address" full><textarea rows="2" value={f.address} onChange={set('address')} /></Field>
        <Field label="Delivery fee (₹)"><input type="number" min="0" value={f.deliveryFee} onChange={set('deliveryFee')} /></Field>
        <Field label="Free delivery above (₹)" hint="0 means never free."><input type="number" min="0" value={f.freeDeliveryAbove} onChange={set('freeDeliveryAbove')} /></Field>
        <div className="form-actions full">
          <Button type="submit" variant="primary" size="lg" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button>
        </div>
      </form>
      <div className="panel danger-zone">
        <div>
          <h3>Reset demo data</h3>
          <p className="muted">Restores the sample products, orders and settings in this browser.</p>
        </div>
        <Button variant="danger" onClick={reset}>Reset</Button>
      </div>
    </>
  );
}
