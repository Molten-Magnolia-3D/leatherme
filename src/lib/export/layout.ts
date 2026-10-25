import { BED_GAP_MM, BED_SIZE_MM } from "@/lib/defaults";
import type { Piece } from "@/lib/geometry/types";
import { ringBBox } from "@/lib/geometry/vec";

export type PlacedPiece = {
  piece: Piece;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function layoutPieces(
  pieces: Piece[],
  bed = BED_SIZE_MM,
  gap = BED_GAP_MM,
): PlacedPiece[] {
  const items = pieces
    .filter((piece) => piece.included)
    .map((piece) => {
      const box = ringBBox(piece.outline);
      return { piece, width: box.width, height: box.height };
    })
    .sort((a, b) => b.height - a.height || b.width - a.width);

  const placed: PlacedPiece[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;

  for (const item of items) {
    if (x > 0 && x + item.width > bed) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    placed.push({
      piece: item.piece,
      x: x + item.width / 2,
      y: y + item.height / 2,
      width: item.width,
      height: item.height,
    });
    x += item.width + gap;
    rowH = Math.max(rowH, item.height);
  }

  return placed;
}
