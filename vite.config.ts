import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['lucide-react', 'react', 'react-dom'],
    force: true,
    esbuildOptions: {
      target: 'es2020'
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    target: 'es2020',
    minify: 'esbuild',
    // Enable source maps for production debugging
    sourcemap: false,
    // Optimize CSS
    cssCodeSplit: true,
    // Reduce bundle size
    reportCompressedSize: true,
    // Enable tree shaking
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          lucide: ['lucide-react'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  },
  server: {
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: false
    }
  },
  esbuild: {
    target: 'es2020'
  },
  // Enable CSS optimization
  css: {
    postcss: './postcss.config.js'
  }
});
