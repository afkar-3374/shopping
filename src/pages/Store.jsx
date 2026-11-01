import { useMemo, useState } from 'react';
import { useShop } from '../context/ShopContext.jsx';
import { store } from '../lib/store.js';
import { money } from '../lib/format.js';
import { Badge, Button, Drawer, Field, Icon } from '../components/ui.jsx';

export default function Store() {
  const shop = useShop();
  const { settings, products, loading, error, lines, subtotal, delivery, total, count, addToCart, cartOpen, setCartOpen } = shop;
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placed, setPlaced] = useState(null);

  const active = useMemo(() => products.filter((p) => p.active), [products]);
  const categories = useMemo(() => ['All', ...new Set(active.map((p) => p.category))], [active]);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return active.filter((p) =>
      (cat === 'All' || p.category === cat) &&
      (!term || `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(term)));
  }, [active, cat, q]);

  const cur = settings?.currency || '₹';

  if (loading) return <Loading />;
  if (error) return <div className="page-msg"><h2>The shop could not load</h2><p>{error}</p></div>;

  return (
    <>
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <p className="eyebrow">{settings.tagline}</p>
        <h1>Shop the <span className="grad">essentials</span></h1>
        <p className="lead">Curated picks, clear prices and delivery to your door. Pay on delivery or by UPI.</p>
        <div className="search">
          <Icon name="search" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
          />
        </div>
      </section>

      <div className="toolbar">
        <div className="chips" role="tablist" aria-label="Categories">
          {categories.map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <span className="muted count-text">{list.length} {list.length === 1 ? 'product' : 'products'}</span>
      </div>

      {list.length === 0 ? (
        <div className="empty">No products match your search.</div>
      ) : (
        <div className="grid">
          {list.map((p) => {
            const inBag = lines.find((l) => l.productId === p.id)?.qty || 0;
            const left = p.stock - inBag;
            let badge = null;
            if (p.stock <= 0) badge = <Badge tone="bad">Sold out</Badge>;
            else if (left <= 0) badge = <Badge tone="warn">All in your bag</Badge>;
            else if (left <= 3) badge = <Badge tone="warn">Only {left} left</Badge>;
            return (
              <article className="product" key={p.id}>
                <div className="thumb">
                  {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <span className="emoji">{p.emoji}</span>}
                </div>
                <div className="product-body">
                  <div className="row between">
                    <span className="cat">{p.category}</span>
                    {badge}
                  </div>
                  <h3>{p.name}</h3>
                  {p.description && <p className="desc">{p.description}</p>}
                  <div className="row between foot-row">
                    <span className="price">{money(p.price, cur)}</span>
                    <Button variant="primary" size="sm" disabled={left <= 0} onClick={() => addToCart(p.id)}>
                      {p.stock <= 0 ? 'Sold out' : 'Add'}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {count > 0 && (
        <button className="float-bag" onClick={() => setCartOpen(true)}>
          <Icon name="bag" /> View bag <span className="pill">{count}</span> <span className="float-total">{money(total, cur)}</span>
        </button>
      )}

      <Drawer open={cartOpen} onClose={() => setCartOpen(false)} title={`Your bag (${count})`}>
        <CartPanel
          cur={cur}
          onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
        />
      </Drawer>

      <Drawer open={checkoutOpen} onClose={() => !placed && setCheckoutOpen(false)} title={placed ? 'Order placed' : 'Checkout'}>
        {placed ? (
          <Confirmation order={placed} cur={cur} settings={settings} onDone={() => { setPlaced(null); setCheckoutOpen(false); }} />
        ) : (
          <Checkout cur={cur} settings={settings} onPlaced={setPlaced} />
        )}
      </Drawer>

      <footer className="footer">
        <div>
          <strong>{settings.shopName}</strong>
          <div className="muted">{settings.address}</div>
        </div>
        <div className="muted">
          {settings.phone && <div>Phone: <a href={`tel:${settings.phone}`}>{settings.phone}</a></div>}
          {settings.whatsapp && <div>WhatsApp: <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener">{settings.whatsapp}</a></div>}
          <div>Prices in INR. Payment is confirmed by the shop after you order.</div>
        </div>
      </footer>
    </>
  );
}

function CartPanel({ cur, onCheckout }) {
  const { lines, subtotal, delivery, total, changeQty, removeFromCart } = useShop();
  if (!lines.length) {
    return (
      <div className="empty-cart">
        <Icon name="bag" size={36} />
        <p>Your bag is empty.</p>
      </div>
    );
  }
  return (
    <>
      <ul className="lines">
        {lines.map((l) => (
          <li className="line" key={l.productId}>
            <span className="line-emoji">{l.product.emoji}</span>
            <div className="line-info">
              <strong>{l.product.name}</strong>
              <span className="muted">{money(l.product.price, cur)} each</span>
            </div>
            <div className="qty">
              <button aria-label="Decrease" onClick={() => changeQty(l.productId, -1)}><Icon name="minus" size={14} /></button>
              <span>{l.qty}</span>
              <button aria-label="Increase" onClick={() => changeQty(l.productId, 1)}><Icon name="plus" size={14} /></button>
            </div>
            <button className="remove" aria-label="Remove" onClick={() => removeFromCart(l.productId)}><Icon name="x" size={14} /></button>
          </li>
        ))}
      </ul>
      <Totals cur={cur} subtotal={subtotal} delivery={delivery} total={total} />
      <Button variant="primary" size="lg" block onClick={onCheckout}>Checkout <Icon name="arrow" /></Button>
    </>
  );
}

function Totals({ cur, subtotal, delivery, total }) {
  return (
    <dl className="totals">
      <div><dt>Subtotal</dt><dd>{money(subtotal, cur)}</dd></div>
      <div><dt>Delivery</dt><dd>{delivery ? money(delivery, cur) : 'Free'}</dd></div>
      <div className="grand"><dt>Total</dt><dd>{money(total, cur)}</dd></div>
    </dl>
  );
}

function Checkout({ cur, settings, onPlaced }) {
  const { lines, subtotal, delivery, total, clearCart, refresh, notify } = useShop();
  const [form, setForm] = useState({ name: '', phone: '', address: '', payment: 'cod', notes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) return setErr('Please fill in your name, phone and address.');
    if (!/^\+?[\d\s-]{7,}$/.test(form.phone.trim())) return setErr('Enter a valid phone number.');
    if (!lines.length) return setErr('Your bag is empty.');
    setBusy(true);
    try {
      const order = await store.createOrder({
        customer: { name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() },
        items: lines.map((l) => ({ productId: l.productId, name: l.product.name, price: l.product.price, qty: l.qty })),
        subtotal, delivery, total,
        payment: form.payment,
        notes: form.notes.trim(),
      });
      clearCart();
      await refresh();
      onPlaced(order);
    } catch (e2) {
      setErr(e2.message || 'Could not place the order.');
      setBusy(false);
    }
  };

  return (
    <form className="checkout" onSubmit={submit} noValidate>
      <Field label="Full name"><input autoComplete="name" value={form.name} onChange={set('name')} /></Field>
      <Field label="Phone"><input inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} /></Field>
      <Field label="Delivery address" full>
        <textarea rows="3" autoComplete="street-address" value={form.address} onChange={set('address')} />
      </Field>
      <Field label="Payment" full>
        <div className="pay-options">
          <label className={`pay ${form.payment === 'cod' ? 'on' : ''}`}>
            <input type="radio" name="pay" value="cod" checked={form.payment === 'cod'} onChange={set('payment')} />
            <span><strong>Cash on delivery</strong><small>Pay when your order arrives</small></span>
          </label>
          <label className={`pay ${form.payment === 'upi' ? 'on' : ''} ${settings.upiId ? '' : 'disabled'}`}>
            <input type="radio" name="pay" value="upi" disabled={!settings.upiId} checked={form.payment === 'upi'} onChange={set('payment')} />
            <span><strong>UPI</strong><small>{settings.upiId ? `Pay to ${settings.upiId}` : 'Not available yet'}</small></span>
          </label>
        </div>
      </Field>
      <Field label="Notes (optional)" full>
        <textarea rows="2" value={form.notes} onChange={set('notes')} />
      </Field>
      <Totals cur={cur} subtotal={subtotal} delivery={delivery} total={total} />
      {err && <p className="form-error" role="alert">{err}</p>}
      <Button type="submit" variant="primary" size="lg" block disabled={busy}>
        {busy ? 'Placing order…' : `Place order · ${money(total, cur)}`}
      </Button>
    </form>
  );
}

function Confirmation({ order, cur, settings, onDone }) {
  const wa = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I placed order ${order.number}`)}`
    : null;
  return (
    <div className="confirm">
      <div className="check-badge"><Icon name="check" size={28} /></div>
      <h3>Thank you, {order.customer.name.split(' ')[0]}!</h3>
      <p>Your order <strong>{order.number}</strong> is placed for <strong>{money(order.total, cur)}</strong>.</p>
      <p className="muted">
        {order.payment === 'upi'
          ? `Pay by UPI to ${settings.upiId} and keep the receipt.`
          : 'Pay in cash when your order is delivered.'}
      </p>
      {wa && <a className="btn btn-ghost btn-lg block" href={wa} target="_blank" rel="noopener">Message us on WhatsApp</a>}
      <Button variant="primary" size="lg" block onClick={onDone}>Continue shopping</Button>
    </div>
  );
}

function Loading() {
  return (
    <div className="page-msg">
      <div className="spinner" aria-hidden="true" />
      <p className="muted">Loading the shop…</p>
    </div>
  );
}
