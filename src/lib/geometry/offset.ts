import type { Point, Ring } from "@/lib/geometry/types";
import {
  add,
  cross,
  dist,
  dot,
  ensureCcw,
  mul,
  normalize,
  openRing,
  perp,
  sub,
} from "@/lib/geometry/vec";

export function offsetRing(ring: Ring, distance: number): Ring {
  const pts = ensureCcw(openRing(ring));
  if (pts.length < 3 || Math.abs(distance) < 1e-9) return pts.map((p) => ({ ...p }));
  const out: Point[] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    const e1 = normalize(sub(curr, prev));
    const e2 = normalize(sub(next, curr));
    const n1 = perp(e1);
    const n2 = perp(e2);
    // CCW left-normal points inward; negative distance insets the cut.
    const inward = distance < 0;
    const s = inward ? -1 : 1;
    const nn1 = mul(n1, s);
    const nn2 = mul(n2, s);
    const mag = Math.abs(distance);
    const join = normalize(add(nn1, nn2));
    const denom = Math.max(0.2, Math.abs(dot(join, nn1)));
    let miter = mag / denom;
    if (miter > mag * 4) miter = mag * 4;
    const turning = cross(e1, e2);
    if (inward && turning < -0.15) {
      out.push(add(curr, mul(nn1, mag)), add(curr, mul(nn2, mag)));
    } else {
      out.push(add(curr, mul(join, miter)));
    }
  }
  return cleanOffset(out, Math.abs(distance) * 0.15);
}

function cleanOffset(ring: Ring, minEdge: number): Ring {
  const cleaned: Point[] = [];
  for (const p of ring) {
    if (cleaned.length === 0 || dist(cleaned[cleaned.length - 1], p) > Math.max(0.05, minEdge * 0.2)) {
      cleaned.push(p);
    }
  }
  if (cleaned.length >= 2 && dist(cleaned[0], cleaned[cleaned.length - 1]) <= 0.05) {
    cleaned.pop();
  }
  return cleaned.length >= 3 ? cleaned : ring;
}

export function strokeRibbon(centerline: Ring, width: number, closed = true): Ring {
  const half = width / 2;
  const pts = openRing(centerline);
  if (pts.length < 2) return [];
  const left = offsetPolyline(pts, half, closed);
  const right = offsetPolyline(pts, -half, closed);
  return [...left, ...right.slice().reverse()];
}

export function offsetPolyline(points: Ring, distance: number, closed: boolean): Ring {
  const pts = openRing(points);
  if (pts.length < 2) return pts.map((p) => ({ ...p }));
  const out: Point[] = [];
  const count = pts.length;
  const last = closed ? count : count - 1;
  for (let i = 0; i < (closed ? count : count); i++) {
    const prev = pts[closed ? (i - 1 + count) % count : Math.max(0, i - 1)];
    const curr = pts[i];
    const next = pts[closed ? (i + 1) % count : Math.min(count - 1, i + 1)];
    const incoming = normalize(sub(curr, prev));
    const outgoing = normalize(sub(next, curr));
    const n1 = normalize(perp(i === 0 && !closed ? outgoing : incoming));
    const n2 = normalize(perp(i === last && !closed ? incoming : outgoing));
    const join = normalize(add(n1, n2));
    const used = join.x === 0 && join.y === 0 ? n1 : join;
    const denom = Math.max(0.25, Math.abs(dot(used, n1) || 1));
    out.push(add(curr, mul(used, distance / denom)));
  }
  return out;
}
