import { describe, expect, it } from "vitest";
import { classifyPieces } from "@/lib/geometry/classify";
import { placeMarks } from "@/lib/geometry/stitch";
import type { RawPath } from "@/lib/geometry/types";
import { parseSvg } from "@/lib/import/svg";

describe("outline classification", () => {
  it("ignores open fold lines", () => {
    const result = parseSvg(`<svg width="80mm" height="40mm" viewBox="0 0 80 40">
      <rect x="0" y="0" width="80" height="40" fill="none"/>
      <line x1="0" y1="20" x2="80" y2="20"/>
    </svg>`);
    expect(result.pieces).toHaveLength(1);
  });

  it("turns smaller outlines inside a piece into holes", () => {
    const result = parseSvg(`<svg width="80mm" height="40mm" viewBox="0 0 80 40">
      <rect x="0" y="0" width="80" height="40" fill="none"/>
      <rect x="10" y="12" width="16" height="10" fill="none"/>
    </svg>`);
    expect(result.pieces).toHaveLength(1);
    expect(result.pieces[0].holes).toHaveLength(1);
  });

  it("treats evenodd inner subpaths as holes", () => {
    const result = parseSvg(`<svg width="100mm" height="80mm" viewBox="0 0 100 80">
      <path fill-rule="evenodd" fill="#000" d="M0 0 H100 V80 H0 Z M20 20 H40 V40 H20 Z"/>
    </svg>`);
    expect(result.pieces).toHaveLength(1);
    expect(result.pieces[0].holes).toHaveLength(1);
  });

  it("ignores a short even inset that looks like a stitch line", () => {
    const paths: RawPath[] = [
      {
        closed: true,
        filled: false,
        fillRule: "nonzero",
        rings: [
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 72 },
            { x: 0, y: 72 },
          ],
        ],
      },
      {
        closed: true,
        filled: false,
        fillRule: "nonzero",
        rings: [
          [
            { x: 3.5, y: 3.5 },
            { x: 96.5, y: 3.5 },
            { x: 96.5, y: 68.5 },
            { x: 3.5, y: 68.5 },
          ],
        ],
      },
    ];
    const pieces = classifyPieces(paths);
    expect(pieces).toHaveLength(1);
    expect(pieces[0].holes).toHaveLength(0);
  });
});

describe("stitch marks", () => {
  it("spaces marks so the last gap matches and reports count and pitch", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
    ];
    const plan = placeMarks(square, 2.5, 2.5, 0.9);
    expect(plan.markCount).toBeGreaterThan(10);
    expect(plan.pitchMm).toBeCloseTo(2.5 + 2.5, 1);
    expect(plan.marks).toHaveLength(plan.markCount);
    const perimeter = 200;
    expect(plan.markCount * plan.pitchMm).toBeCloseTo(perimeter, 5);
  });
});
