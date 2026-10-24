import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The browser talks only to the Spring Boot backend.
// `/api` is proxied in dev so relative calls (`/api/...`) work too.
export default defineConfig({
  plugins: [react()],
  // The project keeps a single .env at the repository root; only VITE_* variables
  // are ever exposed to the browser bundle.
  envDir: '..',
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
