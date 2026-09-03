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

function paintRowHoneycomb(rgba, w, sizes, originX, originY, pitch) {
  const maxS = Math.max(...sizes);
  const cellW = pitch * Math.sqrt(3) / 2;
  const rad = pitch * 0.42;
  sizes.forEach((nw, row) => {
    const start = Math.floor((maxS - nw) / 2);
    for (let i = 0; i < nw; i++) {
      const col = start + i;
      const x = originX + col * cellW + ((row % 2 === 1) ? cellW / 2 : 0);
      const y = originY + row * pitch;
      disk(rgba, w, x, y, rad, 232, 226, 214);
    }
  });
}

function hexPixel(q, r, ox, oy, pitch) {
  return {
    x: ox + pitch * (q + r / 2),
    y: oy + pitch * (Math.sqrt(3) / 2) * r
  };
}

function paintBalloon(rgba, w, x, y, rad, rgb) {
  disk(rgba, w, x, y, rad, rgb[0], rgb[1], rgb[2]);
  // white glint (upper-left) + gold emblem — detector must still read the face
  disk(rgba, w, x - rad * 0.28, y - rad * 0.30, rad * 0.18, 250, 248, 240);
  disk(rgba, w, x, y + rad * 0.08, rad * 0.16, 210, 175, 70);
}

function paintHexPiece(rgba, w, cells, ox, oy, pitch, rgb) {
  const rad = pitch * 0.42;
  cells.forEach(({ dq, dr }) => {
    const p = hexPixel(dq, dr, ox, oy, pitch);
    paintBalloon(rgba, w, p.x, p.y, rad, rgb);
  });
}

function paintWicker(rgba, w, cx, cy, rw, rh) {
  for (let y = cy - rh; y <= cy + rh; y++) {
    for (let x = cx - rw; x <= cx + rw; x++) {
      const nx = (x - cx) / rw, ny = (y - cy) / rh;
      if (nx * nx + ny * ny > 1) continue;
      const weave = ((x + y) % 7 < 3) ? 1 : 0;
      const r = 148 + weave * 18;
      const g = 98 + weave * 10;
      const b = 52 + weave * 6;
      setPixel(rgba, w, x, y, r, g, b, 255);
    }
  }
}

