// Unit tests for rain.js — run with `node --test tests/`.
const test = require("node:test");
const assert = require("node:assert/strict");
const { createRain } = require("../../rain.js");

/** Deterministic PRNG so every run is identical. */
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OPTS = { glyphs: "ABC", trailLength: [5, 5], baseSpeed: 10, maxStreaks: 3, mutateRate: 0 };
const make = (opts = {}) => {
  const r = createRain({ ...OPTS, ...opts }, mulberry32(42));
  r.resize(10, 20);
  return r;
};

test("spawn clamps the column into the grid", () => {
  const r = make();
  assert.equal(r.spawn(-4).col, 0);
  assert.equal(r.spawn(99).col, 9);
  assert.equal(r.spawn(3.6).col, 4);
});

test("spawn is a no-op before the grid has a size", () => {
  const r = createRain(OPTS, mulberry32(1));
  assert.equal(r.spawn(0), null);
  assert.equal(r.count(), 0);
});

test("at maxStreaks new spawns are refused; live streaks are never evicted", () => {
  const r = make();
  const live = [r.spawn(0), r.spawn(1), r.spawn(2)];
  assert.equal(r.spawn(3), null);
  assert.equal(r.count(), 3);
  const cols = new Set();
  r.forEachCell((col) => cols.add(col));
  assert.deepEqual([...cols].sort(), live.map((s) => s.col));
});

test("movement is frame-rate independent", () => {
  const a = make(); const b = make();
  const sa = a.spawn(0); const sb = b.spawn(0);
  for (let i = 0; i < 6; i++) a.step(1 / 60);
  for (let i = 0; i < 12; i++) b.step(1 / 120);
  assert.ok(Math.abs(sa.y - sb.y) < 1e-9);
});

test("setSpeed scales fall speed", () => {
  const r = make();
  const s = r.spawn(0);
  const base = s.speed;
  r.setSpeed(2);
  r.step(0.1);
  assert.ok(Math.abs(s.y - base * 2 * 0.1) < 1e-9);
});

test("the typed glyph rides at the head", () => {
  const r = make();
  r.spawn(2, "q");
  r.step(0.35);
  const heads = [];
  r.forEachCell((_c, _r, g, k) => k === 0 && heads.push(g));
  assert.deepEqual(heads, ["q"]);
});

test("written glyphs stay in their row when mutation is off", () => {
  const r = make();
  r.spawn(0);
  r.step(0.3);
  const snap = new Map();
  r.forEachCell((_c, row, g, k) => k > 0 && snap.set(row, g));
  r.step(0.1);
  r.forEachCell((_c, row, g, k) => {
    if (k > 0 && snap.has(row)) assert.equal(g, snap.get(row));
  });
});

test("streaks are removed once the whole trail leaves the screen", () => {
  const r = make();
  r.spawn(0);
  for (let i = 0; i < 400 && r.count(); i++) r.step(0.05);
  assert.equal(r.count(), 0);
});

test("delayed streaks (negative start row) draw nothing until they enter", () => {
  const r = make();
  r.spawn(0, null, -10);
  let cells = 0;
  r.forEachCell(() => cells++);
  assert.equal(cells, 0);
});

test("resize drops streaks in columns that no longer exist", () => {
  const r = make();
  r.spawn(1); r.spawn(8);
  r.resize(5, 20);
  assert.equal(r.count(), 1);
});
