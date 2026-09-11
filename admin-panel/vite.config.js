import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        // Local npm run dev → localhost. Docker Dockerfile.dev → set VITE_API_PROXY=http://mongodb-api:8082
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:8082',
        changeOrigin: true,
      },
    },
  },
});
