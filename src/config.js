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
    // (~0.0056 matches a real golf ball; slightly lower plays nicer here.)
    airDrag: 0.005, // 1/m
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

  // Club data: loft is the launch angle; carry is the target full-power
  // perfect-shot carry. Launch speed is derived at startup by calibrating
  // against the physics (see clubs.js), so carries hold even if drag changes.
  // Ordered longest to shortest. The putter joins in milestone 5 with
  // putting mode (ground roll only).
  // lift is the backspin lift coefficient (quadratic, like drag): more
  // lofted clubs spin more, so they get more lift and higher arcs.
  clubs: [
    { name: 'Driver', loftDeg: 10.5, carryYds: 230, lift: 0.0035 },
    { name: '3W', loftDeg: 15, carryYds: 210, lift: 0.0035 },
    { name: '4H', loftDeg: 22, carryYds: 190, lift: 0.004 },
    { name: '5i', loftDeg: 26, carryYds: 175, lift: 0.004 },
    { name: '7i', loftDeg: 33, carryYds: 150, lift: 0.0045 },
    { name: '9i', loftDeg: 41, carryYds: 125, lift: 0.0045 },
    { name: 'PW', loftDeg: 46, carryYds: 110, lift: 0.005 },
    { name: 'SW', loftDeg: 56, carryYds: 80, lift: 0.005 },
  ],
  clubCalibration: {
    minSpeed: 5, // m/s, binary-search bounds for the launch speed
    maxSpeed: 130,
    iterations: 40,
  },

  // Three-click swing meter. Meter position runs 0..1: it climbs during the
  // power phase, then returns toward 0 where the sweet spot sits.
  swing: {
    meterSpeed: 0.9, // meter travel per second (fraction of the bar)
    sweetSpot: 0.06, // accuracy target position on the way back down
    // Accuracy error = |click position - sweetSpot|, in bar fraction.
    perfectWindow: 0.015, // error at or below this counts as perfect
    mishitError: 0.2, // error at or above this is a mishit
    lateMissError: 0.3, // error assigned when the meter runs out un-clicked
    minPower: 0.1, // floor so a tiny power click still moves the ball
    // A clean (non-mishit) miss reduces speed by up to this fraction as
    // error approaches mishitError...
    carryPenalty: 0.15,
    // ...and wobbles the launch angle by up to +/- this many degrees.
    angleVarianceDeg: 6,
    mishit: {
      speedFactor: 0.45, // of the power-scaled speed
      angleFactor: 0.35, // of the base launch angle (low, ugly shot)
    },
  },

  tee: {
    x: 15, // m from world origin
  },

  render: {
    // Wide enough that a full driver (carry + roll) stays on screen until
    // the follow camera arrives in milestone 4.
    pxPerMeter: 3.5,
    groundScreenY: 480, // canvas y of the ground line
    ballRadiusPx: 5, // drawn oversized for visibility
    meter: {
      x: 280, // left edge, canvas px
      y: 505, // top edge, canvas px
      width: 400,
      height: 18,
    },
    colors: {
      skyTop: '#8ec9f0',
      skyBottom: '#d8ecf7',
      ground: '#4f9642',
      groundLine: '#3a7330',
      ball: '#ffffff',
      ballOutline: '#5b6770',
      hudText: '#17301c',
      meterTrack: '#2b3440',
      meterFill: '#e8b23a',
      meterPowerLock: '#e05252',
      meterSweetSpot: '#3ddc68',
      meterNeedle: '#ffffff',
      shotGood: '#1d7a34',
      shotBad: '#a03232',
    },
  },
};
