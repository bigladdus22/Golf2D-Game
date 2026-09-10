// Three-click swing meter state machine. Pure functions, no drawing, no
// globals, no direct input handling — the caller feeds it presses and
// fixed-timestep updates.
//
// Swing state shape:
//   { phase, pos, dir, power, error }
// phase: 'idle' | 'power' | 'accuracy' | 'done'
// pos:   meter position 0..1 (0 = bottom of the bar, where the sweet spot is)
// dir:   +1 climbing, -1 returning
// power: 0..1, set by the second press
// error: accuracy error in bar fraction, set by the third press (or timeout)

export function createSwing() {
  return { phase: 'idle', pos: 0, dir: 1, power: null, error: null };
}

// Advances the meter by one fixed timestep. Pure: returns a new state.
export function updateSwing(swing, dt, cfg) {
  if (swing.phase !== 'power' && swing.phase !== 'accuracy') return swing;

  let pos = swing.pos + swing.dir * cfg.meterSpeed * dt;
  let dir = swing.dir;

  if (pos >= 1) {
    // Reflect off the top; in the power phase the player can still click
    // on the way back down.
    pos = 1;
    dir = -1;
  }
  if (pos <= 0 && dir === -1) {
    if (swing.phase === 'power') {
      // Never clicked for power: swing cancelled.
      return createSwing();
    }
    // Never clicked for accuracy: the swing happens anyway, as a late miss.
    return { ...swing, pos: 0, dir, phase: 'done', error: cfg.lateMissError };
  }
  return { ...swing, pos, dir };
}

// Handles the next press (Space/click). Pure: returns a new state.
export function pressSwing(swing, cfg) {
  switch (swing.phase) {
    case 'idle':
      return { ...swing, phase: 'power', pos: 0, dir: 1 };
    case 'power':
      return {
        ...swing,
        phase: 'accuracy',
        dir: -1,
        power: Math.max(cfg.minPower, swing.pos),
      };
    case 'accuracy':
      return { ...swing, phase: 'done', error: Math.abs(swing.pos - cfg.sweetSpot) };
    default:
      return swing;
  }
}

export function isMishit(error, cfg) {
  return error >= cfg.mishitError;
}

export function isPerfect(error, cfg) {
  return error <= cfg.perfectWindow;
}

// Turns a finished swing into launch parameters. `random` is an injected
// () => [0, 1) source so callers/tests control the variance.
export function resolveShot(swing, cfg, launch, random) {
  const { power, error } = swing;
  const powerSpeed = launch.speed * power;

  if (isMishit(error, cfg)) {
    return {
      speed: powerSpeed * cfg.mishit.speedFactor,
      angleDeg: launch.angleDeg * cfg.mishit.angleFactor,
      mishit: true,
    };
  }

  const miss = error / cfg.mishitError; // 0..1 within the clean range
  const wobble = isPerfect(error, cfg)
    ? 0
    : (random() * 2 - 1) * miss * cfg.angleVarianceDeg;
  return {
    speed: powerSpeed * (1 - cfg.carryPenalty * miss),
    angleDeg: launch.angleDeg + wobble,
    mishit: false,
  };
}
