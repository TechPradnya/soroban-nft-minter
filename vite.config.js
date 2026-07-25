import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  define: {
    // stellar-sdk expects a `global` in some browser contexts
    global: 'globalThis',
  },
});
