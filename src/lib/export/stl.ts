import type { TriangleMesh } from "@/lib/geometry/types";

export function meshToStl(mesh: TriangleMesh, name = "Leatherme"): Blob {
  const triangles = mesh.faces.length;
  const buffer = new ArrayBuffer(84 + triangles * 50);
  const view = new DataView(buffer);
  const header = `Leatherme ${name} millimeters`.padEnd(80, " ").slice(0, 80);
  for (let i = 0; i < 80; i++) view.setUint8(i, header.charCodeAt(i));
  view.setUint32(80, triangles, true);
  let offset = 84;
  for (const [ia, ib, ic] of mesh.faces) {
    const a = mesh.vertices[ia];
    const b = mesh.vertices[ib];
    const c = mesh.vertices[ic];
    if (!a || !b || !c) continue;
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const len = Math.hypot(nx, ny, nz) || 1;
    view.setFloat32(offset, nx / len, true);
    view.setFloat32(offset + 4, ny / len, true);
    view.setFloat32(offset + 8, nz / len, true);
    writeVertex(view, offset + 12, a);
    writeVertex(view, offset + 24, b);
    writeVertex(view, offset + 36, c);
    view.setUint16(offset + 48, 0, true);
    offset += 50;
  }
  return new Blob([buffer], { type: "model/stl" });
}

function writeVertex(view: DataView, offset: number, v: [number, number, number]) {
  view.setFloat32(offset, v[0], true);
  view.setFloat32(offset + 4, v[1], true);
  view.setFloat32(offset + 8, v[2], true);
}
