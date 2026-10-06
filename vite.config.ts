import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: true,
    manifest: true,
    minify: 'terser',
    modulePreload: { polyfill: false },
    sourcemap: false,
    terserOptions: {
      compress: {
        passes: 2,
      },
      format: {
        comments: false,
      },
    },
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/recharts/')) {
            return 'charts'
          }

          if (id.includes('/victory-vendor/') || id.includes('/d3-')) {
            return 'chart-vendor'
          }

          if (id.includes('/@supabase/')) {
            return 'supabase'
          }

          if (id.includes('/lucide-react/')) {
            return 'icons'
          }

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'react'
          }
        },
      },
    },
  },
})
