import { describe, expect, it } from "vitest";
import { pieceBounds } from "@/lib/geometry/plate";
import { parseSvg } from "@/lib/import/svg";

function boxSvg(widthAttr: string, heightAttr: string, extra = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthAttr}" height="${heightAttr}" viewBox="0 0 100 50" ${extra}>
    <rect x="0" y="0" width="100" height="50" fill="none" stroke="#000"/>
  </svg>`;
}

describe("SVG physical size", () => {
  it("maps mm through the viewBox", () => {
    const result = parseSvg(boxSvg("10mm", "5mm"));
    const box = pieceBounds(result.pieces[0], 100);
    expect(box.width).toBeCloseTo(10, 3);
    expect(box.height).toBeCloseTo(5, 3);
  });

  it("maps cm through the viewBox", () => {
    const result = parseSvg(boxSvg("2cm", "1cm"));
    expect(pieceBounds(result.pieces[0], 100).width).toBeCloseTo(20, 3);
  });

  it("maps inches through the viewBox", () => {
    const result = parseSvg(boxSvg("1in", "0.5in"));
    expect(pieceBounds(result.pieces[0], 100).width).toBeCloseTo(25.4, 3);
  });

  it("maps points through the viewBox", () => {
    const result = parseSvg(boxSvg("72pt", "36pt"));
    expect(pieceBounds(result.pieces[0], 100).width).toBeCloseTo(25.4, 3);
  });

  it("treats Illustrator px as points and says so", () => {
    const result = parseSvg(boxSvg("72px", "36px"));
    expect(pieceBounds(result.pieces[0], 100).width).toBeCloseTo(25.4, 3);
    expect(result.notes.some((note) => note.kind === "illustrator-px")).toBe(true);
    expect(result.notes[0].message).toMatch(/1\/72 inch/);
  });

  it("treats a unitless SVG as millimeters and asks for confirmation", () => {
    const result = parseSvg(boxSvg("100", "50"));
    expect(pieceBounds(result.pieces[0], 100).width).toBeCloseTo(100, 3);
    expect(result.needsWidthConfirm).toBe(true);
    expect(result.notes.some((note) => note.kind === "unitless-svg")).toBe(true);
  });
});
