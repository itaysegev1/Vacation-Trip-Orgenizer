import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { tripConfig } from './src/config/tripConfig';

const { branding, locale } = tripConfig;

// Build-time generator: rewrite index.html <title>/meta + <html lang/dir>
// from the config so the document chrome stays white-label in sync.
function brandingHtml() {
  return {
    name: 'branding-html-from-config',
    transformIndexHtml(html) {
      // Function replacers so '$' in branding values (e.g. "$1000 trip") is
      // treated literally, not as a regex backreference.
      return html
        .replace(/<html lang="[^"]*" dir="[^"]*">/, () => `<html lang="${locale.language}" dir="${locale.direction}">`)
        .replace(/<title>[^<]*<\/title>/, () => `<title>${branding.documentTitle}</title>`)
        .replace(/(<meta name="theme-color" content=")[^"]*(")/, (_m, p, s) => `${p}${branding.themeColor}${s}`)
        .replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/, (_m, p, s) => `${p}${branding.appName}${s}`)
        .replace(/(<meta name="description" content=")[^"]*(")/, (_m, p, s) => `${p}${branding.description}${s}`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    brandingHtml(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: branding.documentTitle,
        short_name: branding.shortName,
        description: branding.description,
        lang: locale.language,
        dir: locale.direction,
        theme_color: branding.themeColor,
        background_color: branding.backgroundColor,
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
