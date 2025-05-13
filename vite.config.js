import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // 🌐 Base path: viktig for GitHub Pages og korrekt lasting av ressurser
  base: '/rift/',  // ⚠️ Endre til '/' hvis du bruker custom domain eller InfinityFree

  // 📁 Rotmappe for utvikling (bruker 'app' som hovedmappe)
  root: 'app',

  // 🧪 Lokalt utviklingsserver-oppsett
  server: {
    port: 3000,
    open: true, // Åpner automatisk i nettleser
    hmr: true,  // Hot Module Replacement
  },

  // 🛠️ Bygg-konfigurasjon
  build: {
    outDir: '../dist',  // Output havner i prosjektroten sin dist/
    assetsDir: 'assets',
    emptyOutDir: true,   // Tøm dist/ før bygg
    sourcemap: true,     // For debugging i prod
  },

  // 🔗 Importaliaser for enklere utvikling
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@app': resolve(__dirname, 'app'),
    },
  },

  // 🎮 Spesielle asset-typer som skal inkluderes
  assetsInclude: ['**/*.glb', '**/*.json', '**/*.ogg', '**/*.png'],

  // 📦 Optimalisering av avhengigheter
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },

  // 🎯 Bygg med moderne JavaScript
  esbuild: {
    target: 'esnext',
  },
});
