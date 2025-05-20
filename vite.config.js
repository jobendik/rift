import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  // Important: base must match GitHub Pages URL (username.github.io/repo)
  // Commented out for local development
  // base: '/rift/',
  base: '/',
  // Remove app as root since it doesn't exist
  
  server: {
    port: 3000,
    open: true,
    hmr: true,
  },  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
    copyPublicDir: true,
  },
  
  publicDir: 'public',

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@assets': resolve(__dirname, 'public/assets'),
      '@config': resolve(__dirname, 'public/config'),
      '@components': resolve(__dirname, 'src/components'),
      '@controls': resolve(__dirname, 'src/controls'),
      '@core': resolve(__dirname, 'src/core'),
      '@effects': resolve(__dirname, 'src/effects'),
      '@entities': resolve(__dirname, 'src/entities'),
      '@ai': resolve(__dirname, 'src/ai'),
      '@physics': resolve(__dirname, 'src/physics'),
      '@weapons': resolve(__dirname, 'src/weapons'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@styles': resolve(__dirname, 'public/styles')
    },
  },
  assetsInclude: ['**/*.glb', '**/*.json', '**/*.ogg', '**/*.png', '**/*.fbx', '**/*.gltf', '**/*.bin', '**/*.animation'],  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: './public/assets/',
          dest: './assets'
        }
      ],
      verbose: true
    })
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
