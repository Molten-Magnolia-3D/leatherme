import { describe, expect, it } from "vitest";
import { pieceBounds } from "@/lib/geometry/plate";
import { parseDxf } from "@/lib/import/dxf";

function dxf(insunits: number | null, measurement: number | null) {
  return `0
SECTION
2
HEADER
9
$INSUNITS
70
${insunits ?? 0}
9
$MEASUREMENT
70
${measurement ?? 1}
0
ENDSEC
0
SECTION
2
ENTITIES
0
LWPOLYLINE
90
4
70
1
10
0
20
0
10
100
20
0
10
100
20
50
10
0
20
50
0
ENDSEC
0
EOF
`;
}

describe("DXF units", () => {
  it("uses $INSUNITS millimeters", () => {
    const result = parseDxf(dxf(4, 1));
    const box = pieceBounds(result.pieces[0], 100);
    expect(box.width).toBeCloseTo(100, 3);
    expect(box.height).toBeCloseTo(50, 3);
    expect(result.scaleTrusted).toBe(true);
  });

  it("uses $INSUNITS inches", () => {
    const result = parseDxf(dxf(1, 0));
    expect(pieceBounds(result.pieces[0], 100).width).toBeCloseTo(2540, 3);
  });

  it("falls back from unitless $INSUNITS to $MEASUREMENT 0 as inches", () => {
    const result = parseDxf(dxf(0, 0));
    expect(pieceBounds(result.pieces[0], 100).width).toBeCloseTo(2540, 3);
    expect(result.notes.some((note) => note.kind === "dxf-measurement")).toBe(true);
    expect(result.needsWidthConfirm).toBe(true);
  });

  it("falls back from unitless $INSUNITS to millimeters otherwise", () => {
    const result = parseDxf(dxf(0, 1));
    expect(pieceBounds(result.pieces[0], 100).width).toBeCloseTo(100, 3);
  });
});
