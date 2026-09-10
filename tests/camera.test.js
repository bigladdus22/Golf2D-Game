import test from 'node:test';
import assert from 'node:assert/strict';
import { createCamera, updateCamera } from '../src/camera.js';
import { CONFIG } from '../src/config.js';

const C = CONFIG.camera;
const VIEW = 200; // m
const MIN = 0;
const MAX = 400;

function settle(cam, targetX, seconds = 10) {
  for (let t = 0; t < seconds; t += 1 / 120) {
    cam = updateCamera(cam, targetX, 1 / 120, C, VIEW, MIN, MAX);
  }
  return cam;
}

test('camera settles with the ball a lead fraction into the view', () => {
  const cam = settle(createCamera(), 250);
  assert.ok(Math.abs(cam.x - (250 - VIEW * C.lead)) < 0.5);
});

test('camera clamps at the start and end of the hole', () => {
  assert.ok(Math.abs(settle(createCamera(100), 0).x - MIN) < 0.5);
  assert.ok(Math.abs(settle(createCamera(), 1000).x - (MAX - VIEW)) < 0.5);
});

test('camera moves smoothly, not in jumps', () => {
  let cam = createCamera();
  const next = updateCamera(cam, 300, 1 / 120, C, VIEW, MIN, MAX);
  const step = Math.abs(next.x - cam.x);
  assert.ok(step > 0 && step < 10, `single-step move was ${step} m`);
});
