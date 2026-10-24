import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const logo = await readFile(new URL('../assets/brand/logo.svg', import.meta.url));
const output = new URL('../assets/images/', import.meta.url);
await Promise.all([
  sharp(logo)
    .resize(1024, 1024)
    .png()
    .toFile(new URL('icon.png', output).pathname.replace(/^\/([A-Z]:)/, '$1')),
  sharp(logo)
    .resize(256, 256)
    .png()
    .toFile(new URL('favicon.png', output).pathname.replace(/^\/([A-Z]:)/, '$1')),
  sharp(logo)
    .resize(512, 512)
    .extend({ top: 256, bottom: 256, left: 256, right: 256, background: '#F6F8F3' })
    .png()
    .toFile(new URL('adaptive-icon.png', output).pathname.replace(/^\/([A-Z]:)/, '$1')),
  sharp(logo)
    .resize(256, 256)
    .extend({ top: 256, bottom: 256, left: 256, right: 256, background: '#F6F8F3' })
    .png()
    .toFile(new URL('splash.png', output).pathname.replace(/^\/([A-Z]:)/, '$1')),
]);
