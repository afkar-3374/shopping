# shopping

Electrosparkzz Shop: a premium storefront, cart, checkout and admin panel. Built with React and Vite. It stores data in the browser for now. The Supabase backend is prepared and will be connected later.

- **Live (planned):** https://shop.electrosparkzz.in
- **Git repo (planned):** https://github.com/afkar-3374/shopping (GitHub Pages, deployed by `.github/workflows/deploy.yml` on push to `main`)
- **Code:** this folder

## Run
```
cd ~/electrosparkzz/shopping
npm install
npm run dev        # http://localhost:5173
npm run build      # static output in dist/ (not kept in this folder)
```
Storefront: `#/`. Admin: `#/admin`. The local passcode is `admin`, set in `src/lib/config.js`.

## Layout
```
index.html, vite.config.js, package.json
public/favicon.svg
src/
  main.jsx, App.jsx (header, hash routing, toast), styles.css
  context/ShopContext.jsx   settings, products, cart, drawer state
  pages/Store.jsx           hero, search, categories, product grid, bag, checkout, confirmation
  pages/Admin.jsx           login, overview, orders, products, settings
  components/ui.jsx         icons, buttons, badges, fields, side sheet
  lib/config.js             backend choice and admin passcode
  lib/store.js              data layer: LocalStore (now), SupabaseStore (stub, same methods)
  lib/format.js             money, dates, order statuses
supabase/schema.sql         tables, row-level security, place_order function (not applied)
```

## Local mode limits (fix with Supabase)
- Data lives in one browser. Orders appear only in the admin on the same browser.
- The passcode is in the code. Supabase Auth replaces it.
- Stock is reduced in the browser. `place_order` in `schema.sql` does it on the server.
- Images are URLs you paste in.

## Connect Supabase later
1. Create the project and run `supabase/schema.sql` in the SQL editor.
2. Create an admin user in Supabase Auth.
3. Fill in `SupabaseStore` in `src/lib/store.js`. Orders go through `place_order`.
4. Set `backend: 'supabase'` and the URL and anon key in `src/lib/config.js`. Never put the service key in the browser.
