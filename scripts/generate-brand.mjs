import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const logo = await readFile(new URL('../assets/brand/logo.svg', import.meta.url));
const symbol = await readFile(new URL('../assets/brand/symbol.svg', import.meta.url));
const output = (name) => fileURLToPath(new URL(`../assets/images/${name}.png`, import.meta.url));
await Promise.all([
  sharp(logo).resize(1024, 1024).png().toFile(output('icon')),
  sharp(symbol).resize(256, 256).png().toFile(output('favicon')),
  sharp(symbol).resize(256, 256).png().toFile(output('brand-mark')),
  sharp(symbol).resize(256, 256).png().toFile(output('splash')),
  sharp(symbol)
    .resize(640, 640)
    .extend({ top: 192, bottom: 192, left: 192, right: 192, background: '#00000000' })
    .png()
    .toFile(output('adaptive-icon')),
]);
process.stdout.write(
  'Mesa: icono, símbolo, favicon, splash y primer plano adaptativo regenerados.\n',
);
