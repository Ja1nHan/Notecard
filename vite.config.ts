import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },

  build: {
    // Tauri 内嵌 WebView 支持现代 ES，无需降级
    target: ['es2021', 'chrome105', 'safari15'],
    minify: 'esbuild',
    // 关闭 sourcemap，减小产物体积
    sourcemap: false,
    rollupOptions: {
      output: {
        // 拆分大依赖，利用浏览器缓存
        manualChunks: {
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          lucide: ['lucide-react'],
        },
      },
    },
  },
}));
