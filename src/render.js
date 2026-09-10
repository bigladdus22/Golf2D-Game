// All drawing. Reads state, never mutates it.

import { CONFIG, YARDS_PER_METER } from './config.js';
import { heightAt } from './course.js';

// scene: { ball, swing, lastShot, club, cam, hole, strokes, notice }
export function render(ctx, scene) {
  const { width, height } = ctx.canvas;
  const r = CONFIG.render;
  const w2s = makeTransform(scene.cam, r);

  drawSky(ctx, width, height, r);
  drawTerrain(ctx, scene.hole, w2s, width, height, r);
  drawFlag(ctx, scene.hole, w2s, r);
  drawBall(ctx, scene.ball, w2s, r);
  drawHud(ctx, scene, r);
  drawMeter(ctx, scene.swing, r);
}

function makeTransform(cam, r) {
  return (x, y) => ({
    sx: (x - cam.x) * r.pxPerMeter,
    sy: r.groundScreenY - y * r.pxPerMeter,
  });
}

function drawSky(ctx, width, height, r) {
  const sky = ctx.createLinearGradient(0, 0, 0, r.groundScreenY);
  sky.addColorStop(0, r.colors.skyTop);
  sky.addColorStop(1, r.colors.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
}

function drawTerrain(ctx, hole, w2s, width, height, r) {
  const pts = hole.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const sa = w2s(a.x, a.y);
    const sb = w2s(b.x, b.y);
    if (sb.sx < 0 || sa.sx > width) continue;
    ctx.fillStyle = r.colors[a.surface] ?? r.colors.out;
    ctx.beginPath();
    ctx.moveTo(sa.sx, sa.sy);
    ctx.lineTo(sb.sx, sb.sy);
    ctx.lineTo(sb.sx, height);
    ctx.lineTo(sa.sx, height);
    ctx.closePath();
    ctx.fill();
  }
  // Out of bounds beyond the terrain, if visible.
  const lastS = w2s(pts.at(-1).x, pts.at(-1).y);
  if (lastS.sx < width) {
    ctx.fillStyle = r.colors.out;
    ctx.fillRect(lastS.sx, lastS.sy, width - lastS.sx, height - lastS.sy);
  }
  const firstS = w2s(pts[0].x, pts[0].y);
  if (firstS.sx > 0) {
    ctx.fillStyle = r.colors.out;
    ctx.fillRect(0, firstS.sy, firstS.sx, height - firstS.sy);
  }
}

function drawFlag(ctx, hole, w2s, r) {
  const baseY = heightAt(hole, hole.cupX);
  const base = w2s(hole.cupX, baseY);
  const top = w2s(hole.cupX, baseY + r.flagHeightM);

  // Cup marker (visual only until milestone 5).
  ctx.fillStyle = r.colors.cup;
  ctx.fillRect(base.sx - 3, base.sy, 6, 4);

  ctx.strokeStyle = r.colors.flagPole;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(base.sx, base.sy);
  ctx.lineTo(top.sx, top.sy);
  ctx.stroke();

  const clothH = (base.sy - top.sy) * 0.28;
  ctx.fillStyle = r.colors.flagCloth;
  ctx.beginPath();
  ctx.moveTo(top.sx, top.sy);
  ctx.lineTo(top.sx + clothH * 1.6, top.sy + clothH / 2);
  ctx.lineTo(top.sx, top.sy + clothH);
  ctx.closePath();
  ctx.fill();
}

function drawBall(ctx, ball, w2s, r) {
  const { sx, sy } = w2s(ball.x, ball.y);
  ctx.beginPath();
  ctx.arc(sx, sy - r.ballRadiusPx, r.ballRadiusPx, 0, Math.PI * 2);
  ctx.fillStyle = r.colors.ball;
  ctx.fill();
  ctx.strokeStyle = r.colors.ballOutline;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawHud(ctx, scene, r) {
  const { ball, swing, lastShot, club, hole, strokes, notice } = scene;
  const toFlagYds = Math.abs(hole.cupX - ball.x) * YARDS_PER_METER;

  ctx.fillStyle = r.colors.hudText;
  ctx.font = '16px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(`Hole 1 · Par ${hole.par} · Stroke ${strokes}`, 16, 14);
  ctx.fillText(`To flag: ${toFlagYds.toFixed(0)} yd`, 16, 36);
  ctx.fillText(`Club: ${club.name} — ${club.carryYds} yd`, 16, 58);

  if (ball.mode === 'rest' && swing.phase === 'idle') {
    ctx.fillText('Space / click: swing — 1-8 / arrows: club — R: restart hole', 16, 80);
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
  if (notice) {
    ctx.fillStyle = r.colors.notice;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(notice, 16, 128);
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
