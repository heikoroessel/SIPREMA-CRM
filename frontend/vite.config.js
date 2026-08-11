import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Im lokalen Dev-Betrieb laeuft das Backend separat auf Port 3000
      '/api': 'http://localhost:3000'
    }
  }
});
