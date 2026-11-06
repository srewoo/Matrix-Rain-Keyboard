// Digital Rain — pure simulation. No DOM access; unit-tested under Node.
//
// A streak is a falling head that "writes" a glyph into each row it enters.
// Written glyphs stay put (like the film), fading with distance from the head.
(function (root) {
  "use strict";

  function pick(pool, rng) {
    return pool[Math.floor(rng() * pool.length)];
  }

  /**
   * @param {{glyphs: string, trailLength: number[], baseSpeed: number,
   *          maxStreaks: number, mutateRate: number}} opts
   * @param {() => number} [rng] injectable for deterministic tests
   */
  function createRain(opts, rng = Math.random) {
    let cols = 0;
    let rows = 0;
    let speedMul = 1;
    let streaks = [];

    /** Set the grid size; streaks in columns that no longer exist are dropped. */
    function resize(c, r) {
      cols = Math.max(0, Math.floor(c));
      rows = Math.max(0, Math.floor(r));
      streaks = streaks.filter((s) => s.col < cols);
    }

    /**
     * Start a streak. `col` may be fractional/out of range; it is clamped.
     * @param {number} col
     * @param {string|null} [head] glyph shown at the head (e.g. typed char)
     * @param {number} [startRow] negative values delay entry
     */
    function spawn(col, head = null, startRow = 0) {
      // At the cap, refuse rather than evict: evicting makes a streak vanish
      // mid-screen. The screen is full anyway.
      if (cols === 0 || streaks.length >= opts.maxStreaks) return null;
      const [lo, hi] = opts.trailLength;
      const s = {
        col: Math.min(cols - 1, Math.max(0, Math.round(col))),
        y: startRow,
        speed: opts.baseSpeed * (0.6 + rng() * 0.8),
        len: lo + Math.floor(rng() * (hi - lo + 1)),
        head,
        hue: Math.floor(rng() * 360),
        cells: [],
      };
      if (startRow >= 0) s.cells[Math.floor(startRow)] = pick(opts.glyphs, rng);
      streaks.push(s);
      return s;
    }

    function advance(s, dt) {
      const before = Math.floor(s.y);
      s.y += s.speed * speedMul * dt;
      for (let r = Math.max(0, before + 1); r <= Math.floor(s.y); r++) {
        s.cells[r] = pick(opts.glyphs, rng);
      }
      if (rng() < opts.mutateRate * dt) {
        const r = Math.floor(s.y) - 1 - Math.floor(rng() * (s.len - 1));
        if (s.cells[r] !== undefined) s.cells[r] = pick(opts.glyphs, rng);
      }
    }

    /** Advance by `dt` seconds. Frame-rate independent. */
    function step(dt) {
      for (const s of streaks) advance(s, dt);
      streaks = streaks.filter((s) => Math.floor(s.y) - s.len < rows);
    }

    /**
     * Visit every visible glyph. `k` is distance from the head (0 = head).
     * @param {(col:number,row:number,glyph:string,k:number,len:number,s:object)=>void} fn
     */
    function forEachCell(fn) {
      for (const s of streaks) {
        const headRow = Math.floor(s.y);
        for (let k = 0; k < s.len; k++) {
          const row = headRow - k;
          if (row < 0) break;
          if (row >= rows) continue;
          const glyph = k === 0 && s.head ? s.head : s.cells[row];
          if (glyph !== undefined) fn(s.col, row, glyph, k, s.len, s);
        }
      }
    }

    return {
      resize,
      spawn,
      step,
      forEachCell,
      setSpeed: (m) => (speedMul = m),
      clear: () => (streaks = []),
      count: () => streaks.length,
      cols: () => cols,
      rows: () => rows,
    };
  }

  const api = { createRain };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RainSim = api;
})(globalThis);
