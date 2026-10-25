import { classifyPieces } from "@/lib/geometry/classify";
import { ellipseRing } from "@/lib/geometry/path";
import type { ImportResult, Point, RawPath, ScaleNote } from "@/lib/geometry/types";
import { dxfUnitScaleMm } from "@/lib/import/units";

type Pair = { code: number; value: string };

export function parseDxf(text: string, sourceName = "pattern.dxf"): ImportResult {
  if (text.includes("\0") || text.includes("AcDbBinary")) {
    throw new Error("Binary DXF is not supported. Export an ASCII DXF.");
  }

  const pairs = parsePairs(text);
  const header = readHeader(pairs);
  const { scale, usedMeasurement } = dxfUnitScaleMm(header.insunits, header.measurement);
  const notes: ScaleNote[] = [];
  if (header.insunits == null || header.insunits === 0) {
    notes.push({
      kind: "dxf-measurement",
      message:
        header.measurement === 0
          ? "DXF $INSUNITS is unitless. $MEASUREMENT 0 was treated as inches."
          : "DXF $INSUNITS is unitless. $MEASUREMENT was treated as millimeters.",
    });
  }

  const paths = readEntities(pairs).map((path) => ({
    ...path,
    rings: path.rings.map((ring) => ring.map((p) => ({ x: p.x * scale, y: p.y * scale }))),
  }));

  const pieces = classifyPieces(paths);
  if (pieces.length === 0) {
    throw new Error("No closed outlines were found in this DXF.");
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const piece of pieces) {
    for (const p of piece.outline) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  return {
    sourceName,
    pieces,
    drawingWidthMm: maxX - minX,
    drawingHeightMm: maxY - minY,
    notes,
    needsWidthConfirm: usedMeasurement || header.insunits == null || header.insunits === 0,
    scaleTrusted: header.insunits != null && header.insunits !== 0,
  };
}

function parsePairs(text: string): Pair[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const pairs: Pair[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim());
    if (!Number.isFinite(code)) continue;
    pairs.push({ code, value: lines[i + 1].trim() });
  }
  return pairs;
}

function readHeader(pairs: Pair[]) {
  let insunits: number | null = null;
  let measurement: number | null = null;
  let inHeader = false;
  let varName = "";
  for (const pair of pairs) {
    if (pair.code === 0 && pair.value === "SECTION") inHeader = false;
    if (pair.code === 2 && pair.value === "HEADER") inHeader = true;
    if (pair.code === 0 && pair.value === "ENDSEC") inHeader = false;
    if (!inHeader) continue;
    if (pair.code === 9) varName = pair.value;
    if (varName === "$INSUNITS" && pair.code === 70) insunits = Number(pair.value);
    if (varName === "$MEASUREMENT" && pair.code === 70) measurement = Number(pair.value);
  }
  return { insunits, measurement };
}

function readEntities(pairs: Pair[]): RawPath[] {
  const paths: RawPath[] = [];
  let inEntities = false;
  let i = 0;
  while (i < pairs.length) {
    const pair = pairs[i];
    if (pair.code === 2 && pair.value === "ENTITIES") inEntities = true;
    if (pair.code === 0 && pair.value === "ENDSEC") inEntities = false;
    if (!inEntities || pair.code !== 0) {
      i += 1;
      continue;
    }
    const type = pair.value;
    const { fields, next } = collectEntity(pairs, i + 1);
    i = next;
    const path = entityToPath(type, fields, pairs, i);
    if (path.path) paths.push(path.path);
    if (path.skipTo != null) i = path.skipTo;
  }
  return paths;
}

function collectEntity(pairs: Pair[], start: number) {
  const fields: Pair[] = [];
  let i = start;
  while (i < pairs.length && pairs[i].code !== 0) {
    fields.push(pairs[i]);
    i += 1;
  }
  return { fields, next: i };
}

function entityToPath(
  type: string,
  fields: Pair[],
  pairs: Pair[],
  nextIndex: number,
): { path: RawPath | null; skipTo?: number } {
  const num = (code: number, fallback = 0) => {
    const found = fields.find((f) => f.code === code);
    return found ? Number(found.value) : fallback;
  };
  const nums = (code: number) => fields.filter((f) => f.code === code).map((f) => Number(f.value));

  if (type === "LWPOLYLINE") {
    const xs = nums(10);
    const ys = nums(20);
    const ring: Point[] = xs.map((x, i) => ({ x, y: ys[i] ?? 0 }));
    const closed = (num(70) & 1) === 1 || (ring.length >= 3 && closeEnough(ring[0], ring[ring.length - 1]));
    return { path: { rings: [ring], closed, filled: false, fillRule: "nonzero" } };
  }

  if (type === "POLYLINE") {
    const vertices: Point[] = [];
    let i = nextIndex;
    const closed = (num(70) & 1) === 1;
    while (i < pairs.length) {
      if (pairs[i].code === 0 && pairs[i].value === "SEQEND") {
        i += 1;
        break;
      }
      if (pairs[i].code === 0 && pairs[i].value === "VERTEX") {
        const { fields: vf, next } = collectEntity(pairs, i + 1);
        const x = Number(vf.find((f) => f.code === 10)?.value ?? 0);
        const y = Number(vf.find((f) => f.code === 20)?.value ?? 0);
        vertices.push({ x, y });
        i = next;
        continue;
      }
      if (pairs[i].code === 0) break;
      i += 1;
    }
    return {
      path: { rings: [vertices], closed, filled: false, fillRule: "nonzero" },
      skipTo: i,
    };
  }

  if (type === "LINE") {
    return {
      path: {
        rings: [[{ x: num(10), y: num(20) }, { x: num(11), y: num(21) }]],
        closed: false,
        filled: false,
        fillRule: "nonzero",
      },
    };
  }

  if (type === "CIRCLE") {
    return {
      path: {
        rings: [ellipseRing(num(10), num(20), num(40), num(40))],
        closed: true,
        filled: false,
        fillRule: "nonzero",
      },
    };
  }

  if (type === "ARC") {
    const cx = num(10);
    const cy = num(20);
    const r = num(40);
    const start = (num(50) * Math.PI) / 180;
    const end = (num(51) * Math.PI) / 180;
    const ring: Point[] = [];
    let delta = end - start;
    if (delta <= 0) delta += Math.PI * 2;
    const steps = Math.max(12, Math.ceil((delta * 24) / Math.PI));
    for (let s = 0; s <= steps; s++) {
      const t = start + (delta * s) / steps;
      ring.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
    }
    return { path: { rings: [ring], closed: Math.abs(delta - Math.PI * 2) < 1e-3, filled: false, fillRule: "nonzero" } };
  }

  return { path: null };
}

function closeEnough(a: Point, b: Point): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < 1e-6;
}