function paintCoins(rgba, w, cx, cy) {
  const spots = [[-18, -8], [8, -12], [-6, 10], [16, 6], [0, -2], [-14, 8]];
  spots.forEach(([dx, dy]) => disk(rgba, w, cx + dx, cy + dy, 9, 210, 168, 68));
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

// Carnival Level 75 — upright diamond 43 + 8 hex pieces over wicker/coins/filigree
const L75_ROWS = [3, 4, 5, 6, 7, 6, 5, 4, 3];
const L75_PIECES = [
  { id: 'red', rgb: [220, 45, 40], cells: [{ dq: 0, dr: 0 }, { dq: 0, dr: 1 }, { dq: 0, dr: 2 }, { dq: 1, dr: 0 }, { dq: 1, dr: 1 }, { dq: 1, dr: 2 }] },
  { id: 'yellow', rgb: [250, 210, 45], cells: [{ dq: 0, dr: 0 }, { dq: 0, dr: 1 }, { dq: 0, dr: 2 }, { dq: 1, dr: 0 }, { dq: 1, dr: 1 }] },
  { id: 'blue', rgb: [45, 125, 220], cells: [{ dq: 0, dr: 0 }, { dq: 0, dr: 1 }, { dq: 0, dr: 2 }, { dq: 1, dr: 1 }, { dq: 1, dr: 2 }, { dq: -1, dr: 2 }] },
  { id: 'orange', rgb: [245, 150, 40], cells: [{ dq: 0, dr: 0 }, { dq: 1, dr: 0 }, { dq: 2, dr: 0 }, { dq: 3, dr: 0 }] },
  { id: 'purple', rgb: [150, 90, 200], cells: [{ dq: 0, dr: 0 }, { dq: 0, dr: 1 }, { dq: 0, dr: 2 }, { dq: -1, dr: 1 }, { dq: -1, dr: 2 }, { dq: -1, dr: 3 }] },
  { id: 'teal', rgb: [50, 185, 180], cells: [{ dq: 0, dr: 0 }, { dq: 1, dr: 0 }, { dq: -1, dr: 0 }, { dq: 0, dr: 1 }, { dq: 0, dr: -1 }] },
  { id: 'pink', rgb: [240, 145, 175], cells: [{ dq: 0, dr: 0 }, { dq: 1, dr: 0 }, { dq: 1, dr: -1 }, { dq: 0, dr: -1 }, { dq: -1, dr: 0 }, { dq: -1, dr: 1 }] },
  { id: 'copper', rgb: [168, 88, 42], cells: [{ dq: 0, dr: 0 }, { dq: 0, dr: 1 }, { dq: 1, dr: 1 }, { dq: 1, dr: 2 }, { dq: 2, dr: 2 }] }
];
const L75_TRUTH = {
  board: 43,
  layout: 'game',
  rows: L75_ROWS,
  pieces: L75_PIECES.map(p => ({ id: p.id, size: p.cells.length, cells: p.cells })),
  trayTotal: L75_PIECES.reduce((s, p) => s + p.cells.length, 0)
};

{
  const rgba = Buffer.alloc(W * H * 4);
  // Ornate orange/brown hot-air balloon envelope
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = y / H;
      const r = Math.round(168 - 20 * t + ((x * 3 + y) % 11));
      const g = Math.round(88 - 10 * t + ((x + y * 2) % 7));
      const b = Math.round(42 - 6 * t);
      setPixel(rgba, W, x, y, r, g, b, 255);
    }
  }
  // Gold filigree showing through empty slots (must not become honeycomb or copper)
  for (let i = 0; i < 80; i++) {
    const cx = 80 + (i * 47) % (W - 160);
    const cy = 90 + (i * 31) % 620;
    disk(rgba, W, cx, cy, 7, 200, 155, 70);
  }
  // UI chrome bar
  for (let y = 0; y < 56; y++) {
    for (let x = 0; x < W; x++) setPixel(rgba, W, x, y, 248, 248, 252, 255);
  }
  for (let y = 12; y < 40; y++) {
    for (let x = 24; x < 160; x++) setPixel(rgba, W, x, y, 230, 190, 70, 255);
  }

  paintRowHoneycomb(rgba, W, L75_ROWS, 118, 120, 36);

  // Semi-transparent dark tray (not copper-orange envelope)
  for (let y = 760; y < 1240; y++) {
    for (let x = 20; x < W - 20; x++) {
      const o = (y * W + x) * 4;
      rgba[o] = Math.round(rgba[o] * 0.18 + 36);
      rgba[o + 1] = Math.round(rgba[o + 1] * 0.18 + 28);
      rgba[o + 2] = Math.round(rgba[o + 2] * 0.18 + 24);
    }
  }
  paintWicker(rgba, W, 360, 1040, 110, 90);
  paintCoins(rgba, W, 360, 1036);

  const slot = [
    [110, 820], [280, 820], [450, 820], [600, 830],
    [110, 1040], [270, 1020], [440, 1020], [600, 1040]
  ];
  L75_PIECES.forEach((p, i) => {
    paintHexPiece(rgba, W, p.cells, slot[i][0], slot[i][1], 26, p.rgb);
  });
  fs.writeFileSync(path.join(outDir, 'carnival-l75.png'), encodePNG(W, H, rgba));

  // Pixel-count the painted frame (do not trust a prose inventory).
  const pale = [];
  for (let y = 80; y < 720; y++) {
    for (let x = 40; x < W - 40; x++) {
      const o = (y * W + x) * 4;
      const r = rgba[o], g = rgba[o + 1], b = rgba[o + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const v = mx / 255, s = mx ? (mx - mn) / mx : 0;
      if (v > 0.78 && s < 0.18 && r > 200 && g > 190 && b > 175) pale.push([x, y]);
    }
  }
  const face = [];
  for (let y = 760; y < 1240; y++) {
    for (let x = 20; x < W - 20; x++) {
      const o = (y * W + x) * 4;
      const r = rgba[o], g = rgba[o + 1], b = rgba[o + 2];
      const id = require('../balloon-color.js').simpleColorId(r, g, b);
      if (id) face.push([x, y, id]);
    }
  }
  L75_TRUTH.pixelPale = pale.length;
  L75_TRUTH.pixelFaces = face.length;
  fs.writeFileSync(path.join(outDir, 'carnival-l75.json'), JSON.stringify(L75_TRUTH, null, 2));
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
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { L75_TRUTH, L75_PIECES, L75_ROWS };
}
