// Ball flight, bounce, and roll. Pure functions, no drawing, no globals.
//
// Coordinate system: x increases down-range, y increases upward. Units:
// metres, seconds. The step config carries an optional terrain adapter
// ({ heightAt, slopeAt, surfaceAt }, see course.js) plus per-surface
// parameters in cfg.surfaces; without one, the ground is flat at y = 0 with
// cfg.ground parameters (unit tests, club calibration).
//
// Ball state shape:
//   { x, y, vx, vy, lift, mode, restTimer }
// mode: 'rest' | 'flight' | 'roll' | 'water' | 'out'
// 'water' and 'out' are terminal for the physics — the game rules layer
// decides penalties and where the ball goes next.

const FLAT_TERRAIN = {
  heightAt: () => 0,
  slopeAt: () => 0,
  surfaceAt: () => null,
};

function terrainOf(cfg) {
  return cfg.terrain ?? FLAT_TERRAIN;
}

function surfaceParams(cfg, surface) {
  return (surface && cfg.surfaces?.[surface]) || cfg.ground;
}

export function createBall(x = 0, y = 0) {
  return { x, y, vx: 0, vy: 0, lift: 0, mode: 'rest', restTimer: 0 };
}

// Returns a new ball state launched from the ball's current position.
// `lift` is the shot's backspin lift coefficient (per club, see config.js).
export function launch(ball, speed, angleDeg, lift = 0) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    ...ball,
    vx: speed * Math.cos(angle),
    vy: speed * Math.sin(angle),
    lift,
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
  // Backspin lift: quadratic like drag, perpendicular to velocity — the
  // velocity rotated 90° counter-clockwise, so it points up while the ball
  // moves forward. Coefficient is per shot (per club).
  const ax = -airDrag * speed * ball.vx - ball.lift * speed * ball.vy;
  const ay = -gravity - airDrag * speed * ball.vy + ball.lift * speed * ball.vx;

  // Semi-implicit Euler: update velocity first, then position with it.
  const vx = ball.vx + ax * dt;
  const vy = ball.vy + ay * dt;
  const x = ball.x + vx * dt;
  const y = ball.y + vy * dt;

  const terrain = terrainOf(cfg);
  const h = terrain.heightAt(x);
  if (y > h) {
    return { ...ball, x, y, vx, vy };
  }
  const surface = terrain.surfaceAt(x);
  if (surface === 'water' || surface === 'out') {
    return { ...ball, x, y: h, vx: 0, vy: 0, mode: surface };
  }
  return land(
    { ...ball, x, y: h, vx, vy },
    terrain.slopeAt(x),
    surfaceParams(cfg, surface),
  );
}

// Bounce off a slope: reflect the normal component with restitution, keep
// the tangential component scaled by bounce friction.
function land(ball, slope, p) {
  const inv = 1 / Math.hypot(1, slope);
  const tx = inv;
  const ty = slope * inv; // tangent, pointing down-range
  const nx = -slope * inv;
  const ny = inv; // normal, pointing up
  const vn = ball.vx * nx + ball.vy * ny;
  const vt = ball.vx * tx + ball.vy * ty;
  if (vn >= 0) {
    // Grazing along or away from the slope face; leave the flight alone.
    return ball;
  }
  const vnAfter = -vn * p.restitution;
  const vtAfter = vt * p.bounceFriction;
  if (vnAfter >= p.minBounceSpeed) {
    return {
      ...ball,
      vx: vtAfter * tx + vnAfter * nx,
      vy: vtAfter * ty + vnAfter * ny,
      mode: 'flight',
    };
  }
  return { ...ball, vx: vtAfter * tx, vy: vtAfter * ty, mode: 'roll' };
}

function stepRoll(ball, dt, cfg) {
  const { gravity, restSpeed, restDuration } = cfg.physics;
  const terrain = terrainOf(cfg);
  const surface = terrain.surfaceAt(ball.x);
  if (surface === 'water' || surface === 'out') {
    return { ...ball, vx: 0, vy: 0, mode: surface };
  }
  const p = surfaceParams(cfg, surface);
  const slope = terrain.slopeAt(ball.x);
  const inv = 1 / Math.hypot(1, slope);
  const cos = inv;
  const sin = slope * inv;

  // Signed speed along the slope, positive down-range.
  let s = ball.vx / cos;
  // Gravity component along the slope, then friction toward zero.
  s -= gravity * sin * dt;
  s = Math.sign(s) * Math.max(0, Math.abs(s) - p.rollFriction * gravity * cos * dt);

  const x = ball.x + s * cos * dt;
  const y = terrain.heightAt(x);
  const moved = { ...ball, x, y, vx: s * cos, vy: s * sin };

  if (Math.abs(s) < restSpeed) {
    const restTimer = ball.restTimer + dt;
    if (restTimer >= restDuration) {
      return { ...moved, vx: 0, vy: 0, restTimer: 0, mode: 'rest' };
    }
    return { ...moved, restTimer };
  }
  return { ...moved, restTimer: 0 };
}
