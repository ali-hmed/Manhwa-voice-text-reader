/**
 * Vite config — plain multi-entry build for Chrome Extension MV3.
 * Produces separate bundles for popup, content script, offscreen, and service worker.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Custom plugin to copy static assets after build
function copyAssetsPlugin() {
  return {
    name: 'copy-extension-assets',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');

      // Copy manifest.json
      copyFileSync(resolve(__dirname, 'manifest.json'), resolve(dist, 'manifest.json'));

      // Copy popup/index.html
      const popupDir = resolve(dist, 'popup');
      if (!existsSync(popupDir)) mkdirSync(popupDir, { recursive: true });
      copyFileSync(
        resolve(__dirname, 'src/popup/index.html'),
        resolve(popupDir, 'index.html')
      );

      // Copy offscreen/offscreen.html
      const offscreenDir = resolve(dist, 'offscreen');
      if (!existsSync(offscreenDir)) mkdirSync(offscreenDir, { recursive: true });
      copyFileSync(
        resolve(__dirname, 'src/offscreen/offscreen.html'),
        resolve(offscreenDir, 'offscreen.html')
      );

      // Copy extension icons
      const iconsDist = resolve(dist, 'icons');
      if (!existsSync(iconsDist)) mkdirSync(iconsDist, { recursive: true });
      for (const size of ['16', '48', '128']) {
        const iconSrc = resolve(__dirname, `public/icons/icon-${size}.png`);
        if (existsSync(iconSrc)) {
          copyFileSync(iconSrc, resolve(iconsDist, `icon-${size}.png`));
        }
      }

      // Copy tesseract assets
      const tesseractDist = resolve(dist, 'tesseract');
      if (!existsSync(tesseractDist)) mkdirSync(tesseractDist, { recursive: true });
      const langDir = resolve(tesseractDist, 'lang');
      if (!existsSync(langDir)) mkdirSync(langDir, { recursive: true });

      // Copy worker from node_modules/tesseract.js/dist
      const workerSrc = resolve(__dirname, 'node_modules/tesseract.js/dist/worker.min.js');
      if (existsSync(workerSrc)) {
        copyFileSync(workerSrc, resolve(tesseractDist, 'worker.min.js'));
        console.log('  Copied: worker.min.js');
      } else {
        console.warn('  WARNING: worker.min.js not found');
      }

      // Copy core WASM files from node_modules/tesseract.js-core
      const coreFiles = [
        'tesseract-core-simd.wasm.js',
        'tesseract-core-simd.wasm',
        'tesseract-core.wasm.js',
        'tesseract-core.wasm',
      ];
      const coreSrcDir = resolve(__dirname, 'node_modules/tesseract.js-core');

      for (const file of coreFiles) {
        const src = resolve(coreSrcDir, file);
        if (existsSync(src)) {
          copyFileSync(src, resolve(tesseractDist, file));
          console.log(`  Copied: ${file}`);
        }
      }

      // Copy eng.traineddata.gz
      const trainedDataGzSrc = resolve(__dirname, 'public/tesseract/lang/eng.traineddata.gz');
      if (existsSync(trainedDataGzSrc)) {
        copyFileSync(trainedDataGzSrc, resolve(langDir, 'eng.traineddata.gz'));
        console.log('  Copied: eng.traineddata.gz');
      } else {
        console.warn('  WARNING: eng.traineddata.gz not found in public/tesseract/lang/');
      }

      console.log('Extension assets copied to dist/');
    },
  };
}

export default defineConfig({
  plugins: [react(), copyAssetsPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        'popup/main': resolve(__dirname, 'src/popup/main.tsx'),
        'offscreen/ocr-worker': resolve(__dirname, 'src/offscreen/ocr-worker.ts'),
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'shared/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
