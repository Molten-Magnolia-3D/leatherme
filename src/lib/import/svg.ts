import { classifyPieces } from "@/lib/geometry/classify";
import { ellipseRing, parsePathD, parsePoints, rectRing } from "@/lib/geometry/path";
import type { ImportResult, Point, RawPath, Ring, ScaleNote } from "@/lib/geometry/types";
import { ringsBBox } from "@/lib/geometry/vec";
import { lengthToMm, parseLength } from "@/lib/import/units";

type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export function parseSvg(svgText: string, sourceName = "pattern.svg"): ImportResult {
  const notes: ScaleNote[] = [];
  const comments = [...svgText.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1].trim());
  for (const comment of comments) {
    if (/width/i.test(comment) || /220/i.test(comment) || /sample/i.test(comment)) {
      notes.push({ kind: "file-note", message: comment.replace(/\s+/g, " ") });
    }
  }

  const root = firstTag(svgText, "svg");
  if (!root) {
    throw new Error("No <svg> root found.");
  }

  const widthLen = parseLength(root.attrs.width);
  const heightLen = parseLength(root.attrs.height);
  const viewBox = parseViewBox(root.attrs.viewBox);
  const usedPx = widthLen?.unit === "px" || heightLen?.unit === "px";
  const unitless = (!!widthLen && widthLen.unit == null) || (!widthLen && !viewBox);

  let drawingWidthMm: number;
  let drawingHeightMm: number;
  let sx: number;
  let sy: number;
  let ox = 0;
  let oy = 0;

  if (widthLen && widthLen.unit) {
    drawingWidthMm = lengthToMm(widthLen, true);
    if (heightLen && heightLen.unit) {
      drawingHeightMm = lengthToMm(heightLen, true);
    } else if (viewBox) {
      drawingHeightMm = drawingWidthMm * (viewBox.height / viewBox.width);
    } else {
      drawingHeightMm = drawingWidthMm;
    }
    if (viewBox) {
      sx = drawingWidthMm / viewBox.width;
      sy = drawingHeightMm / viewBox.height;
      ox = viewBox.minX;
      oy = viewBox.minY;
    } else {
      sx = drawingWidthMm / widthLen.value;
      sy = heightLen ? drawingHeightMm / heightLen.value : sx;
    }
    if (usedPx) {
      notes.push({
        kind: "illustrator-px",
        message: "Illustrator-style pixels were treated as points (1/72 inch).",
      });
    }
  } else if (widthLen && !widthLen.unit) {
    drawingWidthMm = widthLen.value;
    drawingHeightMm = heightLen?.value ?? (viewBox ? widthLen.value * (viewBox.height / viewBox.width) : widthLen.value);
    if (viewBox) {
      sx = drawingWidthMm / viewBox.width;
      sy = drawingHeightMm / viewBox.height;
      ox = viewBox.minX;
      oy = viewBox.minY;
    } else {
      sx = 1;
      sy = 1;
    }
    notes.push({
      kind: "unitless-svg",
      message: "This drawing has no units. 1 unit was treated as 1 mm. Confirm the drawing width.",
    });
  } else if (viewBox) {
    drawingWidthMm = viewBox.width;
    drawingHeightMm = viewBox.height;
    sx = 1;
    sy = 1;
    ox = viewBox.minX;
    oy = viewBox.minY;
    notes.push({
      kind: "unitless-svg",
      message: "This drawing has no width units. 1 viewBox unit was treated as 1 mm. Confirm the drawing width.",
    });
  } else {
    drawingWidthMm = 100;
    drawingHeightMm = 100;
    sx = 1;
    sy = 1;
    notes.push({
      kind: "unitless-svg",
      message: "This drawing has no size. 1 unit was treated as 1 mm. Confirm the drawing width.",
    });
  }

  const rawPaths: RawPath[] = [];
  walk(root.inner, IDENTITY, rawPaths);

  const toMm = (p: Point): Point => ({
    x: (p.x - ox) * sx,
    y: (p.y - oy) * sy,
  });

  const mapped = rawPaths.map((path) => ({
    ...path,
    rings: path.rings.map((ring) => ring.map(toMm)),
  }));

  const pieces = classifyPieces(mapped);
  if (pieces.length === 0) {
    throw new Error("No closed outlines were found in this SVG.");
  }

  const bounds = ringsBBox(pieces.map((p) => p.outline));
  if (!widthLen && bounds.width > 0) {
    drawingWidthMm = bounds.width;
    drawingHeightMm = bounds.height;
  }

  return {
    sourceName,
    pieces,
    drawingWidthMm,
    drawingHeightMm,
    notes,
    needsWidthConfirm: unitless || !widthLen?.unit,
    scaleTrusted: Boolean(widthLen?.unit && widthLen.unit !== "px"),
  };
}

type Tag = {
  name: string;
  attrs: Record<string, string>;
  inner: string;
};

