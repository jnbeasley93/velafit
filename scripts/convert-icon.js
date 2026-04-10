// One-time icon generator. Requires sharp:
//   npm install --no-save sharp
//   node scripts/convert-icon.js
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use fit: 'cover' to fill the entire square, flatten to remove any alpha
await sharp(join(__dirname, '../src/assets/vela.jpg'))
  .resize(512, 512, { fit: 'cover', position: 'centre' })
  .flatten({ background: { r: 250, g: 248, b: 244 } })
  .png()
  .toFile(join(__dirname, '../public/vela-512.png'));

await sharp(join(__dirname, '../src/assets/vela.jpg'))
  .resize(192, 192, { fit: 'cover', position: 'centre' })
  .flatten({ background: { r: 250, g: 248, b: 244 } })
  .png()
  .toFile(join(__dirname, '../public/vela-192.png'));

// Also generate a 180x180 specifically for iOS apple-touch-icon
await sharp(join(__dirname, '../src/assets/vela.jpg'))
  .resize(180, 180, { fit: 'cover', position: 'centre' })
  .flatten({ background: { r: 250, g: 248, b: 244 } })
  .png()
  .toFile(join(__dirname, '../public/apple-touch-icon.png'));

console.log('Icons generated successfully');
