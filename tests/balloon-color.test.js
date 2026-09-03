'use strict';
const assert = require('assert');
const {
  simpleColorId, isWoodOrBasket, isChromeGlint, isPaleCreamSlot,
  isCoinOrFiligreeGold, isBackdropNotFace, clusterSameColor, FACE_LINK,
  hexShapeFromPoints
} = require('../balloon-color.js');

function expectId(name, rgb, want) {
  const got = simpleColorId(rgb[0], rgb[1], rgb[2]);
  assert.strictEqual(got, want, name + ' expected ' + want + ' got ' + got + ' for ' + rgb.join(','));
}

// Balloon faces
expectId('copper balloon', [168, 88, 42], 'copper');
expectId('copper balloon deep', [148, 72, 38], 'copper');
expectId('green balloon', [48, 168, 72], 'green');
expectId('green balloon dark', [36, 140, 70], 'green');
expectId('silver balloon', [176, 180, 186], 'silver');
expectId('silver warm', [168, 162, 150], 'silver');
expectId('yellow balloon', [250, 210, 45], 'yellow');
expectId('pink balloon', [240, 145, 175], 'pink');
expectId('blue balloon', [45, 125, 220], 'blue');
expectId('red balloon', [220, 45, 40], 'red');

// Not balloon faces
assert.ok(isWoodOrBasket(150, 108, 62), 'tan wicker is wood');
expectId('basket wicker', [150, 108, 62], null);
expectId('tray wood', [132, 96, 58], null);
assert.ok(isWoodOrBasket(160, 85, 45), 'dark orange wicker is wood');
expectId('dark orange wicker', [160, 85, 45], null);
expectId('basket weave', [145, 95, 55], null);
expectId('gold coins', [210, 170, 70], null);
expectId('gold filigree', [200, 155, 70], null);
assert.ok(isChromeGlint(245, 248, 252), 'bright chrome');
expectId('UI chrome', [246, 248, 252], null);
expectId('sky wash', [140, 170, 210], null);
assert.ok(isPaleCreamSlot(220, 210, 190), 'cream hex slot');
assert.ok(isPaleCreamSlot(232, 226, 214), 'ivory hex slot');
assert.ok(isCoinOrFiligreeGold(200, 155, 70), 'filigree gold');
assert.ok(isBackdropNotFace(220, 210, 190), 'cream is backdrop');
expectId('cream hex slot', [220, 210, 190], null);
expectId('ivory hex slot', [232, 226, 214], null);
expectId('warm cream leftover', [208, 198, 178], null);

// Leftover undercounts
expectId('muted green', [40, 120, 65], 'green');
expectId('dark silver', [140, 142, 148], 'silver');
expectId('yellow balloon bright', [250, 220, 50], 'yellow');
expectId('pink on coins', [230, 140, 165], 'pink');
expectId('copper highlight', [190, 100, 50], 'copper');

// Clustering: hex neighbors join; a second bunch 2.2 diameters away stays split
const d = 20;
const yellowA = [
  { x: 10, y: 10, id: 'yellow' },
  { x: 10 + d, y: 10, id: 'yellow' },
  { x: 10 + d * 0.5, y: 10 + d * 0.86, id: 'yellow' }
];
const yellowB = [
  { x: 10 + d * 3.3, y: 10, id: 'yellow' },
  { x: 10 + d * 4.3, y: 10, id: 'yellow' }
];
const clustered = clusterSameColor(yellowA.concat(yellowB), d);
assert.strictEqual(clustered.length, 1, 'one piece per color (largest bunch)');
assert.strictEqual(clustered[0].length, 3, 'must not swallow the adjacent 2-balloon bunch');

const onlyNeighbors = clusterSameColor(yellowA, d);
assert.strictEqual(onlyNeighbors[0].length, 3);

assert.ok(FACE_LINK < 2.0, 'link must stay below the old 2.05 merge radius');
assert.ok(FACE_LINK < 1.72 + 1e-9, 'link must not grow back toward the 2.55 bunch-vote merge');

// Hex polyhex fit (pointy-top), not square tetris
const hexPitch = 20;
const plus = [
  { cx: 0, cy: 0 },
  { cx: hexPitch, cy: 0 },
  { cx: -hexPitch, cy: 0 },
  { cx: hexPitch * 0.5, cy: hexPitch * 0.866 },
  { cx: -hexPitch * 0.5, cy: hexPitch * 0.866 }
];
const plusCells = hexShapeFromPoints(plus);
assert.strictEqual(plusCells.length, 5, 'plus polyhex should keep 5 cells, got ' + plusCells.length);

const bar = [
  { cx: 0, cy: 0 },
  { cx: hexPitch, cy: 0 },
  { cx: hexPitch * 2, cy: 0 },
  { cx: hexPitch * 3, cy: 0 }
];
const barCells = hexShapeFromPoints(bar);
assert.strictEqual(barCells.length, 4, 'hex bar should keep 4 cells');

console.log('balloon-color tests passed');
