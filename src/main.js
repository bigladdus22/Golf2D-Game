// Bootstrap + game loop. Fixed-timestep simulation decoupled from frame rate,
// with rendering interpolated between the two most recent physics states.

import { CONFIG } from './config.js';
import { createBall, launch, stepBall } from './physics.js';
import { createSwing, updateSwing, pressSwing, resolveShot, isPerfect } from './swing.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let ball = createBall(CONFIG.tee.x, 0);
let prevBall = ball;
let swing = createSwing();
let lastShot = null; // feedback for the HUD: {power, error, mishit, perfect}
let accumulator = 0;
let lastTime = null;

function press() {
  if (ball.mode !== 'rest') return;
  swing = pressSwing(swing, CONFIG.swing);
  if (swing.phase === 'done') hit();
}

function hit() {
  const shot = resolveShot(swing, CONFIG.swing, CONFIG.launch, Math.random);
  lastShot = {
    power: swing.power,
    error: swing.error,
    mishit: shot.mishit,
    perfect: isPerfect(swing.error, CONFIG.swing),
  };
  ball = launch(ball, shot.speed, shot.angleDeg);
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

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    press();
  } else if (e.code === 'KeyR') {
    reset();
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
  render(ctx, view, swing, lastShot);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
