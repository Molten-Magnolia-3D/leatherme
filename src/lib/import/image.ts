import { IMAGE_ASSUMED_WIDTH_MM } from "@/lib/defaults";
import { classifyPieces } from "@/lib/geometry/classify";
import type { ImportResult, Point, RawPath } from "@/lib/geometry/types";
import { simplifyRing } from "@/lib/geometry/vec";

export async function parseImage(
  data: Blob | ArrayBuffer,
  sourceName = "pattern.png",
  assumedWidthMm = IMAGE_ASSUMED_WIDTH_MM,
): Promise<ImportResult> {
  if (typeof createImageBitmap !== "function" && typeof Image === "undefined") {
    throw new Error("Image tracing needs a browser canvas.");
  }

  const blob = data instanceof Blob ? data : new Blob([data]);
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  const max = 1400;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(2, Math.round(bitmap.width * scale));
  canvas.height = Math.max(2, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not read the image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const binary = threshold(image);
  const rings = traceContours(binary, canvas.width, canvas.height);
  const mmPerPx = assumedWidthMm / canvas.width;
  const paths: RawPath[] = rings
    .map((ring) => simplifyRing(ring.map((p) => ({ x: p.x * mmPerPx, y: p.y * mmPerPx })), 0.35))
    .filter((ring) => ring.length >= 4)
    .map((ring) => ({
      rings: [ring],
      closed: true,
      filled: false,
      fillRule: "nonzero" as const,
    }));

  const pieces = classifyPieces(paths);
  if (pieces.length === 0) {
    throw new Error("No high-contrast closed outlines were found in this image.");
  }

  return {
    sourceName,
    pieces,
    drawingWidthMm: assumedWidthMm,
    drawingHeightMm: assumedWidthMm * (canvas.height / canvas.width),
    notes: [
      {
        kind: "image-assumed",
        message: `Images have no scale. Picture width starts at an assumed ${assumedWidthMm} mm.`,
      },
    ],
    needsWidthConfirm: true,
    scaleTrusted: false,
  };
}

export function threshold(image: ImageData, cutoff = 128): Uint8Array {
  const out = new Uint8Array(image.width * image.height);
  const data = image.data;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    const ink = data[i + 3] > 20 && lum < cutoff;
    out[p] = ink ? 1 : 0;
  }
  return out;
}

export function traceContours(binary: Uint8Array, width: number, height: number): Point[][] {
  const visited = new Uint8Array(binary.length);
  const rings: Point[][] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (binary[i] && !binary[i - 1] && !visited[i]) {
        const ring = moore(binary, visited, width, height, x, y);
        if (ring.length >= 8) rings.push(ring);
      }
    }
  }
  return rings;
}

function moore(
  binary: Uint8Array,
  visited: Uint8Array,
  width: number,
  height: number,
  sx: number,
  sy: number,
): Point[] {
  const dirs = [
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
  ];
  const ring: Point[] = [];
  let x = sx;
  let y = sy;
  let dir = 0;
  for (let step = 0; step < width * height; step++) {
    ring.push({ x, y });
    visited[y * width + x] = 1;
    let found = false;
    for (let k = 0; k < 8; k++) {
      const idx = (dir + 6 + k) % 8;
      const nx = x + dirs[idx][0];
      const ny = y + dirs[idx][1];
      if (nx <= 0 || ny <= 0 || nx >= width - 1 || ny >= height - 1) continue;
      if (binary[ny * width + nx]) {
        x = nx;
        y = ny;
        dir = idx;
        found = true;
        break;
      }
    }
    if (!found) break;
    if (x === sx && y === sy && ring.length > 3) break;
  }
  return ring;
}
