import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react') || id.includes('@radix-ui/react-dialog') ||
                id.includes('@radix-ui/react-dropdown-menu') || id.includes('@radix-ui/react-popover')) {
              return 'ui';
            }
            if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('react/')) {
              return 'react';
            }
            if (id.includes('@react-oauth/google')) {
              return 'google';
            }
            if (id.includes('exceljs')) {
              return 'sheets';
            }
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})