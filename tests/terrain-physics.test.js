import test from 'node:test';
import assert from 'node:assert/strict';
import { createBall, launch, stepBall } from '../src/physics.js';
import { parseHole, terrainAdapter, heightAt } from '../src/course.js';
import { CONFIG } from '../src/config.js';

const DT = CONFIG.physics.timestep;

function makeCfg(hole) {
  return {
    physics: CONFIG.physics,
    surfaces: CONFIG.surfaces,
    ground: CONFIG.ground,
    terrain: terrainAdapter(hole),
  };
}

function simulate(ball, cfg, maxSeconds = 60) {
  const states = [ball];
  for (let t = 0; t < maxSeconds; t += DT) {
    if (ball.mode === 'rest' || ball.mode === 'water' || ball.mode === 'out') break;
    ball = stepBall(ball, DT, cfg);
    states.push(ball);
  }
  return states;
}

const PLATEAU = parseHole({
  par: 3,
  teeX: 5,
  cupX: 150,
  terrain: [
    { x: 0, y: 0, surface: 'fairway' },
    { x: 50, y: 0, surface: 'fairway' },
    { x: 70, y: 5, surface: 'fairway' },
    { x: 200, y: 5, surface: 'fairway' },
    { x: 210, y: 5, surface: 'rough' },
  ],
});

test('ball lands and rests on elevated terrain, not at y=0', () => {
  const cfg = makeCfg(PLATEAU);
  const states = simulate(launch(createBall(5, 0), 35, 40, 0.003), cfg);
  const final = states.at(-1);
  assert.equal(final.mode, 'rest');
  assert.ok(final.x > 70 && final.x < 200, `expected plateau landing, got x=${final.x}`);
  assert.ok(Math.abs(final.y - 5) < 1e-9, `resting y should be 5, got ${final.y}`);
  // The ball must never pass through the terrain while at rest or rolling.
  for (const s of states) {
    if (s.mode === 'roll' || s.mode === 'rest') {
      assert.ok(Math.abs(s.y - heightAt(PLATEAU, s.x)) < 1e-6);
    }
  }
});

const HAZARDS = parseHole({
  par: 3,
  teeX: 5,
  cupX: 110,
  terrain: [
    { x: 0, y: 0, surface: 'fairway' },
    { x: 40, y: 0, surface: 'water' },
    { x: 100, y: 0, surface: 'fairway' },
    { x: 120, y: 0, surface: 'rough' },
  ],
});

test('landing in water reports mode water at the splash point', () => {
  const cfg = makeCfg(HAZARDS);
  // ~45° medium shot into the middle of the pond.
  const states = simulate(launch(createBall(5, 0), 22, 45, 0), cfg);
  const final = states.at(-1);
  assert.equal(final.mode, 'water');
  assert.ok(final.x > 40 && final.x < 100, `splash x=${final.x}`);
  assert.equal(final.vx, 0);
});

test('flying beyond the terrain reports mode out', () => {
  const cfg = makeCfg(HAZARDS);
  const states = simulate(launch(createBall(5, 0), 60, 30, 0.004), cfg);
  assert.equal(states.at(-1).mode, 'out');
});

test('rolling into water is caught too', () => {
  const cfg = makeCfg(HAZARDS);
  const ball = { x: 30, y: 0, vx: 10, vy: 0, lift: 0, mode: 'roll', restTimer: 0 };
  const states = simulate(ball, cfg);
  const final = states.at(-1);
  assert.equal(final.mode, 'water');
  assert.ok(final.x >= 40);
});

test('bunker kills the bounce where fairway would rebound', () => {
  const bunkerHole = parseHole({
    par: 3,
    teeX: 1,
    cupX: 15,
    terrain: [
      { x: 0, y: 0, surface: 'bunker' },
      { x: 20, y: 0, surface: 'fairway' },
      { x: 40, y: 0, surface: 'rough' },
    ],
  });
  const cfg = makeCfg(bunkerHole);
  const impact = { x: 10, y: 0.01, vx: 10, vy: -12, lift: 0, mode: 'flight', restTimer: 0 };
  const afterBunker = stepBall(impact, DT, cfg);
  assert.equal(afterBunker.mode, 'roll', 'bunker should swallow the bounce');

  const impactFairway = { ...impact, x: 25 };
  const afterFairway = stepBall(impactFairway, DT, cfg);
  assert.equal(afterFairway.mode, 'flight', 'fairway should rebound');
  assert.ok(afterFairway.vy > 0);
});

test('a rolling ball accelerates down a green slope', () => {
  const slopeHole = parseHole({
    par: 3,
    teeX: 5,
    cupX: 150,
    terrain: [
      { x: 0, y: 20, surface: 'green' },
      { x: 100, y: 0, surface: 'green' },
      { x: 300, y: 0, surface: 'green' },
      { x: 310, y: 0, surface: 'rough' },
    ],
  });
  const cfg = makeCfg(slopeHole);
  let ball = { x: 10, y: heightAt(slopeHole, 10), vx: 0.5, vy: -0.1, lift: 0, mode: 'roll', restTimer: 0 };
  for (let i = 0; i < 240; i++) ball = stepBall(ball, DT, cfg); // 2 s
  assert.ok(ball.vx > 0.5, `downhill roll should speed up, vx=${ball.vx}`);
  assert.ok(Math.abs(ball.y - heightAt(slopeHole, ball.x)) < 1e-6, 'ball follows the slope');
});
