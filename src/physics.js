// Ball flight, bounce, and roll. Pure functions, no drawing, no globals.
//
// Coordinate system: x increases down-range, y increases upward, ground at y = 0
// (flat for milestone 1). Units: metres, seconds.
//
// Ball state shape:
//   { x, y, vx, vy, mode, restTimer }
// mode is one of 'rest' | 'flight' | 'roll'.

export function createBall(x = 0, y = 0) {
  return { x, y, vx: 0, vy: 0, mode: 'rest', restTimer: 0 };
}

// Returns a new ball state launched from the ball's current position.
export function launch(ball, speed, angleDeg) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    ...ball,
    vx: speed * Math.cos(angle),
    vy: speed * Math.sin(angle),
    mode: 'flight',
    restTimer: 0,
  };
}

// Advances the ball by one fixed timestep. Pure: returns a new state.
// cfg is { physics, ground } from config.js (or a test override).
export function stepBall(ball, dt, cfg) {
  switch (ball.mode) {
    case 'flight':
      return stepFlight(ball, dt, cfg);
    case 'roll':
      return stepRoll(ball, dt, cfg);
    default:
      return ball;
  }
}

function stepFlight(ball, dt, cfg) {
  const { gravity, airDrag } = cfg.physics;
  const speed = Math.hypot(ball.vx, ball.vy);
  const ax = -airDrag * speed * ball.vx;
  const ay = -gravity - airDrag * speed * ball.vy;

  // Semi-implicit Euler: update velocity first, then position with it.
  const vx = ball.vx + ax * dt;
  const vy = ball.vy + ay * dt;
  const x = ball.x + vx * dt;
  const y = ball.y + vy * dt;

  if (y > 0 || vy >= 0) {
    return { ...ball, x, y, vx, vy };
  }
  return land({ ...ball, x, y: 0, vx, vy }, cfg);
}

function land(ball, cfg) {
  const { restitution, bounceFriction, minBounceSpeed } = cfg.ground;
  const vy = -ball.vy * restitution;
  const vx = ball.vx * bounceFriction;
  if (vy >= minBounceSpeed) {
    return { ...ball, vx, vy, mode: 'flight' };
  }
  return { ...ball, vx, vy: 0, mode: 'roll' };
}

function stepRoll(ball, dt, cfg) {
  const { gravity, restSpeed, restDuration } = cfg.physics;
  const decel = cfg.ground.rollFriction * gravity;
  const slowed = Math.max(0, Math.abs(ball.vx) - decel * dt);
  const vx = Math.sign(ball.vx) * slowed;
  const x = ball.x + vx * dt;

  if (slowed < restSpeed) {
    const restTimer = ball.restTimer + dt;
    if (restTimer >= restDuration) {
      return { ...ball, x, vx: 0, restTimer: 0, mode: 'rest' };
    }
    return { ...ball, x, vx, restTimer };
  }
  return { ...ball, x, vx, restTimer: 0 };
}
