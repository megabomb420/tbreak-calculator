import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

/** GitHub Pages project site. Dev (`vite`) stays at `/`; production uses this. */
const PAGES_BASE = '/tbreak-calculator/';

export default defineConfig(({ mode }) => {
  const base = mode === 'production' ? PAGES_BASE : '/';
  return {
    base,
    plugins: [
      preact(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icons/*.png'],
        manifest: {
          name: 'T-Break Calculator',
          short_name: 'T-Break',
          description:
            'Private, on-device planner for tolerance breaks, cutting down, staying off, and drug-test basics.',
          lang: 'en',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          id: base,
          background_color: '#0A0D12',
          theme_color: '#0A0D12',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          navigateFallback: `${base}index.html`,
          cleanupOutdatedCaches: true,
          skipWaiting: false,
          clientsClaim: false,
        },
      }),
    ],
    server: {
      host: '0.0.0.0',
      port: 8080,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
  };
});
