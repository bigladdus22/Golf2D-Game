import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHole, heightAt, slopeAt, surfaceAt, waterDropX, terrainAdapter,
} from '../src/course.js';

const HOLE_DATA = {
  par: 4,
  teeX: 20,
  cupX: 90,
  terrain: [
    { x: 0, y: 0, surface: 'rough' },
    { x: 10, y: 0, surface: 'fairway' },
    { x: 40, y: 2, surface: 'water' },
    { x: 60, y: 2, surface: 'fairway' },
    { x: 80, y: 4, surface: 'green' },
    { x: 100, y: 4, surface: 'rough' },
  ],
};

const hole = parseHole(HOLE_DATA);

test('parseHole accepts a valid hole', () => {
  assert.equal(hole.par, 4);
  assert.equal(hole.teeX, 20);
  assert.equal(hole.cupX, 90);
  assert.equal(hole.points.length, 6);
});

test('parseHole rejects malformed holes', () => {
  assert.throws(() => parseHole({ ...HOLE_DATA, par: 'four' }));
  assert.throws(() => parseHole({ ...HOLE_DATA, terrain: [] }));
  assert.throws(() => parseHole({
    ...HOLE_DATA,
    terrain: [{ x: 0, y: 0, surface: 'fairway' }, { x: 0, y: 1, surface: 'fairway' }],
  }), /ordered/);
  assert.throws(() => parseHole({
    ...HOLE_DATA,
    terrain: [{ x: 0, y: 0, surface: 'lava' }, { x: 10, y: 0, surface: 'fairway' }],
  }), /unknown surface/);
  assert.throws(() => parseHole({ ...HOLE_DATA, teeX: 500 }), /inside the terrain/);
});

test('heightAt interpolates linearly and clamps at the ends', () => {
  assert.equal(heightAt(hole, 5), 0);
  assert.equal(heightAt(hole, 25), 1); // halfway from (10,0) to (40,2)
  assert.equal(heightAt(hole, 70), 3); // halfway from (60,2) to (80,4)
  assert.equal(heightAt(hole, -50), 0);
  assert.equal(heightAt(hole, 500), 4);
});

test('slopeAt returns the segment gradient, zero outside', () => {
  assert.ok(Math.abs(slopeAt(hole, 25) - 2 / 30) < 1e-12);
  assert.equal(slopeAt(hole, 45), 0); // flat water segment
  assert.ok(Math.abs(slopeAt(hole, 70) - 0.1) < 1e-12);
  assert.equal(slopeAt(hole, -1), 0);
  assert.equal(slopeAt(hole, 101), 0);
});

test('surfaceAt maps x to the owning segment, out beyond the ends', () => {
  assert.equal(surfaceAt(hole, 5), 'rough');
  assert.equal(surfaceAt(hole, 15), 'fairway');
  assert.equal(surfaceAt(hole, 45), 'water');
  assert.equal(surfaceAt(hole, 85), 'green');
  assert.equal(surfaceAt(hole, -0.1), 'out');
  assert.equal(surfaceAt(hole, 100), 'out');
});

test('waterDropX drops just before the hazard entry edge', () => {
  assert.equal(waterDropX(hole, 50, 1.5), 38.5);
  assert.equal(surfaceAt(hole, waterDropX(hole, 50, 1.5)), 'fairway');
});

test('terrainAdapter exposes the queries bound to the hole', () => {
  const t = terrainAdapter(hole);
  assert.equal(t.heightAt(25), 1);
  assert.equal(t.surfaceAt(45), 'water');
  assert.ok(Math.abs(t.slopeAt(70) - 0.1) < 1e-12);
});
