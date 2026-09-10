// Follow camera. Pure functions; state is { x } — the world x of the view's
// left edge. (Putting zoom arrives in milestone 5.)

export function createCamera(x = 0) {
  return { x };
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

// Eases toward keeping the target `lead` of the way into the view, clamped
// to the hole's extent. Frame-rate independent smoothing.
export function updateCamera(cam, targetX, dt, cfg, viewWidthM, minX, maxX) {
  const desired = clamp(
    targetX - viewWidthM * cfg.lead,
    minX,
    Math.max(minX, maxX - viewWidthM),
  );
  const t = 1 - Math.exp(-cfg.stiffness * dt);
  return { x: cam.x + (desired - cam.x) * t };
}
