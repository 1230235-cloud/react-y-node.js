import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Destino del backend. Se puede cambiar con VITE_API_TARGET sin tocar el codigo.
const API_TARGET = process.env.VITE_API_TARGET ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // El proxy hace que el navegador solo vea el origen de Vite
      // (localhost:5173). Asi la cookie de sesion, que es SameSite=Strict,
      // sigue siendo "same-site" y no hace falta ninguna cabecera CORS.
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/uploads': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});