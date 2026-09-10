// Bootstrap + game loop. Fixed-timestep simulation decoupled from frame rate,
// with rendering interpolated between the two most recent physics states.

import { CONFIG } from './config.js';
import { createBall, launch, stepBall } from './physics.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let ball = createBall(CONFIG.tee.x, 0);
let prevBall = ball;
let accumulator = 0;
let lastTime = null;

function hit() {
  if (ball.mode === 'rest') {
    ball = launch(ball, CONFIG.launch.speed, CONFIG.launch.angleDeg);
    prevBall = ball;
  }
}

function reset() {
  ball = createBall(CONFIG.tee.x, 0);
  prevBall = ball;
  accumulator = 0;
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    hit();
  } else if (e.code === 'KeyR') {
    reset();
  }
});
canvas.addEventListener('mousedown', hit);

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
    accumulator -= dt;
  }

  const alpha = accumulator / dt;
  render(ctx, {
    ...ball,
    x: prevBall.x + (ball.x - prevBall.x) * alpha,
    y: prevBall.y + (ball.y - prevBall.y) * alpha,
  });

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
