import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      // Proxy API routes to the local signup-service (default port 4001)
      '/auth': { target: 'http://localhost:4001', changeOrigin: true, secure: false },
      '/signup': { target: 'http://localhost:4001', changeOrigin: true, secure: false },
      '/signin': { target: 'http://localhost:4001', changeOrigin: true, secure: false },
      '/subscribe': { target: 'http://localhost:4001', changeOrigin: true, secure: false },
      '/10dlc': { target: 'http://localhost:4001', changeOrigin: true, secure: false },
      '/10dlc/register': { target: 'http://localhost:4001', changeOrigin: true, secure: false }
    }
  }
});
