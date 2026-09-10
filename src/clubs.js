// Club data + launch-speed calibration. Pure functions, no drawing.
//
// Config gives each club a loft (launch angle) and a target full-power carry.
// The launch speed that produces that carry under the game's actual flight
// physics is found by binary search over simulated flights, so the carry
// table in config.js stays true even when drag or gravity are re-tuned.

import { YARDS_PER_METER } from './config.js';
import { createBall, launch, stepBall } from './physics.js';

// Ground that stops the ball dead on first contact, so the landing x is the
// pure carry with no bounce or roll.
const CARRY_GROUND = {
  restitution: 0,
  bounceFriction: 0,
  minBounceSpeed: Infinity,
  rollFriction: 1,
};

const MAX_FLIGHT_SECONDS = 60;

// Simulated carry (metres) for a launch from flat ground.
export function carryDistance(speed, angleDeg, lift, physics) {
  const cfg = { physics, ground: CARRY_GROUND };
  let ball = launch(createBall(0, 0), speed, angleDeg, lift);
  for (let t = 0; ball.mode === 'flight' && t < MAX_FLIGHT_SECONDS; t += physics.timestep) {
    ball = stepBall(ball, physics.timestep, cfg);
  }
  return ball.x;
}

// Launch speed whose simulated carry matches carryM. Carry is monotonic in
// speed, so binary search converges.
export function speedForCarry(carryM, angleDeg, lift, physics, cal) {
  let lo = cal.minSpeed;
  let hi = cal.maxSpeed;
  for (let i = 0; i < cal.iterations; i++) {
    const mid = (lo + hi) / 2;
    if (carryDistance(mid, angleDeg, lift, physics) < carryM) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Resolves the config club list into playable clubs with launch speeds.
export function buildClubs(cfg) {
  return cfg.clubs.map((club) => ({
    ...club,
    carryM: club.carryYds / YARDS_PER_METER,
    speed: speedForCarry(
      club.carryYds / YARDS_PER_METER,
      club.loftDeg,
      club.lift,
      cfg.physics,
      cfg.clubCalibration,
    ),
  }));
}

// Index helpers for selection (list is ordered longest to shortest).
export function nextClub(index, count) {
  return Math.min(index + 1, count - 1);
}

export function prevClub(index) {
  return Math.max(index - 1, 0);
}
