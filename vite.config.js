import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base public path when served in both development and production
  base: '/',
  root: 'app', // Set 'app' as the root directory

  // Configure the server
  server: {
    port: 3000,
    open: true, // Auto-open the browser
    hmr: true,  // Enable hot module replacement
  },

  // Build configuration
  build: {
    outDir: '../dist', // Output to project_root/dist
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@app': resolve(__dirname, 'app'),
    },
  },
  // Configure assets handling
  assetsInclude: ['**/*.glb', '**/*.json', '**/*.ogg', '**/*.png'],

  // Use ES modules
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },

  // Set esbuild target to use modern JS features
  esbuild: {
    target: 'esnext',
  },
});
