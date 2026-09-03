'use strict';
const assert = require('assert');
const { classifyKnownBoard, classifyHoneyShape, isJunkScan, trayReadLooksTrusted, COLUMN_SIZES, GAME_43_ROWS } = require('../board-gate.js');

function sum(arr) { return arr.reduce((s, n) => s + n, 0); }

assert.strictEqual(sum(COLUMN_SIZES[43]), 43);
assert.strictEqual(sum(COLUMN_SIZES[91]), 91);
assert.strictEqual(sum(COLUMN_SIZES[157]), 157);
assert.strictEqual(sum(GAME_43_ROWS), 43);
assert.strictEqual(GAME_43_ROWS.length, 9);
assert.strictEqual(COLUMN_SIZES[43].length, 9);
assert.strictEqual(COLUMN_SIZES[91].length, 13);
assert.strictEqual(COLUMN_SIZES[157].length, 17);

// Size gate that must hold: L65 → 43, L101 → 91, L103 → 91
const cases = [
  ['L65 exact', { honeyCount: 43, honeyCols: 9, honeyRows: 7, trayTotal: 43 }, 43],
  ['L65 slightly short honey', { honeyCount: 38, honeyCols: 8.8, honeyRows: 7, trayTotal: 41 }, 43],
  ['L65 tray-led', { honeyCount: 34, honeyCols: 9.2, trayTotal: 43 }, 43],
  ['L101 exact', { honeyCount: 91, honeyCols: 13, honeyRows: 10, trayTotal: 91 }, 91],
  ['L101 noisy', { honeyCount: 84, honeyCols: 12.4, honeyRows: 9.5, trayTotal: 88 }, 91],
  ['L103 exact', { honeyCount: 91, honeyCols: 13, honeyRows: 10, trayTotal: 91 }, 91],
  ['L103 overcount cols (old 157 trap)', { honeyCount: 96, honeyCols: 14.7, honeyRows: 11, trayTotal: 91 }, 91],
  ['L103 overcount n=125 (old 157 trap)', { honeyCount: 125, honeyCols: 14.0, honeyRows: 10.5, trayTotal: 91 }, 91],
  ['L103 weak honey, tray 91', { honeyCount: 62, honeyCols: 12.2, trayTotal: 90 }, 91],
  ['true 157', { honeyCount: 157, honeyCols: 17, honeyRows: 13, trayTotal: 157 }, 157]
];

for (const [name, input, want] of cases) {
  const got = classifyKnownBoard(input);
  assert.strictEqual(got, want, name + ' expected ' + want + ' got ' + got);
}

assert.strictEqual(isJunkScan({ honeyCount: 0, trayPieces: 0, trayTotal: 0 }), true);
assert.strictEqual(isJunkScan({ honeyCount: 4, trayPieces: 1, trayTotal: 3 }), true);
assert.strictEqual(isJunkScan({ honeyCount: 43, trayPieces: 7, trayTotal: 43 }), false);
assert.strictEqual(isJunkScan({ honeyCount: 91, trayPieces: 10, trayTotal: 91 }), false);

// Carnival L75 / L65 screenshot: upright diamond, not sideways pointy 43
const l75 = classifyHoneyShape({ honeyCount: 43, honeyCols: 7.1, honeyRows: 9.0, trayTotal: 43 });
assert.ok(l75 && l75.size === 43 && l75.shape === 'game', 'L75 diamond must be game 43, got ' + JSON.stringify(l75));
assert.deepStrictEqual(l75.sizes, GAME_43_ROWS);

const l65noisy = classifyHoneyShape({ honeyCount: 38, honeyCols: 6.8, honeyRows: 8.6, trayTotal: 41 });
assert.ok(l65noisy && l65noisy.size === 43 && l65noisy.shape === 'game', 'L65 noisy diamond stays game 43');

const pointy43 = classifyHoneyShape({ honeyCount: 43, honeyCols: 9.0, honeyRows: 7.0, trayTotal: 43 });
assert.ok(pointy43 && pointy43.size === 43 && pointy43.shape === 'pointy', 'true 9-col 43 stays pointy');

const l101shape = classifyHoneyShape({ honeyCount: 91, honeyCols: 13, honeyRows: 10, trayTotal: 91 });
assert.ok(l101shape && l101shape.size === 91 && l101shape.shape === 'lvl101');

const l103shape = classifyHoneyShape({ honeyCount: 96, honeyCols: 14.7, honeyRows: 11, trayTotal: 91 });
assert.ok(l103shape && l103shape.size === 91, 'L103 overcount cols still 91');

// Live L75 v106 dump: 8/43 with phantom silver must NOT look trusted
const liveL75wrong = trayReadLooksTrusted({
  honeyCount: 43, honeyCols: 9, honeyRows: 7, trayTotal: 43, trayPieces: 8,
  paletteIds: ['copper', 'yellow', 'red', 'pink', 'silver', 'orange', 'purple', 'teal'],
  pieces: [
    { id: 'copper', size: 7 }, { id: 'yellow', size: 7 }, { id: 'red', size: 6 },
    { id: 'pink', size: 5 }, { id: 'silver', size: 5 }, { id: 'orange', size: 5 },
    { id: 'purple', size: 4 }, { id: 'teal', size: 4 }
  ]
});
assert.strictEqual(liveL75wrong, false, 'L75 phantom-silver 43/43 must not auto-solve');

const liveL75ok = trayReadLooksTrusted({
  honeyCount: 43, honeyCols: 7, honeyRows: 9, trayTotal: 43, trayPieces: 8,
  paletteIds: ['red', 'yellow', 'blue', 'orange', 'purple', 'teal', 'pink', 'copper'],
  pieces: [
    { id: 'red', size: 6 }, { id: 'yellow', size: 5 }, { id: 'blue', size: 6 },
    { id: 'orange', size: 4 }, { id: 'purple', size: 6 }, { id: 'teal', size: 5 },
    { id: 'pink', size: 6 }, { id: 'copper', size: 5 }
  ]
});
assert.strictEqual(liveL75ok, true, 'true L75 8-color tray is trusted');

const l101sil = trayReadLooksTrusted({
  honeyCount: 91, honeyCols: 13, trayTotal: 91, trayPieces: 10,
  paletteIds: ['red', 'yellow', 'blue', 'green', 'silver'],
  pieces: [{ id: 'green', size: 8 }, { id: 'silver', size: 7 }]
});
assert.strictEqual(l101sil, true, '91-cell boards may include green/silver');

console.log('board-gate tests: ' + cases.length + ' size-gate cases + junk + honey-shape + trust checks passed');
