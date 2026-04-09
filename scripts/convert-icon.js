import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

await sharp(join(__dirname, '../src/assets/vela.jpg'))
  .resize(512, 512)
  .png()
  .toFile(join(__dirname, '../public/vela-512.png'));

await sharp(join(__dirname, '../src/assets/vela.jpg'))
  .resize(192, 192)
  .png()
  .toFile(join(__dirname, '../public/vela-192.png'));

console.log('Icons generated successfully');
