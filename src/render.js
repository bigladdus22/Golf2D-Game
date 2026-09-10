// All drawing. Reads state, never mutates it.

import { CONFIG, YARDS_PER_METER } from './config.js';

export function render(ctx, ball, swing, lastShot, club) {
  const { width, height } = ctx.canvas;
  const r = CONFIG.render;

  drawSky(ctx, width, height, r);
  drawGround(ctx, width, height, r);
  drawTee(ctx, r);
  drawBall(ctx, ball, r);
  drawHud(ctx, ball, swing, lastShot, club, r);
  drawMeter(ctx, swing, r);
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

function drawHud(ctx, ball, swing, lastShot, club, r) {
  const yards = ((ball.x - CONFIG.tee.x) * YARDS_PER_METER).toFixed(1);
  ctx.fillStyle = r.colors.hudText;
  ctx.font = '16px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(`Distance: ${yards} yd`, 16, 14);
  ctx.fillText(`Ball: ${ball.mode}`, 16, 36);
  ctx.fillText(`Club: ${club.name} — ${club.carryYds} yd`, 16, 58);

  if (ball.mode === 'rest' && swing.phase === 'idle') {
    ctx.fillText('Space / click: swing — 1-8 / arrows: club — R: reset', 16, 80);
  }
  if (lastShot) {
    const power = Math.round(lastShot.power * 100);
    let text;
    if (lastShot.mishit) text = `Mishit! ${power}% power`;
    else if (lastShot.perfect) text = `Perfect! ${power}% power`;
    else text = `${power}% power, miss ${(lastShot.error * 100).toFixed(0)}`;
    ctx.fillStyle = lastShot.mishit ? r.colors.shotBad : r.colors.shotGood;
    ctx.fillText(text, 16, 102);
  }
}

// Horizontal three-click meter: needle sweeps right for power, then returns
// left toward the sweet spot near the bar's start.
function drawMeter(ctx, swing, r) {
  if (swing.phase !== 'power' && swing.phase !== 'accuracy') return;
  const m = r.meter;
  const s = CONFIG.swing;
  const posX = (t) => m.x + t * m.width;

  ctx.fillStyle = r.colors.meterTrack;
  ctx.fillRect(m.x - 4, m.y - 4, m.width + 8, m.height + 8);

  // Current fill up to the needle.
  ctx.fillStyle = r.colors.meterFill;
  ctx.fillRect(m.x, m.y, swing.pos * m.width, m.height);

  // Sweet spot band (accuracy target).
  ctx.fillStyle = r.colors.meterSweetSpot;
  const sweetX = posX(s.sweetSpot - s.perfectWindow);
  ctx.fillRect(sweetX, m.y, 2 * s.perfectWindow * m.width, m.height);

  // Locked power mark once the second click happened.
  if (swing.power !== null) {
    ctx.fillStyle = r.colors.meterPowerLock;
    ctx.fillRect(posX(swing.power) - 1.5, m.y - 4, 3, m.height + 8);
  }

  // Needle.
  ctx.fillStyle = r.colors.meterNeedle;
  ctx.fillRect(posX(swing.pos) - 1, m.y - 4, 2, m.height + 8);

  ctx.fillStyle = r.colors.meterNeedle;
  ctx.font = '13px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const label = swing.phase === 'power' ? 'click: set power' : 'click: accuracy!';
  ctx.fillText(label, m.x + m.width + 14, m.y + m.height / 2);
}
