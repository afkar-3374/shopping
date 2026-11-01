# shopping — changes

## 2026-11-01
- Rebuilt as a React + Vite app with a premium black, navy and sky-blue theme. Storefront, cart, checkout, and admin (overview, orders, products, settings).
- Data layer: local storage now, with a Supabase adapter stub that has the same methods. `supabase/schema.sql` is ready but not applied.
- The first static version was removed from this folder. Build output (`dist/`) was moved out as well.
- Checked: `vite build` succeeds. Not yet tested in a browser: the new React pages and the checkout and admin flows.
- Added the GitHub Pages workflow and `public/CNAME` (shop.electrosparkzz.in). Committed locally; repo creation pending.
