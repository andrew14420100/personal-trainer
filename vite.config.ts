import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Two builds:
//  - default ("production"): installable PWA for Cloudflare Pages (service worker, manifest, icons)
//  - "preview": single self-contained HTML file used for the interactive preview inside Claude
//    (no service worker, images inlined). It must never be confused with the published app.
export default defineConfig(({ mode }) => {
  const preview = mode === 'preview';
  return {
    define: {
      __PREVIEW__: JSON.stringify(preview),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    },
    build: preview
      ? { outDir: 'dist-preview', assetsInlineLimit: 100_000_000, cssCodeSplit: false }
      : { outDir: 'dist', sourcemap: false, assetsInlineLimit: 0 },
    plugins: [
      react(),
      preview
        ? viteSingleFile()
        : VitePWA({
            registerType: 'prompt',
            injectRegister: false,
            includeAssets: ['icons/*.png', 'icons/*.svg'],
            manifest: {
              id: '/',
              name: 'FORMA LAB',
              short_name: 'FORMA LAB',
              description: 'Allenamento personale — scheda di 4 giorni, registro, progressi.',
              lang: 'it',
              dir: 'ltr',
              start_url: '/',
              scope: '/',
              display: 'standalone',
              orientation: 'portrait',
              background_color: '#0a0a0b',
              theme_color: '#0a0a0b',
              categories: ['health', 'fitness', 'sports'],
              icons: [
                { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.ts',
            injectManifest: {
              globPatterns: ['**/*.{js,css,html,woff2,jpg,png,svg}'],
              globIgnores: ['**/*vietnamese*', '**/*cyrillic*', '**/*greek*', '**/*-italic-*', '**/*-standard-*'],
            },
          }),
    ],
    test: {
      environment: 'node',
      include: ['tests/unit/**/*.test.ts'],
    },
  };
});
