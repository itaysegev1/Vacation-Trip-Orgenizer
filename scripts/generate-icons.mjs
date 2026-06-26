// Rasterizes public/icon.svg into the PNG sizes the PWA manifest needs.
// Run with: npm run gen-icons
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const svg = readFileSync(new URL('public/icon.svg', root));
mkdirSync(fileURLToPath(new URL('public/icons', root)), { recursive: true });

const out = (name) => fileURLToPath(new URL(`public/icons/${name}`, root));

const targets = [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [512, 'icon-512-maskable.png'],
  [180, 'apple-touch-icon.png'],
];

for (const [size, name] of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(out(name));
  console.log('✓', name);
}
console.log('All icons generated → public/icons/');
