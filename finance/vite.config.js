import { defineConfig } from 'vite';
import path from "path";
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // backend URL
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'google-oauth': ['@react-oauth/google'],
        },
      },
    },
  },
});
