import { offsetRing, strokeRibbon } from "@/lib/geometry/offset";
import type { Piece, Ring, StitchPlan, StitchSettings } from "@/lib/geometry/types";
import {
  add,
  dist,
  mul,
  normalize,
  openRing,
  perp,
  pointAtLength,
  ringLength,
  scaleRing,
  tangentAtLength,
} from "@/lib/geometry/vec";

export function scalePiece(piece: Piece, factor: number): Piece {
  return {
    ...piece,
    outline: scaleRing(piece.outline, factor),
    holes: piece.holes.map((hole) => scaleRing(hole, factor)),
  };
}

export function planStitch(piece: Piece, settings: StitchSettings, scalePct: number): StitchPlan {
  const scaled = scalePiece(piece, scalePct / 100);
  const inset = -Math.max(0.2, settings.seamMm);
  const path = offsetRing(scaled.outline, inset);
  const holePaths = scaled.holes.map((hole) => offsetRing(hole, Math.max(0.2, settings.seamMm)));

  if (settings.mode === "solid") {
    return {
      path,
      holePaths,
      marks: [],
      markCount: 0,
      pitchMm: settings.markLengthMm + settings.gapMm,
      actualGapMm: settings.gapMm,
    };
  }

  const outlineMarks = placeMarks(path, settings.markLengthMm, settings.gapMm, settings.lineMm);
  const holeMarks = holePaths.flatMap((hole) =>
    placeMarks(hole, settings.markLengthMm, settings.gapMm, settings.lineMm).marks,
  );

  return {
    path,
    holePaths,
    marks: [...outlineMarks.marks, ...holeMarks],
    markCount: outlineMarks.markCount,
    pitchMm: outlineMarks.pitchMm,
    actualGapMm: outlineMarks.actualGapMm,
  };
}

export function placeMarks(
  ring: Ring,
  markLengthMm: number,
  gapMm: number,
  lineMm: number,
): { marks: Ring[]; markCount: number; pitchMm: number; actualGapMm: number } {
  const pts = openRing(ring);
  const perimeter = ringLength(pts);
  if (pts.length < 3 || perimeter < markLengthMm * 2) {
    return {
      marks: [],
      markCount: 0,
      pitchMm: markLengthMm + gapMm,
      actualGapMm: gapMm,
    };
  }

  const requestedPitch = Math.max(0.2, markLengthMm + gapMm);
  const markCount = Math.max(1, Math.round(perimeter / requestedPitch));
  const pitchMm = perimeter / markCount;
  const usableMark = Math.min(markLengthMm, pitchMm * 0.85);
  const actualGapMm = pitchMm - usableMark;

  const marks: Ring[] = [];
  for (let i = 0; i < markCount; i++) {
    const start = (i * pitchMm + actualGapMm / 2 + perimeter) % perimeter;
    marks.push(markSlot(pts, start, usableMark, lineMm));
  }

  return { marks, markCount, pitchMm, actualGapMm };
}

function markSlot(ring: Ring, start: number, length: number, width: number): Ring {
  const perimeter = ringLength(ring);
  const end = (start + length) % perimeter;
  const a = pointAtLength(ring, start);
  const b = pointAtLength(ring, end);
  const ta = tangentAtLength(ring, start);
  const tb = tangentAtLength(ring, end);
  const na = mul(perp(normalize(ta)), width / 2);
  const nb = mul(perp(normalize(tb)), width / 2);
  const cap = Math.min(width / 2, length / 2);
  const aBack = add(a, mul(normalize(ta), -cap * 0.15));
  const bFwd = add(b, mul(normalize(tb), cap * 0.15));
  return [
    add(aBack, na),
    add(bFwd, nb),
    add(bFwd, mul(nb, -1)),
    add(aBack, mul(na, -1)),
  ];
}

export function grooveRings(path: Ring, width: number): { outer: Ring; inner: Ring } | null {
  const outer = offsetRing(path, width / 2);
  const inner = offsetRing(path, -width / 2);
  if (outer.length < 3 || inner.length < 3) return null;
  return { outer, inner };
}

export function ribbonOrNull(path: Ring, width: number): Ring | null {
  const ribbon = strokeRibbon(path, width, true);
  return ribbon.length >= 4 ? ribbon : null;
}

export function stitchSummary(plan: StitchPlan): { markCount: number; pitchMm: number } {
  return { markCount: plan.markCount, pitchMm: plan.pitchMm };
}

export function pathHasSelfOverlap(ring: Ring): boolean {
  const pts = openRing(ring);
  return pts.some((p, i) => i > 0 && dist(p, pts[i - 1]) < 1e-6);
}
