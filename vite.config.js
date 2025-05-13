import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  // Viktig: base må matche GitHub Pages URL (brukernavn.github.io/repo)
  base: '/rift/',
  root: 'app',

  server: {
    port: 3000,
    open: true,
    hmr: true,
  },

  build: {
    outDir: '../dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
    copyPublicDir: true,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@app': resolve(__dirname, 'app'),
    },
  },

  assetsInclude: ['**/*.glb', '**/*.json', '**/*.ogg', '**/*.png', '**/*.fbx', '**/*.gltf', '**/*.bin', '**/*.animation'],  plugins: [
    // We'll use a separate script for copying assets instead
  ],

  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },

  esbuild: {
    target: 'esnext',
  },
});
