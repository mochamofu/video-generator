import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@timeline': path.resolve(__dirname, '../../remotion/src/timeline'),
    },
  },
  server: {
    port: 5173,
    fs: {
      // remotion/src/timeline/*.tsx をクライアントプロジェクト外から読み込むため許可
      allow: [path.resolve(__dirname, '..', '..')],
    },
    proxy: {
      '/api': 'http://127.0.0.1:8787',
      '/media': 'http://127.0.0.1:8787',
      '/thumbs': 'http://127.0.0.1:8787',
    },
  },
});
