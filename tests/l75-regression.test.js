'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { L75_TRUTH, L75_ROWS } = require('./generate-fixtures.js');
const { classifyHoneyShape, GAME_43_ROWS } = require('../board-gate.js');
const { hexShapeFromPoints, simpleColorId, isWoodOrBasket } = require('../balloon-color.js');

assert.strictEqual(L75_TRUTH.board, 43);
assert.strictEqual(L75_TRUTH.layout, 'game');
assert.deepStrictEqual(L75_TRUTH.rows, GAME_43_ROWS);
assert.strictEqual(L75_TRUTH.trayTotal, 43);
assert.strictEqual(L75_TRUTH.pieces.length, 8);
assert.strictEqual(L75_PIECES_SUM(), 43);

function L75_PIECES_SUM() {
  return L75_TRUTH.pieces.reduce((s, p) => s + p.size, 0);
}

const ids = L75_TRUTH.pieces.map(p => p.id);
assert.deepStrictEqual(ids, ['red', 'yellow', 'blue', 'orange', 'purple', 'teal', 'pink', 'copper']);

L75_TRUTH.pieces.forEach(p => {
  const pitch = 20, cellW = pitch * (48 / 42);
  const pts = p.cells.map(c => {
    const col = c.dq + (c.dr - (c.dr & 1)) / 2;
    const row = c.dr;
    return {
      cx: col * cellW + ((row % 2 === 1) ? cellW / 2 : 0),
      cy: row * pitch
    };
  });
  const cells = hexShapeFromPoints(pts, 'flat');
  assert.strictEqual(cells.length, p.size, p.id + ' hex fit lost balloons');
});

const png = path.join(__dirname, 'fixtures', 'carnival-l75.png');
assert.ok(fs.existsSync(png), 'carnival-l75.png missing');
assert.ok(L75_TRUTH.pixelPale > 200, 'honeycomb cream pixels should be present, got ' + L75_TRUTH.pixelPale);
assert.ok(L75_TRUTH.pixelFaces > 400, 'tray balloon-face pixels should be present, got ' + L75_TRUTH.pixelFaces);

assert.ok(isWoodOrBasket(160, 85, 45), 'L75 basket wicker must not count as copper');
assert.strictEqual(simpleColorId(160, 85, 45), null);
assert.strictEqual(simpleColorId(168, 88, 42), 'copper');
assert.strictEqual(simpleColorId(220, 210, 190), null, 'cream hex slots must not become silver');
assert.strictEqual(simpleColorId(232, 226, 214), null, 'ivory hex slots must not become silver');
assert.strictEqual(simpleColorId(45, 125, 220), 'blue');

const shape = classifyHoneyShape({ honeyCount: 43, honeyCols: 7, honeyRows: 9, trayTotal: 43 });
assert.strictEqual(shape.shape, 'game');
assert.deepStrictEqual(shape.sizes, L75_ROWS);

console.log('l75-regression: diamond 43, 8 hex pieces totaling 43, pale=' +
  L75_TRUTH.pixelPale + ' face=' + L75_TRUTH.pixelFaces);
