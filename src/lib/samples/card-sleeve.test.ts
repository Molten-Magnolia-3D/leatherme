import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { pieceBounds, findPiece } from "@/lib/geometry/plate";
import { planStitch } from "@/lib/geometry/stitch";
import { parseSvg } from "@/lib/import/svg";
import { CARD_SLEEVE_SVG, loadCardSleeveSample } from "@/lib/samples/card-sleeve";

describe("card-sleeve sample", () => {
  const imported = loadCardSleeveSample();

  it("is also saved at public/samples/card-sleeve.svg", () => {
    const disk = readFileSync(path.resolve(process.cwd(), "public/samples/card-sleeve.svg"), "utf8");
    const fromDisk = parseSvg(disk, "card-sleeve.svg");
    expect(fromDisk.pieces).toHaveLength(4);
    expect(fromDisk.drawingWidthMm).toBeCloseTo(220);
  });

  it("reads four pieces and the 220 mm file note", () => {
    expect(imported.pieces).toHaveLength(4);
    expect(imported.drawingWidthMm).toBeCloseTo(220);
    expect(imported.notes.some((note) => /220 mm/i.test(note.message))).toBe(true);
  });

  it("keeps Card Body 100 × 72 mm at 100%", () => {
    const body = findPiece(imported.pieces, "Card Body");
    expect(body).toBeTruthy();
    const box = pieceBounds(body!, 100);
    expect(box.width).toBeCloseTo(100, 1);
    expect(box.height).toBeCloseTo(72, 1);
    expect(body!.holes).toHaveLength(0);
  });

  it("keeps Flap about 94 × 56 mm", () => {
    const flap = findPiece(imported.pieces, "Flap");
    expect(flap).toBeTruthy();
    const box = pieceBounds(flap!, 100);
    expect(box.width).toBeCloseTo(94, 1);
    expect(box.height).toBeCloseTo(56, 1);
  });

  it("keeps Strap 150 × 22 mm with one slot", () => {
    const strap = findPiece(imported.pieces, "Strap");
    expect(strap).toBeTruthy();
    const box = pieceBounds(strap!, 100);
    expect(box.width).toBeCloseTo(150, 1);
    expect(box.height).toBeCloseTo(22, 1);
    expect(strap!.holes).toHaveLength(1);
  });

  it("keeps Keeper 40 × 16 mm", () => {
    const keeper = findPiece(imported.pieces, "Keeper");
    expect(keeper).toBeTruthy();
    const box = pieceBounds(keeper!, 100);
    expect(box.width).toBeCloseTo(40, 1);
    expect(box.height).toBeCloseTo(16, 1);
  });

  it("ignores the open fold line and the inset stitch line on the body", () => {
    const names = imported.pieces.map((p) => p.name).sort();
    expect(names).toEqual(["Card Body", "Flap", "Keeper", "Strap"]);
    expect(CARD_SLEEVE_SVG).toMatch(/body-fold/);
    expect(CARD_SLEEVE_SVG).toMatch(/body-stitch/);
  });

  it("scales only the cut outline to 110 × 79.2 mm while stitch spacing stays in millimeters", () => {
    const body = findPiece(imported.pieces, "Card Body")!;
    const box = pieceBounds(body, 110);
    expect(box.width).toBeCloseTo(110, 1);
    expect(box.height).toBeCloseTo(79.2, 1);

    const at100 = planStitch(body, { ...DEFAULT_SETTINGS, mode: "marks" }, 100);
    const at110 = planStitch(body, { ...DEFAULT_SETTINGS, mode: "marks" }, 110);
    expect(at100.actualGapMm).toBeGreaterThan(2);
    expect(at110.actualGapMm).toBeGreaterThan(2);
    expect(Math.abs(at100.pitchMm - (DEFAULT_SETTINGS.markLengthMm + DEFAULT_SETTINGS.gapMm))).toBeLessThan(0.4);
    expect(Math.abs(at110.pitchMm - (DEFAULT_SETTINGS.markLengthMm + DEFAULT_SETTINGS.gapMm))).toBeLessThan(0.4);
    expect(at100.marks[0]).toBeTruthy();
  });
});
