import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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
})
