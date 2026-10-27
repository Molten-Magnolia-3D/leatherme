import JSZip from "jszip";
import { BED_GAP_MM, BED_SIZE_MM } from "@/lib/defaults";
import { meshTo3mf } from "@/lib/export/threemf";
import { layoutPieces } from "@/lib/export/layout";
import { meshToStl } from "@/lib/export/stl";
import { buildPlateMesh, meshFromLayout } from "@/lib/geometry/mesh";
import { planStitch, scalePiece } from "@/lib/geometry/stitch";
import type { Piece, StitchSettings } from "@/lib/geometry/types";
import { slugify } from "@/lib/utils";

export type ExportFormat = "stl" | "3mf";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPiece(
  piece: Piece,
  settings: StitchSettings,
  scalePct: number,
  format: ExportFormat,
) {
  const plan = planStitch(piece, settings, scalePct);
  const mesh = buildPlateMesh(piece, settings, scalePct, plan);
  const blob = format === "stl" ? meshToStl(mesh, piece.name) : meshTo3mf(mesh, piece.name);
  downloadBlob(blob, `${slugify(piece.name) || "piece"}.${format}`);
}

export async function exportZip(
  pieces: Piece[],
  settings: StitchSettings,
  scalePct: number,
  format: ExportFormat,
  sourceName: string,
) {
  const included = pieces.filter((piece) => piece.included);
  if (included.length === 0) throw new Error("Include at least one piece.");
  const zip = new JSZip();
  const folder = zip.folder("leatherme")!;
  const plans = included.map((piece) => planStitch(piece, settings, scalePct));

  included.forEach((piece, index) => {
    const mesh = buildPlateMesh(piece, settings, scalePct, plans[index]);
    const blob = format === "stl" ? meshToStl(mesh, piece.name) : meshTo3mf(mesh, piece.name);
    folder.file(`${slugify(piece.name) || `piece-${index + 1}`}.${format}`, blob);
  });

  const scaled = included.map((piece) => scalePiece(piece, scalePct / 100));
  const placed = layoutPieces(scaled, BED_SIZE_MM, BED_GAP_MM);
  const layoutMesh = meshFromLayout(
    placed.map((item, index) => ({
      piece: included[index],
      x: item.x,
      y: item.y,
    })),
    settings,
    scalePct,
    plans,
  );
  const layoutBlob =
    format === "stl" ? meshToStl(layoutMesh, "layout") : meshTo3mf(layoutMesh, "layout");
  folder.file(`layout-200mm-bed.${format}`, layoutBlob);
  folder.file(
    "readme.txt",
    [
      "Leatherme export",
      `Source: ${sourceName}`,
      `Format: ${format.toUpperCase()}`,
      format === "stl"
        ? "STL has no unit tag. Set your slicer to millimeters."
        : "3MF records millimeters.",
      `Layout is packed on a ${BED_SIZE_MM} mm bed with an ${BED_GAP_MM} mm gap.`,
    ].join("\n"),
  );

  const packed = await zip.generateAsync({ type: "blob" });
  downloadBlob(packed, `${slugify(sourceName.replace(/\.[^.]+$/, "")) || "leatherme"}-plates.zip`);
}
