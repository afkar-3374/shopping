import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works from any folder or domain (GitHub Pages, Supabase hosting, plain folder).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, host: true },
});
