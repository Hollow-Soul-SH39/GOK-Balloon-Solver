/* Tray balloon color + clustering helpers (browser + Node).
 * Read balloon faces, not basket wicker / wood / UI chrome.
 */
(function (root) {
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s: max ? d / max : 0, v: max };
  }

  /** Basket wicker / tray wood / balloon-envelope tan — not copper paint. */
  function isWoodOrBasket(r, g, b) {
    const { h, s, v } = rgbToHsv(r, g, b);
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (h < 12 || h > 52) return false;
    if (b > 120) return false;
    const gRatio = g / Math.max(1, r);
    // Classic tan wicker: G tracks R, modest chroma.
    if (h >= 14 && h <= 50 && s >= 0.16 && s <= 0.62 && v >= 0.26 && v <= 0.64) {
      if (gRatio > 0.56 && gRatio < 0.90 && b <= g * 0.92 && chroma < 96) return true;
      if (chroma < 38 && s < 0.42 && r > 90 && r < 190 && g > 60 && g < 145) return true;
    }
    // Darker / more orange wicker (was leaking into copper on Carnival trays).
    if (h >= 16 && h <= 42 && v >= 0.28 && v <= 0.68 && s >= 0.35 && s <= 0.78) {
      if (gRatio >= 0.48 && gRatio <= 0.72 && chroma < 125 && b < 85 && r >= 120 && r <= 175) {
        if (!(gRatio < 0.52 && chroma >= 90 && s > 0.55)) return true;
      }
    }
    return false;
  }

  /** UI chrome / specular metal — not silver balloons. */
  function isChromeGlint(r, g, b) {
    const { s, v } = rgbToHsv(r, g, b);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (v > 0.93 && s < 0.22) return true;
    if (mx > 235 && (mx - mn) < 28) return true;
    if (b > r + 18 && b > g + 10 && v > 0.72 && s < 0.28) return true;
    return false;
  }

  function simpleColorId(r, g, b) {
    const hsv = rgbToHsv(r, g, b);
    const { h, s, v } = hsv;
    const mx = Math.max(r, g, b);
    const chroma = mx - Math.min(r, g, b);
    if (v < 0.22) return null;
    if (v > 0.97 && s < 0.18) return null;
    if (isChromeGlint(r, g, b)) return null;
    if (isWoodOrBasket(r, g, b)) return null;

    const magentaHue = (h >= 275 || h <= 18);
    if (magentaHue && r > 85 && b > 70) {
      const pinkish = v > 0.55 && r > 150 && b > 112 && g > 92 && g < 220 &&
        b > r * 0.50 && s > 0.10 && s < 0.62;
      if (pinkish) return 'pink';
      if ((h >= 258 && h < 330 && b > 80 && r > 55 && s > 0.22) ||
          (b > g + 6 && r > g + 10 && b > r * 0.48 && s > 0.25 && v < 0.90)) {
        return 'purple';
      }
    }

    if (s > 0.26 && chroma > 26 && v > 0.28) {
      if ((h <= 12 || h >= 348) && r > g + 16 && r > b + 28 && r > 100) return 'red';
      if (h > 12 && h < 36 && r > 145 && r > b + 18 && v > 0.52 && g > 75) {
        const copperish = (g / Math.max(1, r)) < 0.58 && b < 100 && g < 125 && chroma >= 40;
        if (copperish) return 'copper';
        return 'orange';
      }
      // Yellow: keep off coin-gold (lower sat / more orange, extra B)
      if (h >= 36 && h <= 70 && r > 135 && g > 115 && r > b + 18 && g > b + 12) {
        const coinGold = h < 48 && b > 55 && (b / Math.max(1, g)) > 0.34 && s < 0.75;
        if (!coinGold) return 'yellow';
      }
      // Lime is yellowish-green; true green has a larger G-R gap
      if (h >= 68 && h < 102 && g > 145 && r > 90 && r < 210 && g >= r && g > b + 20 && s > 0.28) {
        if (g > r + 18) return 'green';
        return 'lime';
      }
      if (h >= 82 && h < 155 && g > r + 8 && g > 88 && s > 0.18) return 'green';
      if (h >= 148 && h < 196 && g > 75 && b > 70 && g >= r + 4) return 'teal';
      if (h >= 196 && h < 268 && b > r + 8 && b > 90 && v > 0.28 && s > 0.38) return 'blue';
      if (h >= 258 && h < 330 && b > 75 && r > 50) return 'purple';
    }

    // Copper balloon paint — not tan wicker
    if (h >= 10 && h <= 38 && s > 0.38 && v >= 0.30 && v < 0.66 &&
        r > 100 && r < 200 && g > 42 && g < 120 && b < 90 &&
        r > g + 18 && r > b + 28 && chroma >= 42 &&
        (g / Math.max(1, r)) < 0.62) {
      return 'copper';
    }

    // Muted / shadowed green faces (undercount leftover)
    if (h >= 82 && h < 155 && g > r + 6 && g > 80 && g > b &&
        s > 0.16 && v > 0.24 && v < 0.92 && chroma > 18) {
      return 'green';
    }

    // Silver balloons: slightly warm or cool gray, not chrome
    if (s < 0.34 && v > 0.36 && v < 0.90 && chroma < 56 && mx > 105 && mx < 228 &&
        Math.abs(r - g) < 32 && Math.abs(g - b) < 36 && Math.min(r, g, b) > 68) {
      return 'silver';
    }
    return null;
  }

  /** Same-color faces within ~hex-neighbor distance stay one piece; farther bunches split. */
  const FACE_LINK = 1.68;
  const FACE_SEP = 0.72;

  function cubeRound(q, r) {
    let s = -q - r;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    const qd = Math.abs(rq - q), rd = Math.abs(rr - r), sd = Math.abs(rs - s);
    if (qd > rd && qd > sd) rq = -rr - rs;
    else if (rd > sd) rr = -rq - rs;
    return { q: rq, r: rr };
  }

  /** Fit balloon centers to a pointy-top hex lattice (polyhex, not square tetris). */
  function hexShapeFromPoints(members) {
    const n = members.length;
    if (n < 2 || n > 22) return [];
    const pts = members.map(m => ({
      x: m.cx != null ? m.cx : m.x,
      y: m.cy != null ? m.cy : m.y
    }));
    const nns = [];
    for (let i = 0; i < n; i++) {
      let best = Infinity;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < best) best = d;
      }
      if (best < Infinity) nns.push(best);
    }
    nns.sort((a, b) => a - b);
    const pitch = nns[Math.floor(nns.length / 2)] || 20;
    if (!(pitch > 5)) {
      return members.map((_, i) => ({ dq: i, dr: 0 }));
    }
    function scoreLattice(size, ox, oy) {
      const cells = [];
      let err = 0;
      const seen = new Map();
      pts.forEach(m => {
        const x = m.x - ox, y = m.y - oy;
        const qf = (2 / 3) * x / size;
        const rf = (-1 / 3) * x / size + (Math.sqrt(3) / 3) * y / size;
        const c = cubeRound(qf, rf);
        err += Math.hypot(qf - c.q, rf - c.r);
        const k = c.q + ',' + c.r;
        if (seen.has(k)) err += 1.6;
        else seen.set(k, 1);
        cells.push(c);
      });
      return { err, cells };
    }
    let best = { err: Infinity, cells: null };
    [pitch, pitch * 0.92, pitch * 1.08, pitch * 0.84, pitch * 1.16].forEach(size => {
      if (size < 6) return;
      const stepX = size / 5, stepY = size * 0.866 / 5;
      for (let ox = 0; ox < size * 1.5; ox += stepX) {
        for (let oy = 0; oy < size * 1.3; oy += stepY) {
          const s = scoreLattice(size, ox, oy);
          if (s.err < best.err) best = s;
        }
      }
    });
    let cells = best.cells || [];
    const occ = new Map();
    const HEXN = [
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
    ];
    cells = cells.map(c => {
      const k = c.q + ',' + c.r;
      if (!occ.has(k)) { occ.set(k, 1); return c; }
      for (const d of HEXN) {
        const nk = (c.q + d.q) + ',' + (c.r + d.r);
        if (!occ.has(nk)) { occ.set(nk, 1); return { q: c.q + d.q, r: c.r + d.r }; }
      }
      return c;
    });
    const uniq = [];
    const seen = new Set();
    cells.forEach(c => {
      const k = c.q + ',' + c.r;
      if (seen.has(k)) return;
      seen.add(k);
      uniq.push({ dq: c.q, dr: c.r });
    });
    if (uniq.length < 2) return [];
    uniq.sort((a, b) => a.dr - b.dr || a.dq - b.dq);
    const o0 = uniq[0];
    return uniq.map(c => ({ dq: c.dq - o0.dq, dr: c.dr - o0.dr }));
  }

  function clusterSameColor(points, balloonD) {
    const n = points.length;
    if (!n) return [];
    const link = Math.max(8, balloonD * FACE_LINK);
    const parent = points.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (points[i].id !== points[j].id) continue;
        const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
        if (d <= link) parent[find(i)] = find(j);
      }
    }
    const raw = new Map();
    points.forEach((p, i) => {
      const r = find(i);
      if (!raw.has(r)) raw.set(r, []);
      raw.get(r).push(p);
    });
    const groups = [];
    raw.forEach(members => {
      if (members.length <= 2) { groups.push(members); return; }
      const m = members.length;
      const p = Array.from({ length: m }, (_, i) => i);
      const f = (a) => (p[a] === a ? a : (p[a] = f(p[a])));
      const nn = [];
      for (let i = 0; i < m; i++) {
        let best = Infinity;
        for (let j = 0; j < m; j++) {
          if (i === j) continue;
          const d = Math.hypot(members[i].x - members[j].x, members[i].y - members[j].y);
          if (d < best) best = d;
        }
        if (best < Infinity) nn.push(best);
      }
      nn.sort((a, b) => a - b);
      const pitch = nn[Math.floor(nn.length / 2)] || balloonD;
      const thr = pitch * 1.48;
      for (let i = 0; i < m; i++) {
        for (let j = i + 1; j < m; j++) {
          if (Math.hypot(members[i].x - members[j].x, members[i].y - members[j].y) <= thr) {
            const a = f(i), b = f(j);
            if (a !== b) p[a] = b;
          }
        }
      }
      const buckets = new Map();
      for (let i = 0; i < m; i++) {
        const r = f(i);
        if (!buckets.has(r)) buckets.set(r, []);
        buckets.get(r).push(members[i]);
      }
      buckets.forEach(b => groups.push(b));
    });
    const bestByColor = new Map();
    groups.forEach(g => {
      const id = g[0].id;
      if (!bestByColor.has(id) || g.length > bestByColor.get(id).length) bestByColor.set(id, g);
    });
    return Array.from(bestByColor.values()).filter(g => g.length >= 2);
  }

  const api = {
    rgbToHsv, isWoodOrBasket, isChromeGlint, simpleColorId,
    FACE_LINK, FACE_SEP, clusterSameColor, hexShapeFromPoints, cubeRound
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GokBalloonColor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
