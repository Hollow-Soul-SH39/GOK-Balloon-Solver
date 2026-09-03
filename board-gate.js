/* GOK balloon board-size gate — pure helpers (browser + Node).
 * Canonical levels: L65 = 43 cells, L101 = 91, L103 = 91.
 * 157 is only for the clearly larger 17-column board, never L103.
 */
(function (root) {
  const COLUMN_SIZES = {
    43: [1, 4, 7, 6, 7, 6, 7, 4, 1],
    91: [1, 4, 7, 10, 9, 10, 9, 10, 9, 10, 7, 4, 1],
    157: [1, 4, 7, 10, 13, 12, 13, 12, 13, 12, 13, 12, 13, 10, 7, 4, 1]
  };

  /** Carnival screenshot diamond (L65 / L75): 9 rows, widest 7. Not the sideways 9-col pointy. */
  const GAME_43_ROWS = [3, 4, 5, 6, 7, 6, 5, 4, 3];

  function classifyKnownBoard(input) {
    const n = Number(input && input.honeyCount) || 0;
    const cols = Math.max(Number(input && input.honeyCols) || 0, Number(input && input.nColGroups) || 0);
    const tot = Number(input && input.trayTotal) || 0;
    const rows = Number(input && input.honeyRows) || 0;

    // True 157-cell board is 17 columns. L103 is 13-col / 91 — even a noisy
    // 14.6-col / 11-row read or an overcount near 125 must stay 91.
    const clearly157 =
      (cols >= 16 && (n >= 130 || tot >= 124)) ||
      (n >= 140 && cols >= 15.6) ||
      (tot >= 140 && cols >= 15.6);
    if (clearly157) return 157;

    const looks91 =
      (n >= 58 && n <= 130 && cols < 15.6) ||
      (cols >= 11 && cols < 15.6 && (n >= 50 || tot >= 55 || rows >= 8)) ||
      (tot >= 60 && tot <= 120 && cols < 15.6) ||
      (n >= 70 && n <= 125 && cols < 15.6);
    if (looks91) return 91;

    const looks43 =
      (n >= 28 && n <= 54 && cols <= 10.8) ||
      (tot >= 28 && tot <= 54 && n < 58 && cols <= 10.8) ||
      (n >= 32 && n <= 54 && tot <= 54);
    if (looks43) return 43;

    if (tot >= 70 && tot <= 120) return 91;
    if (tot >= 28 && tot <= 54 && n < 58) return 43;

    return null;
  }

  /**
   * Pick the 43-cell geometry. Carnival table photos are the upright diamond
   * (rows 3-4-5-6-7-6-5-4-3). The 9-column pointy board is only when columns
   * clearly read as 9 with ~7 rows.
   */
  function classifyHoneyShape(input) {
    const size = classifyKnownBoard(input);
    if (!size) return null;
    if (size === 91) {
      return { size: 91, shape: 'lvl101', mode: 'cols', sizes: COLUMN_SIZES[91].slice() };
    }
    if (size === 157) {
      return { size: 157, shape: 'cols157', mode: 'cols', sizes: COLUMN_SIZES[157].slice() };
    }
    const cols = Number(input && input.honeyCols) || 0;
    const rows = Number(input && input.honeyRows) || 0;
    const looksDiamond =
      (rows >= 8 && cols > 0 && cols <= 8.25) ||
      (rows >= 8.5 && cols < 8.8) ||
      (cols > 0 && cols <= 7.6 && rows >= 7.5) ||
      (rows >= 8.8 && cols < 9.2);
    const looksPointy = cols >= 8.5 && cols <= 10.8 && rows > 0 && rows <= 8.0;
    if (looksPointy && !looksDiamond) {
      return { size: 43, shape: 'pointy', mode: 'cols', sizes: COLUMN_SIZES[43].slice() };
    }
    return { size: 43, shape: 'game', mode: 'rows', sizes: GAME_43_ROWS.slice() };
  }

  function isJunkScan(input) {
    const honeyCount = Number(input && input.honeyCount) || 0;
    const trayPieces = Number(input && input.trayPieces) || 0;
    const trayTotal = Number(input && input.trayTotal) || 0;
    if (trayPieces < 1 || trayTotal < 4) return true;
    if (honeyCount < 16 && trayPieces < 4) return true;
    if (honeyCount < 12 && trayTotal < 20) return true;
    return false;
  }

  /**
   * A 43/43 count is not enough to auto-solve. L75's live fail invented
   * silver from cream slots and copper from the basket, then packed wrong.
   */
  function trayReadLooksTrusted(input) {
    const ids = (input && input.paletteIds) || [];
    const pieces = (input && input.pieces) || [];
    const size = classifyKnownBoard(input);
    const honey43 = size === 43 ||
      ((Number(input && input.honeyCount) || 0) >= 28 &&
       (Number(input && input.honeyCount) || 0) <= 54 &&
       (Number(input && input.honeyCols) || 0) <= 10.8);
    if (honey43) {
      if (ids.indexOf('silver') >= 0 || ids.indexOf('green') >= 0 || ids.indexOf('lime') >= 0) {
        return false;
      }
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        if (!p) continue;
        if ((p.size || 0) > 8) return false;
        if ((p.id === 'copper' || p.paletteId === 'copper') && (p.size || 0) > 6) return false;
      }
    }
    return true;
  }

  const api = {
    COLUMN_SIZES, GAME_43_ROWS, classifyKnownBoard, classifyHoneyShape,
    isJunkScan, trayReadLooksTrusted
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GokBoardGate = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