function firstTag(xml: string, name: string): Tag | null {
  const re = new RegExp(`<${name}([^>]*)>([\\s\\S]*)</${name}>|<${name}([^>]*)/>`, "i");
  const match = xml.match(re);
  if (!match) return null;
  const attrText = match[1] ?? match[3] ?? "";
  return { name, attrs: parseAttrs(attrText), inner: match[2] ?? "" };
}

function parseAttrs(text: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([:\w-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    attrs[match[1]] = match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function parseViewBox(value?: string) {
  if (!value) return null;
  const parts = value.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
}

function walk(xml: string, matrix: Matrix, out: RawPath[]) {
  const re =
    /<!--[\s\S]*?-->|<([a-zA-Z][\w:-]*)([^>]*?)\/>|<([a-zA-Z][\w:-]*)([^>]*)>([\s\S]*?)<\/\3>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) {
    const name = (match[1] ?? match[3] ?? "").toLowerCase();
    if (!name || name === "defs" || name === "clippath" || name === "mask" || name === "style") {
      continue;
    }
    const attrs = parseAttrs(match[2] ?? match[4] ?? "");
    const inner = match[5] ?? "";
    const next = attrs.transform ? multiply(matrix, parseTransform(attrs.transform)) : matrix;
    if (name === "g" || name === "svg") {
      walk(inner, next, out);
      continue;
    }
    const path = elementToPath(name, attrs, next);
    if (path) out.push(path);
  }
}

function elementToPath(name: string, attrs: Record<string, string>, matrix: Matrix): RawPath | null {
  const style = parseStyle(attrs.style ?? "");
  const fill = (attrs.fill ?? style.fill ?? "#000").trim();
  const filled = fill !== "none" && fill !== "transparent";
  const fillRule = ((attrs["fill-rule"] ?? style["fill-rule"] ?? "nonzero") as string).toLowerCase() ===
    "evenodd"
    ? "evenodd"
    : "nonzero";
  const nameAttr = attrs["data-name"] ?? attrs.id;
  let rings: Ring[] = [];
  let closed = false;

  if (name === "path" && attrs.d) {
    rings = parsePathD(attrs.d);
    closed = /z/i.test(attrs.d);
  } else if (name === "rect") {
    const x = num(attrs.x);
    const y = num(attrs.y);
    const w = num(attrs.width);
    const h = num(attrs.height);
    if (w === 0 || h === 0) return null;
    rings = [rectRing(x, y, w, h, num(attrs.rx), num(attrs.ry))];
    closed = true;
  } else if (name === "circle") {
    rings = [ellipseRing(num(attrs.cx), num(attrs.cy), num(attrs.r), num(attrs.r))];
    closed = true;
  } else if (name === "ellipse") {
    rings = [ellipseRing(num(attrs.cx), num(attrs.cy), num(attrs.rx), num(attrs.ry))];
    closed = true;
  } else if (name === "polygon") {
    rings = [parsePoints(attrs.points ?? "")];
    closed = true;
  } else if (name === "polyline") {
    rings = [parsePoints(attrs.points ?? "")];
    closed = filled;
  } else if (name === "line") {
    rings = [[{ x: num(attrs.x1), y: num(attrs.y1) }, { x: num(attrs.x2), y: num(attrs.y2) }]];
    closed = false;
  } else {
    return null;
  }

  rings = rings.map((ring) => ring.map((p) => apply(matrix, p))).filter((ring) => ring.length >= 2);
  if (rings.length === 0) return null;
  return { id: attrs.id, name: nameAttr, rings, closed, filled, fillRule };
}

function parseStyle(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of style.split(";")) {
    const [key, value] = part.split(":").map((s) => s?.trim());
    if (key && value) out[key] = value;
  }
  return out;
}

function num(value?: string): number {
  return value ? Number.parseFloat(value) || 0 : 0;
}

function parseTransform(value: string): Matrix {
  let m: Matrix = IDENTITY;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) {
    const args = match[2].trim().split(/[\s,]+/).map(Number);
    let next: Matrix = IDENTITY;
    switch (match[1]) {
      case "matrix":
        next = [args[0], args[1], args[2], args[3], args[4], args[5]];
        break;
      case "translate":
        next = [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0];
        break;
      case "scale":
        next = [args[0] ?? 1, 0, 0, args[1] ?? args[0] ?? 1, 0, 0];
        break;
      case "rotate": {
        const a = ((args[0] ?? 0) * Math.PI) / 180;
        const cx = args[1] ?? 0;
        const cy = args[2] ?? 0;
        const rot: Matrix = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
        next = multiply(multiply([1, 0, 0, 1, cx, cy], rot), [1, 0, 0, 1, -cx, -cy]);
        break;
      }
      case "skewX": {
        const a = ((args[0] ?? 0) * Math.PI) / 180;
        next = [1, 0, Math.tan(a), 1, 0, 0];
        break;
      }
      case "skewY": {
        const a = ((args[0] ?? 0) * Math.PI) / 180;
        next = [1, Math.tan(a), 0, 1, 0, 0];
        break;
      }
    }
    m = multiply(m, next);
  }
  return m;
}

function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function apply(m: Matrix, p: Point): Point {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}
