// All drawing. Reads state, never mutates it.

import { CONFIG, YARDS_PER_METER } from './config.js';

export function render(ctx, ball) {
  const { width, height } = ctx.canvas;
  const r = CONFIG.render;

  drawSky(ctx, width, height, r);
  drawGround(ctx, width, height, r);
  drawTee(ctx, r);
  drawBall(ctx, ball, r);
  drawHud(ctx, ball, r);
}

function worldToScreen(x, y, r) {
  return {
    sx: x * r.pxPerMeter,
    sy: r.groundScreenY - y * r.pxPerMeter,
  };
}

function drawSky(ctx, width, height, r) {
  const sky = ctx.createLinearGradient(0, 0, 0, r.groundScreenY);
  sky.addColorStop(0, r.colors.skyTop);
  sky.addColorStop(1, r.colors.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
}

function drawGround(ctx, width, height, r) {
  ctx.fillStyle = r.colors.ground;
  ctx.fillRect(0, r.groundScreenY, width, height - r.groundScreenY);
  ctx.strokeStyle = r.colors.groundLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, r.groundScreenY);
  ctx.lineTo(width, r.groundScreenY);
  ctx.stroke();
}

function drawTee(ctx, r) {
  const { sx, sy } = worldToScreen(CONFIG.tee.x, 0, r);
  ctx.fillStyle = r.colors.groundLine;
  ctx.fillRect(sx - 1.5, sy - 4, 3, 4);
}

function drawBall(ctx, ball, r) {
  const { sx, sy } = worldToScreen(ball.x, ball.y, r);
  ctx.beginPath();
  ctx.arc(sx, sy - r.ballRadiusPx, r.ballRadiusPx, 0, Math.PI * 2);
  ctx.fillStyle = r.colors.ball;
  ctx.fill();
  ctx.strokeStyle = r.colors.ballOutline;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawHud(ctx, ball, r) {
  const yards = ((ball.x - CONFIG.tee.x) * YARDS_PER_METER).toFixed(1);
  ctx.fillStyle = r.colors.hudText;
  ctx.font = '16px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(`Distance: ${yards} yd`, 16, 14);
  ctx.fillText(`Ball: ${ball.mode}`, 16, 36);
  if (ball.mode === 'rest') {
    ctx.fillText('Space / click: hit — R: reset to tee', 16, 58);
  }
}
