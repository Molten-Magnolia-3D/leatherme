import type { BBox, Piece } from "@/lib/geometry/types";
import { ringBBox, scaleRing } from "@/lib/geometry/vec";

export function pieceBounds(piece: Piece, scalePct = 100): BBox {
  return ringBBox(scaleRing(piece.outline, scalePct / 100));
}

export function findPiece(pieces: Piece[], name: string): Piece | undefined {
  return pieces.find((piece) => piece.name.toLowerCase() === name.toLowerCase());
}
