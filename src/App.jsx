import { useEffect, useState } from 'react';
import { ShopProvider, useShop } from './context/ShopContext.jsx';
import Store from './pages/Store.jsx';
import Admin from './pages/Admin.jsx';
import { Icon } from './components/ui.jsx';

// Hash routing (#/ and #/admin) so the site works on any static host without rewrites.
function useRoute() {
  const read = () => (window.location.hash.replace(/^#/, '') || '/');
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

function Header() {
  const { settings, count, setCartOpen } = useShop();
  return (
    <header className="topbar">
      <div className="wrap topbar-in">
        <a className="brand" href="#/">
          <span className="brand-mark">S</span>
          <span className="brand-name">{settings?.shopName || 'Shop'}</span>
        </a>
        <div className="top-actions">
          <a className="link-quiet" href="#/admin">Admin</a>
          <button className="bag-link" aria-label={`Bag, ${count} items`} onClick={() => setCartOpen(true)}>
            <Icon name="bag" /> <span className="pill">{count}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Shell() {
  const route = useRoute();
  if (route.startsWith('/admin')) return <Admin />;
  return (
    <>
      <Header />
      <main className="wrap">
        <Store />
      </main>
    </>
  );
}

export default function App() {
  return (
    <ShopProvider>
      <Shell />
      <ToastHost />
    </ShopProvider>
  );
}

function ToastHost() {
  const { toast } = useShop();
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.tone}`} key={toast.id} role="status">
      {toast.message}
    </div>
  );
}
