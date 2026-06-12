/**
 * Rasterize public/brand/equify-mark.svg → favicon PNGs (32 / 180 / 512).
 * Usage: node scripts/generate-brand-icons.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'public/brand/equify-mark.svg');
const svg = fs.readFileSync(svgPath);

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('Install sharp: npm install -D sharp');
    process.exit(1);
  }

  const sizes = [
    { name: 'favicon-32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icons/icon-192.png', size: 192 },
    { name: 'icons/icon-512.png', size: 512 },
  ];

  fs.mkdirSync(path.join(root, 'public/icons'), { recursive: true });

  for (const { name, size } of sizes) {
    const out = path.join(root, 'public', name);
    await sharp(svg, { density: 300 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(out);
    console.log('Wrote', out);
  }

  await sharp(svg, { density: 300 })
    .resize(1200, 630, {
      fit: 'contain',
      background: { r: 13, g: 27, b: 42, alpha: 1 },
    })
    .png()
    .toFile(path.join(root, 'public/og-equify.png'));
  console.log('Wrote public/og-equify.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
