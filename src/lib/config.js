// Backend selection. Keep 'local' until Supabase is connected (see src/lib/store.js and supabase/schema.sql).
export const SHOP_CONFIG = {
  backend: 'local',          // 'local' now; 'supabase' after integration
  adminPasscode: 'admin',    // LOCAL ONLY. Replaced by Supabase Auth later.
  supabase: {
    url: '',                 // https://xxxx.supabase.co
    anonKey: '',             // publishable/anon key only, never the service key
  },
};
