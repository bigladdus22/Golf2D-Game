import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSwing, updateSwing, pressSwing, resolveShot, isMishit, isPerfect,
} from '../src/swing.js';
import { CONFIG } from '../src/config.js';

const S = CONFIG.swing;
// Shot resolution takes launch params from the selected club (see clubs.js);
// any fixed pair works for testing the swing math itself.
const LAUNCH = { speed: 42, angleDeg: 26 };
const DT = CONFIG.physics.timestep;

function advance(swing, seconds) {
  for (let t = 0; t < seconds; t += DT) {
    swing = updateSwing(swing, DT, S);
    if (swing.phase === 'done' || swing.phase === 'idle') break;
  }
  return swing;
}

test('first press starts the meter climbing', () => {
  const swing = pressSwing(createSwing(), S);
  assert.equal(swing.phase, 'power');
  assert.equal(swing.pos, 0);
  assert.equal(swing.dir, 1);
});

test('meter climbs, reflects at the top, and returns', () => {
  let swing = pressSwing(createSwing(), S);
  swing = advance(swing, (1 / S.meterSpeed) * 0.5);
  assert.ok(swing.pos > 0.4 && swing.pos < 0.6, `mid-climb pos ${swing.pos}`);
  swing = advance(swing, (1 / S.meterSpeed) * 0.75);
  assert.equal(swing.dir, -1, 'should have reflected off the top');
  assert.ok(swing.pos < 1);
});

test('second press locks power at the current position', () => {
  let swing = pressSwing(createSwing(), S);
  swing = advance(swing, (1 / S.meterSpeed) * 0.8);
  const posAtPress = swing.pos;
  swing = pressSwing(swing, S);
  assert.equal(swing.phase, 'accuracy');
  assert.equal(swing.power, posAtPress);
  assert.equal(swing.dir, -1);
});

test('a tiny power click is floored at minPower', () => {
  let swing = pressSwing(createSwing(), S);
  swing = updateSwing(swing, DT, S); // barely off the bottom
  swing = pressSwing(swing, S);
  assert.equal(swing.power, S.minPower);
});

test('never clicking for power cancels the swing', () => {
  let swing = pressSwing(createSwing(), S);
  swing = advance(swing, (2 / S.meterSpeed) + 1);
  assert.equal(swing.phase, 'idle');
  assert.equal(swing.power, null);
});

test('third press sets accuracy error relative to the sweet spot', () => {
  let swing = { phase: 'accuracy', pos: S.sweetSpot + 0.1, dir: -1, power: 0.9, error: null };
  swing = pressSwing(swing, S);
  assert.equal(swing.phase, 'done');
  assert.ok(Math.abs(swing.error - 0.1) < 1e-9);
});

test('letting the meter run out resolves as a late miss', () => {
  let swing = { phase: 'accuracy', pos: 0.05, dir: -1, power: 0.9, error: null };
  swing = advance(swing, 2 / S.meterSpeed);
  assert.equal(swing.phase, 'done');
  assert.equal(swing.error, S.lateMissError);
  assert.ok(isMishit(swing.error, S), 'a late miss should be a mishit');
});

test('perfect shot: full power-scaled speed, exact base angle, no variance', () => {
  const swing = { phase: 'done', pos: 0, dir: -1, power: 1, error: 0 };
  const explodingRandom = () => { throw new Error('variance must not be sampled'); };
  const shot = resolveShot(swing, S, LAUNCH, explodingRandom);
  assert.equal(shot.speed, LAUNCH.speed);
  assert.equal(shot.angleDeg, LAUNCH.angleDeg);
  assert.equal(shot.mishit, false);
  assert.ok(isPerfect(0, S));
});

test('power scales speed linearly', () => {
  const swing = { phase: 'done', pos: 0, dir: -1, power: 0.5, error: 0 };
  const shot = resolveShot(swing, S, LAUNCH, () => 0.5);
  assert.equal(shot.speed, LAUNCH.speed * 0.5);
});

test('accuracy error reduces carry and wobbles the angle within bounds', () => {
  const error = S.mishitError * 0.5; // clean miss, half way to mishit
  const swing = { phase: 'done', pos: 0, dir: -1, power: 1, error };
  const maxWobble = (error / S.mishitError) * S.angleVarianceDeg;

  const low = resolveShot(swing, S, LAUNCH, () => 0);   // wobble = -max
  const high = resolveShot(swing, S, LAUNCH, () => 1);  // wobble = +max (open interval in game)
  assert.ok(low.speed < LAUNCH.speed);
  assert.equal(low.speed, LAUNCH.speed * (1 - S.carryPenalty * 0.5));
  assert.ok(Math.abs(low.angleDeg - (LAUNCH.angleDeg - maxWobble)) < 1e-9);
  assert.ok(Math.abs(high.angleDeg - (LAUNCH.angleDeg + maxWobble)) < 1e-9);
});

test('a big miss produces a mishit: low and short', () => {
  const swing = { phase: 'done', pos: 0, dir: -1, power: 1, error: S.mishitError };
  const shot = resolveShot(swing, S, LAUNCH, () => 0.5);
  assert.equal(shot.mishit, true);
  assert.equal(shot.speed, LAUNCH.speed * S.mishit.speedFactor);
  assert.equal(shot.angleDeg, LAUNCH.angleDeg * S.mishit.angleFactor);
  assert.ok(shot.speed < LAUNCH.speed * 0.5);
  assert.ok(shot.angleDeg < LAUNCH.angleDeg * 0.5);
});

test('meter updates are deterministic', () => {
  const run = () => {
    let swing = pressSwing(createSwing(), S);
    for (let i = 0; i < 200; i++) swing = updateSwing(swing, DT, S);
    return swing;
  };
  assert.deepEqual(run(), run());
});

test('presses in rest/done phases are ignored', () => {
  const done = { phase: 'done', pos: 0, dir: -1, power: 1, error: 0 };
  assert.deepEqual(pressSwing(done, S), done);
});
