// ALL tuning numbers live here. Internal units are metres and seconds;
// display units are yards.

export const YARDS_PER_METER = 1.09361;

export const CONFIG = {
  physics: {
    // Fixed simulation timestep (s), decoupled from frame rate.
    timestep: 1 / 120,
    // Cap on how many fixed steps a single frame may run (tab-switch catch-up).
    maxStepsPerFrame: 10,
    gravity: 9.81, // m/s^2
    // Quadratic air drag: acceleration = -airDrag * |v| * v
    airDrag: 0.0075, // 1/m
    // Below this speed the ball is a candidate for coming to rest.
    restSpeed: 0.2, // m/s
    // The ball must stay below restSpeed this long to count as at rest.
    restDuration: 0.25, // s
  },

  // Flat ground for milestone 1. Values roughly "fairway".
  ground: {
    // Fraction of vertical speed kept after a bounce.
    restitution: 0.42,
    // Fraction of horizontal speed kept through a bounce.
    bounceFriction: 0.72,
    // If vertical speed after a bounce is below this, the ball starts rolling.
    minBounceSpeed: 1.2, // m/s
    // Rolling deceleration = rollFriction * gravity.
    rollFriction: 0.4,
  },

  // Milestone 1: every shot uses this fixed launch.
  launch: {
    speed: 42, // m/s
    angleDeg: 26,
  },

  tee: {
    x: 15, // m from world origin
  },

  render: {
    pxPerMeter: 4.2,
    groundScreenY: 480, // canvas y of the ground line
    ballRadiusPx: 5, // drawn oversized for visibility
    colors: {
      skyTop: '#8ec9f0',
      skyBottom: '#d8ecf7',
      ground: '#4f9642',
      groundLine: '#3a7330',
      ball: '#ffffff',
      ballOutline: '#5b6770',
      hudText: '#17301c',
    },
  },
};
