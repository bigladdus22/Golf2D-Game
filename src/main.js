// Bootstrap + game loop + rules (strokes, penalties). Fixed-timestep
// simulation decoupled from frame rate; rendering interpolates between the
// two most recent physics states.

import { CONFIG } from './config.js';
import { createBall, launch, stepBall } from './physics.js';
import { createSwing, updateSwing, pressSwing, resolveShot, isPerfect } from './swing.js';
import { buildClubs, nextClub, prevClub } from './clubs.js';
import { loadHole, terrainAdapter, heightAt, waterDropX } from './course.js';
import { createCamera, updateCamera } from './camera.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const clubs = buildClubs(CONFIG);
const hole = await loadHole('./holes/hole1.json');
const terrain = terrainAdapter(hole);
const simCfg = { physics: CONFIG.physics, surfaces: CONFIG.surfaces, ground: CONFIG.ground, terrain };
const viewWidthM = canvas.width / CONFIG.render.pxPerMeter;

function ballAt(x) {
  return createBall(x, heightAt(hole, x));
}

let ball = ballAt(hole.teeX);
let prevBall = ball;
let preShotBall = ball; // where the last stroke was played from (OB replay)
let swing = createSwing();
let cam = createCamera();
let clubIndex = 0; // driver
let strokes = 0;
let lastShot = null; // feedback for the HUD: {power, error, mishit, perfect}
let notice = null; // penalty message: {text, until}
let clock = 0; // simulated seconds since load
let accumulator = 0;
let lastTime = null;

function press() {
  if (ball.mode !== 'rest') return;
  swing = pressSwing(swing, CONFIG.swing);
  if (swing.phase === 'done') hit();
}

function hit() {
  const club = clubs[clubIndex];
  const shot = resolveShot(
    swing,
    CONFIG.swing,
    { speed: club.speed, angleDeg: club.loftDeg },
    Math.random,
  );
  lastShot = {
    power: swing.power,
    error: swing.error,
    mishit: shot.mishit,
    perfect: isPerfect(swing.error, CONFIG.swing),
  };
  strokes += 1;
  preShotBall = ball;
  notice = null;
  ball = launch(ball, shot.speed, shot.angleDeg, club.lift);
  prevBall = ball;
  swing = createSwing();
}

function showNotice(text) {
  notice = { text, until: clock + CONFIG.render.noticeSeconds };
}

// Hazard outcomes reported by the physics ('water' / 'out' modes).
function applyRules() {
  if (ball.mode === 'water') {
    strokes += CONFIG.rules.waterPenalty;
    const dropX = waterDropX(hole, ball.x, CONFIG.rules.waterDropMargin);
    ball = ballAt(dropX);
    showNotice(`Water! +${CONFIG.rules.waterPenalty} penalty — dropped at entry`);
  } else if (ball.mode === 'out') {
    strokes += CONFIG.rules.outPenalty;
    ball = { ...preShotBall };
    showNotice(`Out of bounds! +${CONFIG.rules.outPenalty} penalty — replay`);
  } else {
    return;
  }
  prevBall = ball;
}

function restartHole() {
  ball = ballAt(hole.teeX);
  prevBall = ball;
  preShotBall = ball;
  swing = createSwing();
  strokes = 0;
  lastShot = null;
  notice = null;
  accumulator = 0;
}

// Club changes are only allowed between swings.
function canChangeClub() {
  return ball.mode === 'rest' && swing.phase === 'idle';
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    press();
    return;
  }
  if (e.code === 'KeyR') {
    restartHole();
    return;
  }
  if (!canChangeClub()) return;
  const digit = /^Digit([1-9])$/.exec(e.code);
  if (digit) {
    const i = Number(digit[1]) - 1;
    if (i < clubs.length) clubIndex = i;
  } else if (e.code === 'ArrowDown' || e.code === 'ArrowRight') {
    clubIndex = nextClub(clubIndex, clubs.length); // shorter club
  } else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
    clubIndex = prevClub(clubIndex); // longer club
  }
});
canvas.addEventListener('mousedown', press);

function frame(now) {
  if (lastTime === null) lastTime = now;
  accumulator += (now - lastTime) / 1000;
  lastTime = now;

  const dt = CONFIG.physics.timestep;
  const maxLag = CONFIG.physics.maxStepsPerFrame * dt;
  if (accumulator > maxLag) accumulator = maxLag;

  while (accumulator >= dt) {
    prevBall = ball;
    ball = stepBall(ball, dt, simCfg);
    applyRules();
    swing = updateSwing(swing, dt, CONFIG.swing);
    if (swing.phase === 'done') hit(); // meter ran out un-clicked: late miss
    cam = updateCamera(cam, ball.x, dt, CONFIG.camera, viewWidthM, hole.points[0].x, hole.points.at(-1).x);
    clock += dt;
    accumulator -= dt;
  }

  if (notice && clock > notice.until) notice = null;

  const alpha = accumulator / dt;
  const view = {
    ...ball,
    x: prevBall.x + (ball.x - prevBall.x) * alpha,
    y: prevBall.y + (ball.y - prevBall.y) * alpha,
  };
  render(ctx, {
    ball: view,
    swing,
    lastShot,
    club: clubs[clubIndex],
    cam,
    hole,
    strokes,
    notice: notice?.text ?? null,
  });

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
