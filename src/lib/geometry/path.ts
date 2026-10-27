import type { Point, Ring } from "@/lib/geometry/types";
import { dist, lerp, openRing, pointsEqual } from "@/lib/geometry/vec";

const COMMANDS = /[MmLlHhVvCcSsQqTtAaZz]/;

export function parsePathD(d: string, tolerance = 0.15): Ring[] {
  const tokens = tokenize(d);
  const rings: Ring[] = [];
  let i = 0;
  let current = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };
  let lastControl: Point | null = null;
  let lastQuad: Point | null = null;
  let ring: Point[] = [];

  const flush = (closed: boolean) => {
    if (ring.length === 0) return;
    const pts = openRing(ring);
    if (pts.length >= (closed ? 3 : 2)) {
      rings.push(pts);
    }
    ring = [];
  };

  const push = (p: Point) => {
    if (ring.length === 0 || !pointsEqual(ring[ring.length - 1], p, 1e-5)) {
      ring.push(p);
    }
    current = p;
  };

  while (i < tokens.length) {
    const token = tokens[i];
    if (!COMMANDS.test(token)) {
      i += 1;
      continue;
    }
    const cmd = token;
    i += 1;
    const nums: number[] = [];
    while (i < tokens.length && !COMMANDS.test(tokens[i])) {
      const n = Number(tokens[i]);
      if (!Number.isNaN(n)) nums.push(n);
      i += 1;
    }
    const rel = cmd === cmd.toLowerCase();
    const type = cmd.toUpperCase();

    const abs = (x: number, y: number): Point =>
      rel ? { x: current.x + x, y: current.y + y } : { x, y };

    if (type === "M") {
      if (ring.length) flush(false);
      if (nums.length < 2) continue;
      const p = abs(nums[0], nums[1]);
      start = p;
      current = p;
      ring = [p];
      lastControl = null;
      lastQuad = null;
      for (let k = 2; k + 1 < nums.length; k += 2) {
        push(abs(nums[k], nums[k + 1]));
      }
      continue;
    }

    if (type === "Z") {
      push(start);
      flush(true);
      current = start;
      ring = [];
      lastControl = null;
      lastQuad = null;
      continue;
    }

    if (type === "L") {
      for (let k = 0; k + 1 < nums.length; k += 2) {
        push(abs(nums[k], nums[k + 1]));
      }
      lastControl = null;
      lastQuad = null;
      continue;
    }

    if (type === "H") {
      for (const x of nums) {
        push({ x: rel ? current.x + x : x, y: current.y });
      }
      lastControl = null;
      lastQuad = null;
      continue;
    }

    if (type === "V") {
      for (const y of nums) {
        push({ x: current.x, y: rel ? current.y + y : y });
      }
      lastControl = null;
      lastQuad = null;
      continue;
    }

    if (type === "C") {
      for (let k = 0; k + 5 < nums.length; k += 6) {
        const p1 = abs(nums[k], nums[k + 1]);
        const p2 = abs(nums[k + 2], nums[k + 3]);
        const p3 = abs(nums[k + 4], nums[k + 5]);
        flattenCubic(current, p1, p2, p3, push, tolerance);
        lastControl = p2;
        lastQuad = null;
      }
      continue;
    }

    if (type === "S") {
      for (let k = 0; k + 3 < nums.length; k += 4) {
        const p1 = lastControl
          ? { x: 2 * current.x - lastControl.x, y: 2 * current.y - lastControl.y }
          : current;
        const p2 = abs(nums[k], nums[k + 1]);
        const p3 = abs(nums[k + 2], nums[k + 3]);
        flattenCubic(current, p1, p2, p3, push, tolerance);
        lastControl = p2;
        lastQuad = null;
      }
      continue;
    }

    if (type === "Q") {
      for (let k = 0; k + 3 < nums.length; k += 4) {
        const p1 = abs(nums[k], nums[k + 1]);
        const p2 = abs(nums[k + 2], nums[k + 3]);
        flattenQuadratic(current, p1, p2, push, tolerance);
        lastQuad = p1;
        lastControl = null;
      }
      continue;
    }

    if (type === "T") {
      for (let k = 0; k + 1 < nums.length; k += 2) {
        const p1 = lastQuad
          ? { x: 2 * current.x - lastQuad.x, y: 2 * current.y - lastQuad.y }
          : current;
        const p2 = abs(nums[k], nums[k + 1]);
        flattenQuadratic(current, p1, p2, push, tolerance);
        lastQuad = p1;
        lastControl = null;
      }
      continue;
    }

    if (type === "A") {
      for (let k = 0; k + 6 < nums.length; k += 7) {
        const rx = nums[k];
        const ry = nums[k + 1];
        const rot = nums[k + 2];
        const large = nums[k + 3];
        const sweep = nums[k + 4];
        const end = abs(nums[k + 5], nums[k + 6]);
        flattenArc(current, end, rx, ry, rot, large === 1, sweep === 1, push, tolerance);
        lastControl = null;
        lastQuad = null;
      }
    }
  }

  if (ring.length) flush(false);
  return rings;
}

