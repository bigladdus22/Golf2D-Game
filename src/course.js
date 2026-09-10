// Hole loading + terrain queries. Pure functions except loadHole (fetch).
//
// Hole JSON shape:
//   { "par": 4, "teeX": 20, "cupX": 356,
//     "terrain": [ { "x": 0, "y": 0, "surface": "rough" }, ... ] }
// Terrain points are ordered by x; each point's surface tags the segment
// from that point to the next one. Outside the terrain range is out of
// bounds. Heights interpolate linearly along each segment.

export const SURFACES = ['fairway', 'rough', 'green', 'bunker', 'water', 'out'];

export function parseHole(data) {
  if (!Number.isFinite(data.par) || !Number.isFinite(data.teeX) || !Number.isFinite(data.cupX)) {
    throw new Error('hole needs numeric par, teeX, cupX');
  }
  const points = data.terrain;
  if (!Array.isArray(points) || points.length < 2) {
    throw new Error('hole terrain needs at least two points');
  }
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      throw new Error(`terrain point ${i} needs numeric x, y`);
    }
    if (i > 0 && p.x <= points[i - 1].x) {
      throw new Error(`terrain points must be ordered by x (point ${i})`);
    }
    if (i < points.length - 1 && !SURFACES.includes(p.surface)) {
      throw new Error(`terrain point ${i} has unknown surface "${p.surface}"`);
    }
  }
  const first = points[0].x;
  const last = points.at(-1).x;
  if (data.teeX <= first || data.teeX >= last || data.cupX <= first || data.cupX >= last) {
    throw new Error('teeX and cupX must lie inside the terrain range');
  }
  return { par: data.par, teeX: data.teeX, cupX: data.cupX, points };
}

// Index of the segment containing x (clamped to the ends).
function segmentIndex(points, x) {
  let i = 0;
  while (i < points.length - 2 && points[i + 1].x <= x) i++;
  return i;
}

export function heightAt(hole, x) {
  const pts = hole.points;
  if (x <= pts[0].x) return pts[0].y;
  if (x >= pts.at(-1).x) return pts.at(-1).y;
  const i = segmentIndex(pts, x);
  const a = pts[i];
  const b = pts[i + 1];
  const t = (x - a.x) / (b.x - a.x);
  return a.y + t * (b.y - a.y);
}

export function slopeAt(hole, x) {
  const pts = hole.points;
  if (x <= pts[0].x || x >= pts.at(-1).x) return 0;
  const i = segmentIndex(pts, x);
  const a = pts[i];
  const b = pts[i + 1];
  return (b.y - a.y) / (b.x - a.x);
}

export function surfaceAt(hole, x) {
  const pts = hole.points;
  if (x < pts[0].x || x >= pts.at(-1).x) return 'out';
  return pts[segmentIndex(pts, x)].surface;
}

// Where to drop after finding water at x: just before the hazard's entry
// edge, walking left past any adjacent water segments.
export function waterDropX(hole, x, margin) {
  const pts = hole.points;
  let i = segmentIndex(pts, x);
  while (i > 0 && pts[i - 1].surface === 'water') i--;
  return pts[i].x - margin;
}

// Bundles the queries the physics needs, closed over one hole.
export function terrainAdapter(hole) {
  return {
    heightAt: (x) => heightAt(hole, x),
    slopeAt: (x) => slopeAt(hole, x),
    surfaceAt: (x) => surfaceAt(hole, x),
  };
}

export async function loadHole(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to load hole: ${url} (${res.status})`);
  return parseHole(await res.json());
}
