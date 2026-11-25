import fs from 'node:fs';
import zlib from 'node:zlib';

function crc(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([length, body, sum]);
}

function png(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function draw(size, { background, seal, paper }) {
  const pixels = Buffer.alloc(size * size * 4);
  const center = (size - 1) / 2;
  const outer = size * 0.34;
  const ring = size * 0.27;
  const inner = size * 0.18;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.hypot(dx, dy);
      let color = background;
      if (background === null) color = [0, 0, 0, 0];
      if (distance < outer) color = seal;
      if (distance < ring && distance > inner) color = paper;
      if (distance <= inner) color = seal;
      const offset = (y * size + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }
  return pixels;
}

const ink = [28, 25, 21, 255];
const stamp = [196, 69, 45, 255];
const paper = [243, 238, 228, 255];
const clear = null;

fs.mkdirSync('assets/images', { recursive: true });
fs.writeFileSync('assets/images/icon.png', png(1024, 1024, draw(1024, { background: paper, seal: stamp, paper })));
fs.writeFileSync('assets/images/splash-icon.png', png(512, 512, draw(512, { background: paper, seal: stamp, paper })));
fs.writeFileSync('assets/images/favicon.png', png(64, 64, draw(64, { background: paper, seal: stamp, paper })));
fs.writeFileSync(
  'assets/images/android-icon-foreground.png',
  png(1024, 1024, draw(1024, { background: clear, seal: stamp, paper: ink })),
);
fs.writeFileSync(
  'assets/images/android-icon-monochrome.png',
  png(1024, 1024, draw(1024, { background: clear, seal: [255, 255, 255, 255], paper: [255, 255, 255, 0] })),
);
console.log('wrote stamp icons');
