import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal PNG generator using Node built-in zlib
function createPng(width, height, colorRgba) {
  // 1. Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // 2. IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // 3. Raw image data with filter byte (0) per row
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(height * rowSize);

  const [bgR, bgG, bgB, bgA] = colorRgba;
  const gold = [201, 162, 75, 255]; // #C9A24B
  const goldLight = [223, 192, 107, 255];
  const navyDark = [11, 31, 58, 255]; // #0B1F3A
  const navyDeep = [6, 18, 36, 255];

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter type None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background navy
      let r = bgR, g = bgG, b = bgB, a = bgA;

      // Rounded rect / circle base
      if (dist < radius) {
        r = navyDark[0];
        g = navyDark[1];
        b = navyDark[2];
        a = 255;

        // Calendar body (inner box)
        const inCalendar =
          x >= width * 0.23 &&
          x <= width * 0.77 &&
          y >= height * 0.28 &&
          y <= height * 0.78;

        if (inCalendar) {
          // Calendar border in Gold
          const onBorder =
            x <= width * 0.25 ||
            x >= width * 0.75 ||
            y <= height * 0.30 ||
            y >= height * 0.76;

          // Calendar header divider
          const onDivider = y >= height * 0.42 && y <= height * 0.44;

          if (onBorder || onDivider) {
            r = gold[0];
            g = gold[1];
            b = gold[2];
          } else {
            r = navyDeep[0];
            g = navyDeep[1];
            b = navyDeep[2];
          }

          // Central clock icon
          const clockDx = x - cx;
          const clockDy = y - (cy + height * 0.1);
          const clockDist = Math.sqrt(clockDx * clockDx + clockDy * clockDy);
          const clockR = width * 0.11;

          if (Math.abs(clockDist - clockR) <= width * 0.015) {
            r = gold[0];
            g = gold[1];
            b = gold[2];
          } else if (clockDist < clockR) {
            // Clock hands
            if (
              (Math.abs(clockDx) <= width * 0.012 && clockDy >= -clockR * 0.7 && clockDy <= 0) ||
              (Math.abs(clockDy) <= width * 0.012 && clockDx >= 0 && clockDx <= clockR * 0.6)
            ) {
              r = goldLight[0];
              g = goldLight[1];
              b = goldLight[2];
            }
          }
        }

        // Calendar ring pegs at top
        const peg1 = Math.abs(x - width * 0.35) <= width * 0.025 && y >= height * 0.22 && y <= height * 0.32;
        const peg2 = Math.abs(x - width * 0.65) <= width * 0.025 && y >= height * 0.22 && y <= height * 0.32;
        if (peg1 || peg2) {
          r = goldLight[0];
          g = goldLight[1];
          b = goldLight[2];
        }
      }

      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  // Deflate compressed data
  const compressed = zlib.deflateSync(raw);
  const idatChunk = createChunk('IDAT', compressed);

  // 4. IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([len, body, crcBuf]);
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 192x192 PNG
const png192 = createPng(192, 192, [11, 31, 58, 255]);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);

// 512x512 PNG
const png512 = createPng(512, 512, [11, 31, 58, 255]);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);

// 512x512 Maskable PNG
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), png512);

console.log('Iconos PNG generados exitosamente en public/icons/');
