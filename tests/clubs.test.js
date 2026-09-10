import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClubs, carryDistance, speedForCarry, nextClub, prevClub } from '../src/clubs.js';
import { CONFIG, YARDS_PER_METER } from '../src/config.js';

test('config lists the expected club set, longest to shortest', () => {
  const names = CONFIG.clubs.map((c) => c.name);
  assert.deepEqual(names, ['Driver', '3W', '4H', '5i', '7i', '9i', 'PW', 'SW']);
  for (let i = 1; i < CONFIG.clubs.length; i++) {
    assert.ok(CONFIG.clubs[i].carryYds < CONFIG.clubs[i - 1].carryYds);
    assert.ok(CONFIG.clubs[i].loftDeg > CONFIG.clubs[i - 1].loftDeg);
  }
});

test('carry is monotonic in launch speed', () => {
  const p = CONFIG.physics;
  assert.ok(carryDistance(30, 26, 0.004, p) < carryDistance(40, 26, 0.004, p));
  assert.ok(carryDistance(40, 26, 0.004, p) < carryDistance(50, 26, 0.004, p));
});

test('speedForCarry inverts carryDistance', () => {
  const p = CONFIG.physics;
  const target = 120; // m
  const speed = speedForCarry(target, 33, 0.0045, p, CONFIG.clubCalibration);
  const carry = carryDistance(speed, 33, 0.0045, p);
  assert.ok(Math.abs(carry - target) < 1, `carry ${carry} m vs target ${target} m`);
});

test('every calibrated club reproduces its config carry within 1%', () => {
  const clubs = buildClubs(CONFIG);
  for (const club of clubs) {
    const carryYds = carryDistance(club.speed, club.loftDeg, club.lift, CONFIG.physics) * YARDS_PER_METER;
    const errorFrac = Math.abs(carryYds - club.carryYds) / club.carryYds;
    assert.ok(errorFrac < 0.01,
      `${club.name}: simulated ${carryYds.toFixed(1)} yd vs target ${club.carryYds} yd`);
  }
});

test('calibrated speeds stay inside the search bounds and rank sensibly', () => {
  const clubs = buildClubs(CONFIG);
  const cal = CONFIG.clubCalibration;
  for (const club of clubs) {
    assert.ok(club.speed > cal.minSpeed && club.speed < cal.maxSpeed,
      `${club.name} speed ${club.speed} m/s hit a search bound`);
  }
  const driver = clubs[0];
  const sw = clubs.at(-1);
  assert.ok(driver.speed > sw.speed, 'driver must be the fastest ball');
});

test('club selection clamps at both ends of the bag', () => {
  const count = CONFIG.clubs.length;
  assert.equal(prevClub(0), 0);
  assert.equal(nextClub(count - 1, count), count - 1);
  assert.equal(nextClub(0, count), 1);
  assert.equal(prevClub(3), 2);
});
