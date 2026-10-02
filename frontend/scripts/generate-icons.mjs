// Generates the PWA icons (neutral design: 4 rising bars, no logo) as PNG files
// without any third-party dependency. Run with: npm run icons
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BG = [17, 24, 39];
const BARS = [
  [34, 197, 94],
  [132, 204, 22],
  [245, 158, 11],
  [239, 68, 68],
];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, { maskable = false } = {}) {
  const radius = maskable ? 0 : size * 0.2;
  // Maskable icons must keep content inside the central 80% safe zone.
  const pad = size * (maskable ? 0.25 : 0.18);
  const inner = size - 2 * pad;
  const gap = inner * 0.06;
  const barW = (inner - 3 * gap) / 4;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      let px = [0, 0, 0, 0];
      // rounded square background
      const dx = Math.max(radius - x, x - (size - 1 - radius), 0);
      const dy = Math.max(radius - y, y - (size - 1 - radius), 0);
      if (dx * dx + dy * dy <= radius * radius) px = [...BG, 255];
      for (let i = 0; i < 4; i++) {
        const x0 = pad + i * (barW + gap);
        const h = inner * (0.3 + 0.7 * ((i + 1) / 4));
        if (x >= x0 && x < x0 + barW && y >= pad + inner - h && y < pad + inner) px = [...BARS[i], 255];
      }
      row.set(px, 1 + x * 4);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync("public/pwa-192x192.png", png(192));
writeFileSync("public/pwa-512x512.png", png(512));
writeFileSync("public/maskable-512x512.png", png(512, { maskable: true }));
writeFileSync("public/apple-touch-icon.png", png(180, { maskable: true }));
console.log("Icons written to public/");
