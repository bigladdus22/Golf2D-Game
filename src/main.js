// Bootstrap + game loop. Fixed-timestep simulation decoupled from frame rate,
// with rendering interpolated between the two most recent physics states.

import { CONFIG } from './config.js';
import { createBall, launch, stepBall } from './physics.js';
import { createSwing, updateSwing, pressSwing, resolveShot, isPerfect } from './swing.js';
import { buildClubs, nextClub, prevClub } from './clubs.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const clubs = buildClubs(CONFIG);

let ball = createBall(CONFIG.tee.x, 0);
let prevBall = ball;
let swing = createSwing();
let clubIndex = 0; // driver
let lastShot = null; // feedback for the HUD: {power, error, mishit, perfect}
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
  ball = launch(ball, shot.speed, shot.angleDeg, club.lift);
  prevBall = ball;
  swing = createSwing();
}

function reset() {
  ball = createBall(CONFIG.tee.x, 0);
  prevBall = ball;
  swing = createSwing();
  lastShot = null;
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
    reset();
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
    ball = stepBall(ball, dt, CONFIG);
    swing = updateSwing(swing, dt, CONFIG.swing);
    if (swing.phase === 'done') hit(); // meter ran out un-clicked: late miss
    accumulator -= dt;
  }

  const alpha = accumulator / dt;
  const view = {
    ...ball,
    x: prevBall.x + (ball.x - prevBall.x) * alpha,
    y: prevBall.y + (ball.y - prevBall.y) * alpha,
  };
  render(ctx, view, swing, lastShot, clubs[clubIndex]);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
