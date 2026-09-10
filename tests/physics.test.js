import test from 'node:test';
import assert from 'node:assert/strict';
import { createBall, launch, stepBall } from '../src/physics.js';
import { CONFIG } from '../src/config.js';

const DT = CONFIG.physics.timestep;

// Test config with the same shape as CONFIG but easy to override per test.
function makeConfig(physics = {}, ground = {}) {
  return {
    physics: { ...CONFIG.physics, ...physics },
    ground: { ...CONFIG.ground, ...ground },
  };
}

// Steps until the ball is at rest (or maxSeconds elapse). Returns every state.
function simulate(ball, cfg, maxSeconds = 60) {
  const states = [ball];
  for (let t = 0; t < maxSeconds && ball.mode !== 'rest'; t += DT) {
    ball = stepBall(ball, DT, cfg);
    states.push(ball);
  }
  return states;
}

test('launch sets velocity from speed and angle', () => {
  const ball = launch(createBall(0, 0), 10, 30);
  assert.ok(Math.abs(ball.vx - 10 * Math.cos(Math.PI / 6)) < 1e-9);
  assert.ok(Math.abs(ball.vy - 10 * Math.sin(Math.PI / 6)) < 1e-9);
  assert.equal(ball.mode, 'flight');
});

test('a resting ball does not move', () => {
  const ball = createBall(5, 0);
  assert.deepEqual(stepBall(ball, DT, makeConfig()), ball);
});

test('drag-free flight matches analytic projectile range', () => {
  // Kill drag and make the ball stop dead on first contact, so the landing
  // x is the pure carry. Analytic range: v^2 * sin(2*theta) / g.
  const cfg = makeConfig(
    { airDrag: 0 },
    { restitution: 0, bounceFriction: 0, minBounceSpeed: Infinity },
  );
  const v = 30;
  const angleDeg = 45;
  const expected = (v * v * Math.sin((2 * angleDeg * Math.PI) / 180)) / cfg.physics.gravity;

  const states = simulate(launch(createBall(0, 0), v, angleDeg), cfg);
  const final = states.at(-1);
  // One timestep of horizontal travel is the integration tolerance.
  assert.ok(Math.abs(final.x - expected) < v * DT * 2,
    `landed at ${final.x}, expected ~${expected}`);
});

test('air drag shortens carry', () => {
  const stopDead = { restitution: 0, bounceFriction: 0, minBounceSpeed: Infinity };
  const noDrag = simulate(launch(createBall(0, 0), 40, 30), makeConfig({ airDrag: 0 }, stopDead));
  const withDrag = simulate(launch(createBall(0, 0), 40, 30), makeConfig({}, stopDead));
  assert.ok(withDrag.at(-1).x < noDrag.at(-1).x * 0.9);
});

test('bounce keeps restitution fraction of vertical speed', () => {
  const cfg = makeConfig({ airDrag: 0 }, { restitution: 0.5, bounceFriction: 1, minBounceSpeed: 0.1 });
  // Falling ball just above the ground.
  const ball = { x: 0, y: 0.01, vx: 5, vy: -10, lift: 0, mode: 'flight', restTimer: 0 };
  const after = stepBall(ball, DT, cfg);
  assert.equal(after.mode, 'flight');
  assert.equal(after.y, 0);
  const vyAtImpact = ball.vy - cfg.physics.gravity * DT;
  assert.ok(Math.abs(after.vy - -vyAtImpact * 0.5) < 1e-9);
});

test('slow landing transitions to roll instead of bouncing', () => {
  const cfg = makeConfig({ airDrag: 0 }, { restitution: 0.4, minBounceSpeed: 5 });
  const ball = { x: 0, y: 0.001, vx: 3, vy: -2, lift: 0, mode: 'flight', restTimer: 0 };
  const after = stepBall(ball, DT, cfg);
  assert.equal(after.mode, 'roll');
  assert.equal(after.vy, 0);
});

test('rolling ball decelerates and comes to rest', () => {
  const cfg = makeConfig();
  let ball = { x: 0, y: 0, vx: 8, vy: 0, lift: 0, mode: 'roll', restTimer: 0 };
  const states = simulate(ball, cfg);
  const final = states.at(-1);
  assert.equal(final.mode, 'rest');
  assert.equal(final.vx, 0);
  assert.ok(final.x > 0);
  // Speed never increases while rolling.
  for (let i = 1; i < states.length; i++) {
    assert.ok(Math.abs(states[i].vx) <= Math.abs(states[i - 1].vx) + 1e-9);
  }
});

test('backspin lift raises the apex and extends carry', () => {
  const stopDead = { restitution: 0, bounceFriction: 0, minBounceSpeed: Infinity };
  const cfg = makeConfig({}, stopDead);
  const apexOf = (states) => Math.max(...states.map((s) => s.y));
  const flat = simulate(launch(createBall(0, 0), 60, 12, 0), cfg);
  const lifted = simulate(launch(createBall(0, 0), 60, 12, 0.004), cfg);
  assert.ok(apexOf(lifted) > apexOf(flat) * 1.5);
  assert.ok(lifted.at(-1).x > flat.at(-1).x * 1.2);
});

test('full shot with default config lands, rolls, and rests beyond the tee', () => {
  const cfg = makeConfig();
  const states = simulate(launch(createBall(0, 0), 42, 26), cfg);
  const final = states.at(-1);
  assert.equal(final.mode, 'rest');
  assert.ok(final.x > 50, `expected a real carry, got ${final.x} m`);
  for (const s of states) {
    assert.ok(s.y >= 0, 'ball must never sink below the ground');
  }
});

test('simulation is deterministic', () => {
  const cfg = makeConfig();
  const a = simulate(launch(createBall(0, 0), 42, 26), cfg);
  const b = simulate(launch(createBall(0, 0), 42, 26), cfg);
  assert.deepEqual(a.at(-1), b.at(-1));
  assert.equal(a.length, b.length);
});
