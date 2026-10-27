import {
  GUIDE_DISTANCE_MAX_MM,
  GUIDE_DISTANCE_MIN_MM,
} from "@/lib/defaults";
import type { Piece, RawPath, Ring } from "@/lib/geometry/types";
import {
  centroid,
  distToRing,
  ensureCcw,
  ensureCw,
  openRing,
  pointInRing,
  polygonArea,
  ringBBox,
  sampleRing,
  simplifyRing,
  tangentAtLength,
} from "@/lib/geometry/vec";

type Loop = {
  id?: string;
  name?: string;
  ring: Ring;
  area: number;
  holes: Ring[];
};

export function classifyPieces(paths: RawPath[]): Piece[] {
  const loops: Loop[] = [];

  for (const path of paths) {
    const closedRings = path.rings
      .map((ring) => simplifyRing(openRing(ring)))
      .filter((ring) => ring.length >= 3 && polygonArea(ring) > 0.25);

    if (!path.closed && closedRings.length === 0) continue;

    if (path.filled && path.fillRule === "evenodd" && closedRings.length > 1) {
      const sorted = closedRings
        .map((ring) => ({ ring: ensureCcw(ring), area: polygonArea(ring) }))
        .sort((a, b) => b.area - a.area);
      const outer = sorted[0];
      const holes = sorted.slice(1).filter((item) => ringInside(item.ring, outer.ring));
      loops.push({
        id: path.id,
        name: path.name,
        ring: outer.ring,
        area: outer.area,
        holes: holes.map((item) => ensureCw(item.ring)),
      });
      for (const leftover of sorted.slice(1)) {
        if (!holes.includes(leftover) && !ringInside(leftover.ring, outer.ring)) {
          loops.push({
            ring: leftover.ring,
            area: leftover.area,
            holes: [],
          });
        }
      }
      continue;
    }

    for (const ring of closedRings) {
      loops.push({
        id: path.id,
        name: path.name,
        ring: ensureCcw(ring),
        area: polygonArea(ring),
        holes: [],
      });
    }
  }

  const remaining = loops.filter((loop, index) => {
    return !loops.some((other, otherIndex) => {
      if (otherIndex === index || other.area <= loop.area * 1.02) return false;
      return isGuideLine(loop.ring, other.ring);
    });
  });

  remaining.sort((a, b) => b.area - a.area);
  const used = new Set<number>();
  const pieces: Piece[] = [];

  for (let i = 0; i < remaining.length; i++) {
    if (used.has(i)) continue;
    const outer = remaining[i];
    const holes = [...outer.holes];
    for (let j = i + 1; j < remaining.length; j++) {
      if (used.has(j)) continue;
      const inner = remaining[j];
      if (ringInside(inner.ring, outer.ring) && !isGuideLine(inner.ring, outer.ring)) {
        holes.push(ensureCw(inner.ring));
        used.add(j);
      }
    }
    pieces.push({
      id: outer.id || `piece-${pieces.length + 1}`,
      name: outer.name || defaultPieceName(outer.ring),
      outline: outer.ring,
      holes,
      included: true,
    });
  }

  return nameKnownPattern(pieces);
}

function ringInside(inner: Ring, outer: Ring): boolean {
  const samples = sampleRing(inner, 12);
  const hits = samples.filter((p) => pointInRing(p, outer)).length;
  return hits >= samples.length * 0.75 && polygonArea(inner) < polygonArea(outer) * 0.98;
}

export function isGuideLine(inner: Ring, outer: Ring): boolean {
  if (!ringInside(inner, outer)) return false;
  if (evenBBoxInset(inner, outer)) return true;

  const innerLen = Math.max(1e-6, samplePerimeter(inner));
  const outerLen = Math.max(1e-6, samplePerimeter(outer));
  if (innerLen < outerLen * 0.55) return false;

  const samples = sampleRing(inner, 24);
  if (samples.length < 6) return false;
  const distances = samples.map((p) => distToRing(p, outer));
  const min = Math.min(...distances);
  const max = Math.max(...distances);
  const mean = distances.reduce((s, d) => s + d, 0) / distances.length;
  if (mean < GUIDE_DISTANCE_MIN_MM || mean > GUIDE_DISTANCE_MAX_MM) return false;
  if (min < GUIDE_DISTANCE_MIN_MM * 0.5 || max > GUIDE_DISTANCE_MAX_MM * 1.35) return false;
  const span = max - min;
  const even = span <= 3.2 || max / Math.max(min, 0.2) <= 2.1;
  if (!even) return false;

  const aligned = samples.filter((p, i) => {
    const tInner = tangentAtLength(inner, (innerLen * i) / samples.length);
    const nearest = nearestPoint(p, outer);
    const tOuter = nearest.tangent;
    return Math.abs(tInner.x * tOuter.x + tInner.y * tOuter.y) > 0.72;
  }).length;
  return aligned >= samples.length * 0.65;
}

function evenBBoxInset(inner: Ring, outer: Ring): boolean {
  const ib = ringBBox(inner);
  const ob = ringBBox(outer);
  const insets = [ib.minX - ob.minX, ob.maxX - ib.maxX, ib.minY - ob.minY, ob.maxY - ib.maxY];
  const mean = insets.reduce((s, d) => s + d, 0) / insets.length;
  if (mean < GUIDE_DISTANCE_MIN_MM || mean > GUIDE_DISTANCE_MAX_MM) return false;
  return insets.every((d) => Math.abs(d - mean) <= 2.4);
}

function samplePerimeter(ring: Ring): number {
  const pts = openRing(ring);
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    total += Math.hypot(a.x - b.x, a.y - b.y);
  }
  return total;
}

function nearestPoint(point: { x: number; y: number }, ring: Ring) {
  const pts = openRing(ring);
  let best = { dist: Infinity, tangent: { x: 1, y: 0 } };
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lengthSq = abx * abx + aby * aby;
    const t = lengthSq < 1e-12 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSq));
    const px = a.x + abx * t;
    const py = a.y + aby * t;
    const d = Math.hypot(point.x - px, point.y - py);
    if (d < best.dist) {
      const len = Math.hypot(abx, aby) || 1;
      best = { dist: d, tangent: { x: abx / len, y: aby / len } };
    }
  }
  return best;
}

function defaultPieceName(ring: Ring): string {
  const box = ringBBox(ring);
  return `${roundNice(box.width)} × ${roundNice(box.height)} mm`;
}

function roundNice(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function nameKnownPattern(pieces: Piece[]): Piece[] {
  return pieces.map((piece) => {
    if (piece.name && !/^\d/.test(piece.name) && !piece.name.includes("×")) {
      return piece;
    }
    const box = ringBBox(piece.outline);
    const named = guessCardSleeveName(box.width, box.height, piece.holes.length);
    return named ? { ...piece, name: named } : piece;
  });
}

function guessCardSleeveName(width: number, height: number, holes: number): string | null {
  const pairs = [
    { name: "Card Body", w: 100, h: 72 },
    { name: "Flap", w: 94, h: 56 },
    { name: "Strap", w: 150, h: 22 },
    { name: "Keeper", w: 40, h: 16 },
  ];
  for (const pair of pairs) {
    const match =
      (near(width, pair.w) && near(height, pair.h)) ||
      (near(width, pair.h) && near(height, pair.w));
    if (match && (pair.name !== "Strap" || holes >= 0)) return pair.name;
  }
  return null;
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1.6, b * 0.04);
}

export { centroid };
