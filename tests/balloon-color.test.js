'use strict';
const assert = require('assert');
const {
  simpleColorId, isWoodOrBasket, isChromeGlint, clusterSameColor, FACE_LINK
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
expectId('gold coins', [210, 170, 70], null);
assert.ok(isChromeGlint(245, 248, 252), 'bright chrome');
expectId('UI chrome', [246, 248, 252], null);
expectId('sky wash', [140, 170, 210], null);

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

console.log('balloon-color tests passed');
