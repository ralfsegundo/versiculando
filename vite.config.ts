import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  build: {
    // Aumenta o limite do aviso para 600kb
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — raramente muda, fica em cache do browser
          'vendor-react': ['react', 'react-dom'],
          // Supabase — biblioteca grande, separada
          'vendor-supabase': ['@supabase/supabase-js'],
          // Animações — motion é pesado
          'vendor-motion': ['motion'],
          // Ícones — lucide é grande
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
});
