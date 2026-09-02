'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
  return png;
}

function setPixel(rgba, w, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w) return;
  const h = rgba.length / (w * 4);
  if (y >= h) return;
  const i = (y * w + x) * 4;
  rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
}

function fill(rgba, w, h, r, g, b) {
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = 255;
  }
}

function disk(rgba, w, cx, cy, rad, r, g, b) {
  const r2 = rad * rad;
  const x0 = Math.max(0, Math.floor(cx - rad));
  const x1 = Math.min(w - 1, Math.ceil(cx + rad));
  const y0 = Math.max(0, Math.floor(cy - rad));
  const h = rgba.length / (w * 4);
  const y1 = Math.min(h - 1, Math.ceil(cy + rad));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPixel(rgba, w, x, y, r, g, b, 255);
    }
  }
}

function colYShift(col, pitch, evenDown) {
  return evenDown ? ((col % 2 === 0) ? pitch / 2 : 0) : ((col % 2 === 1) ? pitch / 2 : 0);
}

function tallestAreOdd(sizes) {
  const maxH = Math.max(...sizes);
  let odd = 0, even = 0;
  sizes.forEach((h, i) => {
    if (h !== maxH) return;
    if (i % 2) odd++; else even++;
  });
  return odd > even;
}

function paintHoneycomb(rgba, w, sizes, originX, originY, pitch) {
  const maxS = Math.max(...sizes);
  const evenDown = tallestAreOdd(sizes);
  const ratio = Math.sqrt(3) / 2;
  const cellW = pitch * ratio;
  const rad = pitch * 0.42;
  sizes.forEach((h, col) => {
    const start = Math.floor((maxS - h) / 2);
    for (let i = 0; i < h; i++) {
      const row = start + i;
      const x = originX + col * cellW;
      const y = originY + row * pitch + colYShift(col, pitch, evenDown);
      disk(rgba, w, x, y, rad, 220, 210, 190);
    }
  });
}

function paintTray(rgba, w, clusters, originY) {
  const colors = [
    [220, 45, 40], [250, 210, 45], [45, 125, 220], [245, 150, 40],
    [150, 90, 200], [50, 185, 180], [240, 145, 175], [165, 95, 50]
  ];
  clusters.forEach((n, i) => {
    const color = colors[i % colors.length];
    const cx = 80 + (i % 4) * 140;
    const cy = originY + Math.floor(i / 4) * 90;
    for (let k = 0; k < n; k++) {
      const ang = (k / Math.max(1, n)) * Math.PI * 2;
      const x = cx + Math.cos(ang) * 22;
      const y = cy + Math.sin(ang) * 18;
      disk(rgba, w, x, y, 14, color[0], color[1], color[2]);
    }
  });
}

const outDir = path.join(__dirname, 'fixtures');
fs.mkdirSync(outDir, { recursive: true });

const W = 720, H = 1280;

// L65-like 43-cell screenshot
{
  const rgba = Buffer.alloc(W * H * 4);
  fill(rgba, W, H, 18, 28, 48);
  // sky-ish top that should NOT be read as honeycomb
  for (let y = 0; y < 220; y++) {
    for (let x = 0; x < W; x++) setPixel(rgba, W, x, y, 90, 140, 200, 255);
  }
  paintHoneycomb(rgba, W, [1, 4, 7, 6, 7, 6, 7, 4, 1], 90, 280, 38);
  paintTray(rgba, W, [8, 7, 6, 6, 5, 5, 6], 820);
  fs.writeFileSync(path.join(outDir, 'l65-synthetic.png'), encodePNG(W, H, rgba));
}

// L101/L103-like 91-cell screenshot
{
  const rgba = Buffer.alloc(W * H * 4);
  fill(rgba, W, H, 18, 28, 48);
  for (let y = 0; y < 180; y++) {
    for (let x = 0; x < W; x++) setPixel(rgba, W, x, y, 90, 140, 200, 255);
  }
  paintHoneycomb(rgba, W, [1, 4, 7, 10, 9, 10, 9, 10, 9, 10, 7, 4, 1], 40, 220, 28);
  paintTray(rgba, W, [12, 11, 10, 10, 9, 9, 10, 10, 10], 780);
  fs.writeFileSync(path.join(outDir, 'l103-synthetic.png'), encodePNG(W, H, rgba));
}

// Junk / unreadable photo (sky + noise, no honeycomb, no tray)
{
  const rgba = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = y / H;
      const r = Math.round(110 + 40 * t + (x * 13 + y * 7) % 17);
      const g = Math.round(150 + 20 * t + (x * 5 + y * 11) % 13);
      const b = Math.round(210 - 30 * t + (x * 3 + y) % 11);
      setPixel(rgba, W, x, y, r, g, b, 255);
    }
  }
  fs.writeFileSync(path.join(outDir, 'junk-sky.png'), encodePNG(W, H, rgba));
}

console.log('wrote fixtures to', outDir);
