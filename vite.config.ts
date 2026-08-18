import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Keep the public site bootstrap small and cache heavy libraries/admin UI separately.
      chunkSizeWarningLimit: 2700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalized = id.replace(/\\/g, '/');
            if (normalized.includes('/node_modules/react/') || normalized.includes('/node_modules/react-dom/') || normalized.includes('/node_modules/react-router-dom/') || normalized.includes('/node_modules/scheduler/')) return 'react-vendor';
            if (normalized.includes('/node_modules/motion/') || normalized.includes('/node_modules/lucide-react/') || normalized.includes('/node_modules/@fortawesome/')) return 'ui-vendor';
            if (normalized.includes('/node_modules/@dnd-kit/')) return 'dnd-vendor';
          },
        },
      },
    },
  };
});