function tokenize(d: string): string[] {
  return d
    .replace(/,/g, " ")
    .replace(/([MmLlHhVvCcSsQqTtAaZz])/g, " $1 ")
    .replace(/([^\s])-/g, "$1 -")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function flattenCubic(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  push: (p: Point) => void,
  tolerance: number,
) {
  const rec = (a: Point, b: Point, c: Point, d: Point, depth: number) => {
    const chord = dist(a, d);
    const d1 = dist(a, b) + dist(b, c) + dist(c, d);
    if (depth > 10 || Math.abs(d1 - chord) < tolerance) {
      push(d);
      return;
    }
    const ab = lerp(a, b, 0.5);
    const bc = lerp(b, c, 0.5);
    const cd = lerp(c, d, 0.5);
    const abbc = lerp(ab, bc, 0.5);
    const bccd = lerp(bc, cd, 0.5);
    const mid = lerp(abbc, bccd, 0.5);
    rec(a, ab, abbc, mid, depth + 1);
    rec(mid, bccd, cd, d, depth + 1);
  };
  rec(p0, p1, p2, p3, 0);
}

function flattenQuadratic(
  p0: Point,
  p1: Point,
  p2: Point,
  push: (p: Point) => void,
  tolerance: number,
) {
  flattenCubic(
    p0,
    { x: p0.x + (2 / 3) * (p1.x - p0.x), y: p0.y + (2 / 3) * (p1.y - p0.y) },
    { x: p2.x + (2 / 3) * (p1.x - p2.x), y: p2.y + (2 / 3) * (p1.y - p2.y) },
    p2,
    push,
    tolerance,
  );
}

function flattenArc(
  start: Point,
  end: Point,
  rxIn: number,
  ryIn: number,
  phiDeg: number,
  large: boolean,
  sweep: boolean,
  push: (p: Point) => void,
  tolerance: number,
) {
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx < 1e-9 || ry < 1e-9) {
    push(end);
    return;
  }
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (start.x - end.x) / 2;
  const dy = (start.y - end.y) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
  }
  const rx2 = rx * rx;
  const ry2 = ry * ry;
  const num = Math.max(0, rx2 * ry2 - rx2 * y1 * y1 - ry2 * x1 * x1);
  let coef = Math.sqrt(num / (rx2 * y1 * y1 + ry2 * x1 * x1));
  if (large === sweep) coef = -coef;
  const cx1 = coef * ((rx * y1) / ry);
  const cy1 = coef * (-(ry * x1) / rx);
  const cx = cos * cx1 - sin * cy1 + (start.x + end.x) / 2;
  const cy = sin * cx1 + cos * cy1 + (start.y + end.y) / 2;
  const startAngle = Math.atan2((y1 - cy1) / ry, (x1 - cx1) / rx);
  const endVecx = (-x1 - cx1) / rx;
  const endVecy = (-y1 - cy1) / ry;
  let delta = Math.atan2(endVecy, endVecx) - startAngle;
  if (!sweep && delta > 0) delta -= Math.PI * 2;
  if (sweep && delta < 0) delta += Math.PI * 2;
  const steps = Math.max(8, Math.ceil(Math.abs(delta) / Math.max(0.12, tolerance)));
  for (let i = 1; i <= steps; i++) {
    const t = startAngle + (delta * i) / steps;
    const x = cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin;
    const y = cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos;
    push({ x, y });
  }
}

export function ellipseRing(cx: number, cy: number, rx: number, ry: number, steps = 48): Ring {
  const ring: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (Math.PI * 2 * i) / steps;
    ring.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
  }
  return ring;
}

export function rectRing(
  x: number,
  y: number,
  width: number,
  height: number,
  rx = 0,
  ry = 0,
): Ring {
  const crx = Math.min(Math.abs(rx), Math.abs(width) / 2);
  const cry = Math.min(Math.abs(ry), Math.abs(height) / 2);
  if (crx < 1e-6 || cry < 1e-6) {
    return [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];
  }
  const d = [
    `M ${x + crx} ${y}`,
    `H ${x + width - crx}`,
    `A ${crx} ${cry} 0 0 1 ${x + width} ${y + cry}`,
    `V ${y + height - cry}`,
    `A ${crx} ${cry} 0 0 1 ${x + width - crx} ${y + height}`,
    `H ${x + crx}`,
    `A ${crx} ${cry} 0 0 1 ${x} ${y + height - cry}`,
    `V ${y + cry}`,
    `A ${crx} ${cry} 0 0 1 ${x + crx} ${y}`,
    "Z",
  ].join(" ");
  return parsePathD(d)[0] ?? [];
}

export function parsePoints(points: string): Ring {
  return points
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .reduce<Point[]>((acc, value, index, arr) => {
      if (index % 2 === 0 && index + 1 < arr.length) {
        acc.push({ x: value, y: arr[index + 1] });
      }
      return acc;
    }, []);
}
