import path from "path"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  let target = 'http://localhost:3000';
  if (env.VITE_API_BASE_URL) {
    try {
      const url = new URL(env.VITE_API_BASE_URL);
      target = `${url.protocol}//${url.host}`;
    } catch {
      // fallback if invalid URL
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      include: ['react-player'],
    },
    preview: {
      host: true,      // bind 0.0.0.0
      port: 4173,
    },
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
        '/recordings': {
          target,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Core React runtime — always needed first
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'react-vendor';
            }

            // Routing
            if (id.includes('node_modules/react-router')) {
              return 'router';
            }

            // Data fetching & state
            if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
              return 'state';
            }

            // UI component library (Radix + Shadcn)
            if (id.includes('@radix-ui')) {
              return 'ui';
            }

            // Drag and drop
            if (id.includes('@dnd-kit')) {
              return 'dnd';
            }

            // Icon libraries — tree-shaken but still sizeable
            if (id.includes('lucide-react')) {
              return 'icons';
            }

            // Video / WebRTC — only used on LiveView
            if (id.includes('hls.js')) {
              return 'video';
            }

            // Admin pages — loaded only by admin users
            if (
              id.includes('/src/pages/AdminDashboardPage') ||
              id.includes('/src/pages/AddNVRPage') ||
              id.includes('/src/features/nvrs/') ||
              id.includes('/src/features/stations/')
            ) {
              return 'admin';
            }

            // Playback page — loaded only when viewing recordings
            if (
              id.includes('/src/pages/PlaybackPage') ||
              id.includes('/src/features/recordings/')
            ) {
              return 'playback';
            }

            // Date utilities
            if (id.includes('date-fns')) {
              return 'date-fns';
            }

            // Axios
            if (id.includes('axios')) {
              return 'axios';
            }
          },
        },
      },
      // Warn when any single chunk exceeds 500kB
      chunkSizeWarningLimit: 500,
    },
  };
});

