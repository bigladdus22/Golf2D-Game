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

  // Fallback ground when the sim runs without terrain (unit tests, club
  // calibration). Same numbers as the fairway surface.
  ground: {
    restitution: 0.42, // fraction of normal speed kept after a bounce
    bounceFriction: 0.72, // fraction of tangential speed kept through a bounce
    minBounceSpeed: 1.2, // m/s — below this a bounce becomes a roll
    rollFriction: 0.4, // rolling deceleration = rollFriction * gravity
  },

  // Per-surface landing/rolling behaviour.
  surfaces: {
    fairway: { restitution: 0.42, bounceFriction: 0.72, minBounceSpeed: 1.2, rollFriction: 0.4 },
    rough: { restitution: 0.2, bounceFriction: 0.45, minBounceSpeed: 1.2, rollFriction: 1.4 },
    green: { restitution: 0.35, bounceFriction: 0.75, minBounceSpeed: 1.0, rollFriction: 0.12 },
    bunker: { restitution: 0.05, bounceFriction: 0.15, minBounceSpeed: 2.0, rollFriction: 2.5 },
  },

  rules: {
    waterPenalty: 1,
    outPenalty: 1,
    // The water drop sits this far before the hazard's entry edge.
    waterDropMargin: 1.5, // m
  },

  camera: {
    // Ball sits this fraction of the view width from the left edge.
    lead: 0.35,
    // Follow smoothing: higher snaps faster. Applied as 1 - exp(-k * dt).
    stiffness: 3.5,
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

  render: {
    pxPerMeter: 4.5,
    groundScreenY: 480, // canvas y of the ground line
    ballRadiusPx: 5, // drawn oversized for visibility
    flagHeightM: 2.4, // pole height in world metres
    noticeSeconds: 3, // how long penalty messages stay up
    meter: {
      x: 280, // left edge, canvas px
      y: 505, // top edge, canvas px
      width: 400,
      height: 18,
    },
    colors: {
      skyTop: '#8ec9f0',
      skyBottom: '#d8ecf7',
      ball: '#ffffff',
      ballOutline: '#5b6770',
      hudText: '#17301c',
      fairway: '#4f9642',
      rough: '#3b7031',
      green: '#5fb84e',
      bunker: '#e0c98f',
      water: '#3d7dc4',
      out: '#8a6f4d',
      flagPole: '#f2f2f2',
      flagCloth: '#d8352a',
      cup: '#1a2b18',
      notice: '#a03232',
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
