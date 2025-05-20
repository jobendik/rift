import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  // Important: base must match GitHub Pages URL (username.github.io/repo)
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
      '@assets': resolve(__dirname, 'assets'),
      '@config': resolve(__dirname, 'config'),
      '@components': resolve(__dirname, 'src/components'),
      '@controls': resolve(__dirname, 'src/controls'),
      '@core': resolve(__dirname, 'src/core'),
      '@effects': resolve(__dirname, 'src/effects'),
      '@entities': resolve(__dirname, 'src/entities'),
      '@ai': resolve(__dirname, 'src/ai'),
      '@physics': resolve(__dirname, 'src/physics'),
      '@weapons': resolve(__dirname, 'src/weapons'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@styles': resolve(__dirname, 'styles')
    },
  },

  assetsInclude: ['**/*.glb', '**/*.json', '**/*.ogg', '**/*.png', '**/*.fbx', '**/*.gltf', '**/*.bin', '**/*.animation'],

  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'assets/**/*',
          dest: 'assets'
        },
        {
          src: 'config/**/*',
          dest: 'config'
        }
      ]
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
