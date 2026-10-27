import earcut from "earcut";
import { GROOVE_DEPTH_MM } from "@/lib/defaults";
import { grooveRings } from "@/lib/geometry/stitch";
import type { Piece, Ring, StitchPlan, StitchSettings, TriangleMesh } from "@/lib/geometry/types";
import { ensureCcw, ensureCw, openRing, ringBBox, scaleRing } from "@/lib/geometry/vec";

export function buildPlateMesh(
  piece: Piece,
  settings: StitchSettings,
  scalePct: number,
  plan: StitchPlan,
): TriangleMesh {
  const factor = scalePct / 100;
  const outline = ensureCcw(scaleRing(piece.outline, factor));
  const holes = piece.holes.map((hole) => ensureCw(scaleRing(hole, factor)));
  const height = settings.plateHeightMm;
  const grooveDepth = Math.min(GROOVE_DEPTH_MM, Math.max(0.4, height * 0.35));
  const mesh: TriangleMesh = { vertices: [], faces: [] };
  const box = ringBBox(outline);

  const throughHoles =
    settings.mode === "marks" ? [...holes, ...plan.marks.map((mark) => ensureCw(mark))] : holes;

  addPrism(mesh, outline, throughHoles, 0, height - (settings.mode === "solid" ? grooveDepth : 0), true);

  if (settings.mode === "solid") {
    const grooves = [grooveRings(plan.path, settings.lineMm)].concat(
      plan.holePaths.map((path) => grooveRings(path, settings.lineMm)),
    );
    const topHoles = [...throughHoles];
    const floors: { outer: Ring; inner: Ring }[] = [];
    for (const groove of grooves) {
      if (!groove) continue;
      topHoles.push(ensureCw(groove.outer));
      floors.push({ outer: ensureCcw(groove.outer), inner: ensureCw(groove.inner) });
    }
    addPrism(mesh, outline, topHoles, height - grooveDepth, height, false);
    for (const floor of floors) {
      addFace(mesh, floor.outer, [floor.inner], height - grooveDepth, true);
      addWalls(mesh, floor.outer, height - grooveDepth, height);
      addWalls(mesh, openRing(floor.inner), height - grooveDepth, height);
      addFace(mesh, ensureCcw(openRing(floor.inner)), [], height, true);
    }
  } else {
    addFace(mesh, outline, throughHoles, height, true);
    addFace(mesh, outline, throughHoles, 0, false);
    addWalls(mesh, outline, 0, height);
    for (const hole of throughHoles) addWalls(mesh, hole, 0, height);
  }

  centerMesh(mesh, box.minX + box.width / 2, box.minY + box.height / 2);
  return mesh;
}

function addPrism(
  mesh: TriangleMesh,
  outline: Ring,
  holes: Ring[],
  z0: number,
  z1: number,
  includeBottom: boolean,
) {
  if (includeBottom) addFace(mesh, outline, holes, z0, false);
  addFace(mesh, outline, holes, z1, true);
  addWalls(mesh, outline, z0, z1);
  for (const hole of holes) addWalls(mesh, hole, z0, z1);
}

function addFace(mesh: TriangleMesh, outline: Ring, holes: Ring[], z: number, upward: boolean) {
  const outer = openRing(outline);
  const inner = holes.map((hole) => openRing(hole));
  const verts: number[] = [];
  const holeIndices: number[] = [];
  for (const p of outer) verts.push(p.x, p.y);
  for (const hole of inner) {
    holeIndices.push(verts.length / 2);
    for (const p of hole) verts.push(p.x, p.y);
  }
  let triangles: number[] = [];
  try {
    triangles = earcut(verts, holeIndices, 2);
  } catch {
    triangles = [];
  }
  const start = mesh.vertices.length;
  const allPts = [
    ...outer,
    ...inner.flatMap((hole) => hole),
  ];
  for (const p of allPts) mesh.vertices.push([p.x, p.y, z]);
  for (let i = 0; i < triangles.length; i += 3) {
    const a = start + triangles[i];
    const b = start + triangles[i + 1];
    const c = start + triangles[i + 2];
    mesh.faces.push(upward ? [a, b, c] : [a, c, b]);
  }
}

function addWalls(mesh: TriangleMesh, ring: Ring, z0: number, z1: number) {
  const pts = openRing(ring);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const i0 = mesh.vertices.length;
    mesh.vertices.push([a.x, a.y, z0], [b.x, b.y, z0], [b.x, b.y, z1], [a.x, a.y, z1]);
    mesh.faces.push([i0, i0 + 1, i0 + 2], [i0, i0 + 2, i0 + 3]);
  }
}

function centerMesh(mesh: TriangleMesh, cx: number, cy: number) {
  for (const v of mesh.vertices) {
    v[0] -= cx;
    v[1] -= cy;
  }
}

export function meshFromLayout(
  pieces: { piece: Piece; x: number; y: number }[],
  settings: StitchSettings,
  scalePct: number,
  plans: StitchPlan[],
): TriangleMesh {
  const combined: TriangleMesh = { vertices: [], faces: [] };
  pieces.forEach((placed, index) => {
    const mesh = buildPlateMesh(placed.piece, settings, scalePct, plans[index]);
    const offset = combined.vertices.length;
    for (const v of mesh.vertices) {
      combined.vertices.push([v[0] + placed.x, v[1] + placed.y, v[2]]);
    }
    for (const f of mesh.faces) {
      combined.faces.push([f[0] + offset, f[1] + offset, f[2] + offset]);
    }
  });
  return combined;
}
