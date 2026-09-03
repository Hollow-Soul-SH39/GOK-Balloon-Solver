'use strict';
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FIX = path.join(__dirname, 'fixtures');
const PORT = 8765;

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  return 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      let rel = url === '/' ? '/index.html' : url;
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

async function loadPuppeteer() {
  const alt = '/tmp/gok-test-mods/node_modules/puppeteer-core';
  if (fs.existsSync(path.join(alt, 'package.json'))) return require(alt);
  await new Promise((resolve, reject) => {
    const npm = spawn('npm', ['install', '--prefix', '/tmp/gok-test-mods', 'puppeteer-core@24'], {
      stdio: 'inherit'
    });
    npm.on('exit', code => code === 0 ? resolve() : reject(new Error('npm install failed')));
  });
  return require(alt);
}

async function wait(page, fn, timeout) {
  await page.waitForFunction(fn, { timeout: timeout || 15000 });
}

(async () => {
  require('./generate-fixtures.js');
  const server = await startServer();
  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome-stable',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));

  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'networkidle0' });

  const version = await page.$eval('#scanHint', el => el.textContent);
  assert.ok(version.includes('v107'), 'expected v107 copy, got ' + version);
  assert.ok(version.toLowerCase().includes('solves immediately') || version.toLowerCase().includes('clean scan'), version);

  const colors = await page.evaluate(() => {
    const c = window.GokBalloonColor;
    return {
      copper: c.simpleColorId(168, 88, 42),
      wood: c.simpleColorId(150, 108, 62),
      green: c.simpleColorId(48, 168, 72),
      silver: c.simpleColorId(176, 180, 186),
      yellow: c.simpleColorId(250, 210, 45),
      coins: c.simpleColorId(210, 170, 70),
      l65: window.GokBoardGate.classifyKnownBoard({ honeyCount: 43, honeyCols: 9, trayTotal: 43 }),
      l101: window.GokBoardGate.classifyKnownBoard({ honeyCount: 91, honeyCols: 13, trayTotal: 91 }),
      l103: window.GokBoardGate.classifyKnownBoard({ honeyCount: 96, honeyCols: 14.7, honeyRows: 11, trayTotal: 91 }),
      l103n125: window.GokBoardGate.classifyKnownBoard({ honeyCount: 125, honeyCols: 14.0, trayTotal: 91 }),
      l75shape: window.GokBoardGate.classifyHoneyShape({ honeyCount: 43, honeyCols: 7.1, honeyRows: 9.0, trayTotal: 43 })
    };
  });
  assert.strictEqual(colors.copper, 'copper');
  assert.strictEqual(colors.wood, null);
  assert.strictEqual(colors.green, 'green');
  assert.strictEqual(colors.silver, 'silver');
  assert.strictEqual(colors.yellow, 'yellow');
  assert.strictEqual(colors.coins, null);
  assert.strictEqual(colors.l65, 43);
  assert.strictEqual(colors.l101, 91);
  assert.strictEqual(colors.l103, 91);
  assert.strictEqual(colors.l103n125, 91);
  assert.ok(colors.l75shape && colors.l75shape.size === 43 && colors.l75shape.shape === 'game', JSON.stringify(colors.l75shape));

  const editorOn = await page.$eval('#pieceCanvas', el => !!el);
  assert.ok(editorOn, 'piece editor canvas missing');
  const solveBtn = await page.$eval('#solveBtn', el => el.textContent);
  assert.ok(/solve/i.test(solveBtn), 'Solve button should remain for editor re-solve');

  // Junk photo: visible error, no invented board, no solution
  const boardBefore = await page.evaluate(() => BOARD_SIZE);
  const input = await page.$('#fileInput');
  await input.uploadFile(path.join(FIX, 'junk-sky.png'));
  await wait(page, () => {
    const banner = document.getElementById('scanError');
    const status = document.getElementById('status');
    return (banner && banner.classList.contains('show')) || (status && status.classList.contains('error'));
  }, 12000);
  const junkState = await page.evaluate(() => ({
    board: BOARD_SIZE,
    pieces: pieces.length,
    solved: document.getElementById('solutionSection').classList.contains('visible'),
    banner: document.getElementById('scanError').classList.contains('show'),
    bannerText: document.getElementById('scanError').textContent,
    status: document.getElementById('status').textContent,
    statusErr: document.getElementById('status').classList.contains('error')
  }));
  assert.strictEqual(junkState.pieces, 0, 'junk photo must not invent pieces');
  assert.strictEqual(junkState.solved, false, 'junk photo must not keep/show a solve');
  assert.strictEqual(junkState.board, boardBefore, 'junk photo must not invent a board size');
  assert.ok(junkState.banner && junkState.statusErr, 'junk photo must show a visible error');
  assert.ok(/could not read/i.test(junkState.bannerText + junkState.status), junkState.bannerText + ' / ' + junkState.status);

  // Carnival L75 regression photo: diamond 43 + 8 hex pieces, no invented 91
  await input.uploadFile(path.join(FIX, 'carnival-l75.png'));
  await wait(page, () => {
    const status = document.getElementById('status');
    const banner = document.getElementById('scanError');
    const solved = document.getElementById('solutionSection').classList.contains('visible');
    const n = (window.pieces || []).length;
    return solved || n >= 5 || (status && /scan found|scan complete|solving/i.test(status.textContent || '')) ||
      (banner && banner.classList.contains('show'));
  }, 20000);
  await page.waitForTimeout ? page.waitForTimeout(800) : new Promise(r => setTimeout(r, 800));
  const l75 = await page.evaluate(() => ({
    board: BOARD_SIZE,
    layout: currentLayout,
    rowMode: !!(LAYOUTS[currentLayout] && LAYOUTS[currentLayout].mode === 'rows'),
    pieces: pieces.map(p => ({ id: p.paletteId, size: p.size })),
    total: pieces.reduce((s, p) => s + (p.size || 0), 0),
    solved: document.getElementById('solutionSection').classList.contains('visible'),
    status: document.getElementById('status').textContent,
    editor: !!document.getElementById('pieceCanvas')
  }));
  assert.strictEqual(l75.board, 43, 'L75 honeycomb must stay 43, got ' + l75.board + ' ' + l75.status);
  assert.ok(l75.layout === 'game' || l75.rowMode, 'L75 must use diamond game layout, got ' + l75.layout);
  assert.ok(l75.pieces.length >= 6, 'L75 should read most tray colors, got ' + JSON.stringify(l75.pieces));
  assert.ok(Math.abs(l75.total - 43) <= 4, 'L75 tray total should be near 43, got ' + l75.total + ' ' + JSON.stringify(l75.pieces));
  const ids = l75.pieces.map(p => p.id);
  assert.ok(!ids.includes('green') && !ids.includes('silver'), 'L75 has no green/silver, got ' + ids.join(','));
  const copper = l75.pieces.find(p => p.id === 'copper');
  if (copper) assert.ok(copper.size <= 7, 'copper must not eat the basket, got ' + copper.size);
  assert.ok(l75.editor, 'chip editor remains after L75 scan');
  if (l75.total === 43) {
    await wait(page, () => document.getElementById('solutionSection').classList.contains('visible'), 20000);
  }

  // Auto-solve without a second Solve click (editor pieces already matching the board)
  await page.evaluate(() => {
    applyKnownBoard(43);
    lastHoneyCount = 43;
    lastHoneyCols = 9;
    const cubes = BOARD_CELLS.map(c => offsetToCube(c.col, c.row));
    cubes.sort((a, b) => a.r - b.r || a.q - b.q);
    const origin = cubes[0];
    pieces = [{
      color: '#dc2d28',
      cells: cubes.map(c => ({ dq: c.q - origin.q, dr: c.r - origin.r })),
      size: cubes.length
    }];
    selectedIdx = -1;
    renderPieceList();
    finishScan();
  });
  await wait(page, () => document.getElementById('solutionSection').classList.contains('visible'), 20000);
  const solved = await page.evaluate(() => ({
    visible: document.getElementById('solutionSection').classList.contains('visible'),
    filled: gridCells.filter(c => c.color).length,
    board: BOARD_SIZE,
    status: document.getElementById('status').textContent,
    editor: !!document.getElementById('pieceCanvas')
  }));
  assert.strictEqual(solved.visible, true, 'clean scan should auto-solve');
  assert.strictEqual(solved.filled, 43, 'solution should fill the 43-cell L65 board');
  assert.strictEqual(solved.board, 43);
  assert.ok(solved.editor, 'editor should remain after auto-solve');
  assert.ok(/solution found/i.test(solved.status), solved.status);

  if (errors.length) {
    throw new Error('page errors: ' + errors.join('\n'));
  }

  await browser.close();
  server.close();
  console.log('browser smoke tests passed');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
