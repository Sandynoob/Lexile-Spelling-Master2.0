import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'www',
    emptyOutDir: true,
    target: 'chrome60', // Better compatibility for older Android WebViews
    cssTarget: 'chrome60',
  },
});
