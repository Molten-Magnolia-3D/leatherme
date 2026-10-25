import type { BBox, Point, Ring } from "@/lib/geometry/types";

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function mul(a: Point, s: number): Point {
  return { x: a.x * s, y: a.y * s };
}

export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

export function len(a: Point): number {
  return Math.hypot(a.x, a.y);
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(a: Point): Point {
  const l = len(a);
  if (l < 1e-12) return { x: 0, y: 0 };
  return { x: a.x / l, y: a.y / l };
}

export function perp(a: Point): Point {
  return { x: -a.y, y: a.x };
}

export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function almostEqual(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps;
}

export function pointsEqual(a: Point, b: Point, eps = 1e-6): boolean {
  return dist(a, b) <= eps;
}

export function signedArea(ring: Ring): number {
  const pts = openRing(ring);
  if (pts.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return area / 2;
}

export function polygonArea(ring: Ring): number {
  return Math.abs(signedArea(ring));
}

export function ensureCcw(ring: Ring): Ring {
  const pts = openRing(ring);
  if (signedArea(pts) < 0) return pts.slice().reverse();
  return pts;
}

export function ensureCw(ring: Ring): Ring {
  const pts = openRing(ring);
  if (signedArea(pts) > 0) return pts.slice().reverse();
  return pts;
}

export function openRing(ring: Ring): Ring {
  if (ring.length >= 2 && pointsEqual(ring[0], ring[ring.length - 1])) {
    return ring.slice(0, -1);
  }
  return ring;
}

export function closeRing(ring: Ring): Ring {
  const pts = openRing(ring);
  if (pts.length === 0) return [];
  return [...pts, { ...pts[0] }];
}

export function ringBBox(ring: Ring): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of ring) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function ringsBBox(rings: Ring[]): BBox {
  const boxes = rings.map(ringBBox);
  if (boxes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  const minX = Math.min(...boxes.map((b) => b.minX));
  const minY = Math.min(...boxes.map((b) => b.minY));
  const maxX = Math.max(...boxes.map((b) => b.maxX));
  const maxY = Math.max(...boxes.map((b) => b.maxY));
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function centroid(ring: Ring): Point {
  const pts = openRing(ring);
  if (pts.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}

export function pointInRing(point: Point, ring: Ring): boolean {
  const pts = openRing(ring);
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    const intersect =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y + 1e-15) + a.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function distToSegment(point: Point, a: Point, b: Point): number {
  const ab = sub(b, a);
  const lengthSq = dot(ab, ab);
  if (lengthSq < 1e-16) return dist(point, a);
  const t = Math.max(0, Math.min(1, dot(sub(point, a), ab) / lengthSq));
  return dist(point, add(a, mul(ab, t)));
}

export function distToRing(point: Point, ring: Ring): number {
  const pts = openRing(ring);
  if (pts.length === 0) return Infinity;
  if (pts.length === 1) return dist(point, pts[0]);
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    best = Math.min(best, distToSegment(point, pts[i], pts[(i + 1) % pts.length]));
  }
  return best;
}

export function ringLength(ring: Ring): number {
  const pts = closeRing(ring);
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += dist(pts[i - 1], pts[i]);
  }
  return total;
}

export function sampleRing(ring: Ring, count: number): Point[] {
  const pts = openRing(ring);
  if (pts.length === 0) return [];
  if (pts.length === 1) return [{ ...pts[0] }];
  const total = ringLength(pts);
  if (total < 1e-9) return [{ ...pts[0] }];
  const samples: Point[] = [];
  for (let i = 0; i < count; i++) {
    samples.push(pointAtLength(pts, (total * i) / count));
  }
  return samples;
}

export function pointAtLength(ring: Ring, target: number): Point {
  const pts = closeRing(ring);
  if (pts.length === 0) return { x: 0, y: 0 };
  if (target <= 0) return { ...pts[0] };
  let walked = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = dist(pts[i - 1], pts[i]);
    if (walked + seg >= target || i === pts.length - 1) {
      const t = seg < 1e-12 ? 0 : (target - walked) / seg;
      return lerp(pts[i - 1], pts[i], Math.max(0, Math.min(1, t)));
    }
    walked += seg;
  }
  return { ...pts[pts.length - 1] };
}

export function tangentAtLength(ring: Ring, target: number): Point {
  const pts = closeRing(ring);
  if (pts.length < 2) return { x: 1, y: 0 };
  let walked = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = dist(pts[i - 1], pts[i]);
    if (walked + seg >= target || i === pts.length - 1) {
      return normalize(sub(pts[i], pts[i - 1]));
    }
    walked += seg;
  }
  return normalize(sub(pts[pts.length - 1], pts[pts.length - 2]));
}

export function scaleRing(ring: Ring, factor: number): Ring {
  return ring.map((p) => mul(p, factor));
}

export function translateRing(ring: Ring, dx: number, dy: number): Ring {
  return ring.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

export function simplifyRing(ring: Ring, epsilon = 0.02): Ring {
  const pts = openRing(ring);
  if (pts.length <= 3) return pts;
  const keep = new Array(pts.length).fill(false);
  keep[0] = true;
  keep[pts.length - 1] = true;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let index = start;
    for (let i = start + 1; i < end; i++) {
      const d = distToSegment(pts[i], pts[start], pts[end]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > epsilon) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  const out = pts.filter((_, i) => keep[i]);
  return out.length >= 3 ? out : pts;
}
